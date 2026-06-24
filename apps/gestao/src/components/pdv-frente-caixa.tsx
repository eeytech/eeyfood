"use client";

import type { CashRegisterShift } from "@fsw/db";
import {
  BanknoteIcon,
  CircleAlertIcon,
  CreditCardIcon,
  InfoIcon,
  MinusIcon,
  PrinterIcon,
  PlusIcon,
  QrCodeIcon,
  ScaleIcon,
  SearchIcon,
  ShoppingCartIcon,
  TagIcon,
  WalletIcon,
  WifiOffIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  abrirTurnoCaixa,
  buscarPedidoPdvParaImpressao,
  buscarSaldoCashbackPdv,
  fecharTurnoCaixa,
  finalizarVendaPdv,
  registrarMovimentacaoCaixa,
  validarCupomPdv,
  type FinalizarVendaPdvInput,
} from "@/app/[slug]/pdv/actions";
import { useCashDrawer } from "@/hooks/use-cash-drawer";
import { useWebSerial, type ScaleProtocol } from "@/hooks/use-web-serial";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PdvProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryName: string;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
  sku?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number; // may be decimal for weight-based items (e.g. 0.450 kg)
  isWeighed?: boolean; // true for items added via scale capture
}

type PdvPaymentMethod =
  | "DINHEIRO"
  | "CARTAO_PRESENCIAL"
  | "PIX"
  | "VALE_ALIMENTACAO"
  | "VALE_REFEICAO";

interface PaymentSplitItem {
  method: PdvPaymentMethod;
  amount: number;
}

interface FeedbackState {
  type: "success" | "error" | "offline";
  message: string;
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface PdvFrenteCaixaProps {
  slug: string;
  restaurantName: string;
  products: PdvProduct[];
  isCashbackEnabled: boolean;
  isCouponsEnabled: boolean;
  initialShift: CashRegisterShift | null;
  scaleProtocol: ScaleProtocol | null;
  scaleBaudRate: number;
  drawerPulseHex: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round2 = (v: number) => Number(v.toFixed(2));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDateTime = (value: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const PAYMENT_LABELS: Record<PdvPaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  CARTAO_PRESENCIAL: "Cartão",
  PIX: "PIX",
  VALE_ALIMENTACAO: "Vale Alim.",
  VALE_REFEICAO: "Vale Ref.",
};

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const PDV_DB_NAME = "eeyfood_pdv_v1";
const STORE_QUEUE = "pendingOrders";

const openPdvDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(PDV_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { autoIncrement: true, keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const saveOfflineOrder = async (
  payload: FinalizarVendaPdvInput,
): Promise<void> => {
  const db = await openPdvDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).add({
      ...payload,
      savedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const loadPendingOrders = async (): Promise<
  Array<FinalizarVendaPdvInput & { localId: number }>
> => {
  const db = await openPdvDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => resolve(req.result as Array<FinalizarVendaPdvInput & { localId: number }>);
    req.onerror = () => reject(req.error);
  });
};

const deletePendingOrder = async (localId: number): Promise<void> => {
  const db = await openPdvDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

const PdvFrenteCaixa = ({
  slug,
  restaurantName,
  products,
  isCashbackEnabled,
  isCouponsEnabled,
  initialShift,
  scaleProtocol,
  scaleBaudRate,
  drawerPulseHex,
}: PdvFrenteCaixaProps) => {
  // ── Shift state ────────────────────────────────────────────────────────────
  const [activeShift, setActiveShift] = useState<CashRegisterShift | null>(initialShift);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(!initialShift);
  const [shiftOperatorName, setShiftOperatorName] = useState("");
  const [shiftOpeningAmount, setShiftOpeningAmount] = useState("0");
  const [isShiftOpening, setIsShiftOpening] = useState(false);

  // ── Fechamento de turno ────────────────────────────────────────────────────
  const [isFechamentoOpen, setIsFechamentoOpen] = useState(false);
  const [fechamentoActualAmount, setFechamentoActualAmount] = useState("");
  const [fechamentoNotes, setFechamentoNotes] = useState("");
  const [isFechamentoLoading, setIsFechamentoLoading] = useState(false);
  const [fechamentoSummary, setFechamentoSummary] = useState<{
    totalVendas: number;
    totalDinheiro: number;
    totalCartao: number;
    totalPix: number;
    totalVale: number;
    totalSuprimento: number;
    totalSangria: number;
    dinheiroEsperado: number;
    diferenca: number;
    totalOrders: number;
  } | null>(null);

  // ── Movimentação de caixa ──────────────────────────────────────────────────
  const [isMovimentacaoOpen, setIsMovimentacaoOpen] = useState(false);
  const [movimentacaoType, setMovimentacaoType] = useState<"SANGRIA" | "SUPRIMENTO">("SANGRIA");
  const [movimentacaoAmount, setMovimentacaoAmount] = useState("");
  const [movimentacaoReason, setMovimentacaoReason] = useState("");
  const [isMovimentacaoLoading, setIsMovimentacaoLoading] = useState(false);

  // ── Cart & navigation ──────────────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [isPending, startTransition] = useTransition();

  // ── Customer & payment ─────────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PdvPaymentMethod>("DINHEIRO");
  const [receivedAmount, setReceivedAmount] = useState("");

  // ── Split payment ──────────────────────────────────────────────────────────
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitItem[]>([]);
  const [splitPendingMethod, setSplitPendingMethod] = useState<PdvPaymentMethod>("DINHEIRO");
  const [splitPendingAmount, setSplitPendingAmount] = useState("");
  const isSplitMode = paymentSplits.length > 0;

  // ── Service fee ────────────────────────────────────────────────────────────
  const [useServiceFee, setUseServiceFee] = useState(false);
  const [serviceFeePercent, setServiceFeePercent] = useState(10);

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // ── Wallet / cashback ──────────────────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);

  // ── Post-sale print ────────────────────────────────────────────────────────
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null);
  const [isPrintLoading, setIsPrintLoading] = useState(false);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // ── Offline ────────────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Hardware peripherals ───────────────────────────────────────────────────
  const { status: scaleStatus, errorMessage: scaleError, captureWeight } = useWebSerial();
  const { drawerStatus, drawerError, openDrawerUsb } = useCashDrawer();
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef("");
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Stable callback refs: o listener de teclado usa .current para sempre chamar a versão mais recente
  // das funções sem precisar re-registrar o listener a cada mudança de estado.
  const handleFinishSaleRef = useRef<() => void>(() => {});
  const addProductRef = useRef<(product: PdvProduct, overrideWeight?: number) => void>(() => {});

  // ── Search / filter ────────────────────────────────────────────────────────
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = deferredSearchValue.trim().toLowerCase();

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.filter((p) => p.isActive).map((p) => p.categoryName)),
    ).sort();
    return ["TODOS", ...cats];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    if (selectedCategory !== "TODOS" && product.categoryName !== selectedCategory)
      return false;
    if (!normalizedSearchValue) return true;
    return (
      product.name.toLowerCase().includes(normalizedSearchValue) ||
      product.categoryName.toLowerCase().includes(normalizedSearchValue) ||
      product.description.toLowerCase().includes(normalizedSearchValue) ||
      (product.sku?.toLowerCase().includes(normalizedSearchValue) ?? false)
    );
  });

  // ── Totals ─────────────────────────────────────────────────────────────────
  // Weighed items count as 1 each for display; only regular items sum quantities
  const totalItems = cartItems.reduce(
    (acc, item) => acc + (item.isWeighed ? 1 : item.quantity),
    0,
  );
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const cashbackDiscount =
    useWalletBalance && walletBalance && walletBalance > 0
      ? round2(Math.min(walletBalance, Math.max(cartSubtotal - couponDiscount, 0)))
      : 0;
  const discountAmount = round2(couponDiscount + cashbackDiscount);
  const baseTotal = round2(Math.max(cartSubtotal - discountAmount, 0));
  const serviceFeeAmount = useServiceFee ? round2(baseTotal * (serviceFeePercent / 100)) : 0;
  const finalTotal = round2(baseTotal + serviceFeeAmount);

  const receivedAmountNum = parseFloat(receivedAmount.replace(",", ".")) || 0;
  const change = round2(receivedAmountNum - finalTotal);

  const splitTotal = round2(paymentSplits.reduce((acc, s) => acc + s.amount, 0));
  const splitRemaining = round2(finalTotal - splitTotal);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Clear coupon & cashback when cart changes
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError(null);
    setUseWalletBalance(false);
  }, [cartItems]);

  // Clear splits when total changes (to avoid stale partial payments)
  useEffect(() => {
    setPaymentSplits([]);
    setSplitPendingAmount("");
  }, [finalTotal]);

  // Look up wallet balance when phone reaches 11 digits
  useEffect(() => {
    const normalizedPhone = customerPhone.replace(/\D/g, "");
    if (!isCashbackEnabled || normalizedPhone.length !== 11) {
      setWalletBalance(null);
      setUseWalletBalance(false);
      setIsCheckingWallet(false);
      return;
    }

    setIsCheckingWallet(true);
    const timer = setTimeout(() => {
      void buscarSaldoCashbackPdv(slug, normalizedPhone).then((result) => {
        setWalletBalance(result && result.balance > 0 ? result.balance : null);
        setIsCheckingWallet(false);
        if (!result || result.balance <= 0) setUseWalletBalance(false);
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [customerPhone, slug, isCashbackEnabled]);

  // Sincroniza os refs a cada render para que o handler de teclado use sempre as versões atuais
  useEffect(() => {
    handleFinishSaleRef.current = handleFinishSale;
    addProductRef.current = addProduct;
  });

  // Keyboard shortcuts (F2 / F8 / F12) + barcode scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 → focus search
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // F8 → focus split pending amount
      if (e.key === "F8") {
        e.preventDefault();
        document.getElementById("pdv-split-amount")?.focus();
        return;
      }
      // F12 → finish sale
      if (e.key === "F12") {
        e.preventDefault();
        if (cartItems.length > 0 && !isPending && activeShift) {
          handleFinishSaleRef.current();
        }
        return;
      }

      // Barcode scanner: intercept only when no input/textarea is focused
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "Enter") {
        const code = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = "";
        clearTimeout(barcodeTimerRef.current);
        if (code.length >= 3) {
          const found = products.find(
            (p) => p.isActive && p.sku && p.sku.toLowerCase() === code.toLowerCase(),
          );
          if (found) addProductRef.current(found);
        }
        return;
      }

      if (e.key.length === 1) {
        clearTimeout(barcodeTimerRef.current);
        barcodeBufferRef.current += e.key;
        // Reset buffer if no Enter comes within 80 ms (human typing speed)
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 80);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems, isPending, activeShift, products]);

  // Online / offline status + sync on reconnect
  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    const syncPending = async () => {
      try {
        const pending = await loadPendingOrders();
        setPendingOrdersCount(pending.length);
        if (pending.length === 0 || !navigator.onLine) return;

        setIsSyncing(true);
        let synced = 0;
        for (const order of pending) {
          try {
            const result = await finalizarVendaPdv(order);
            if (result.success) {
              await deletePendingOrder(order.localId);
              synced++;
            }
          } catch {
            // keep in queue
          }
        }
        setIsSyncing(false);
        if (synced > 0) {
          setFeedback({
            type: "success",
            message: `${String(synced)} venda(s) offline sincronizada(s) com sucesso!`,
          });
          setPendingOrdersCount((prev) => prev - synced);
        }
      } catch {
        setIsSyncing(false);
      }
    };

    window.addEventListener("online", () => void syncPending());
    void syncPending(); // try on mount

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // ── Cart handlers ──────────────────────────────────────────────────────────

  const addProduct = (product: PdvProduct, overrideWeight?: number) => {
    setFeedback(null);
    const weightToUse = overrideWeight ?? capturedWeight;

    if (weightToUse !== null) {
      // Weight-based item: always create a distinct line entry
      setCapturedWeight(null);
      setCartItems((current) => [
        ...current,
        {
          id: `${product.id}_w${String(Date.now())}`,
          name: product.name,
          price: product.price,
          quantity: round2(weightToUse),
          isWeighed: true,
        },
      ]);
      return;
    }

    setCartItems((current) => {
      const existing = current.find((i) => i.id === product.id && !i.isWeighed);
      if (!existing) {
        return [...current, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
      }
      if (product.trackInventory && existing.quantity >= product.stockQuantity) {
        return current;
      }
      return current.map((i) =>
        i.id === product.id && !i.isWeighed ? { ...i, quantity: i.quantity + 1 } : i,
      );
    });
  };

  const decreaseProduct = (productId: string) => {
    setCartItems((current) =>
      current
        .map((i) => (i.id === productId && !i.isWeighed ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const increaseProduct = (productId: string) => {
    const baseId = productId.split("_w")[0];
    const product = products.find((p) => p.id === baseId);
    setCartItems((current) =>
      current.map((i) => {
        if (i.id !== productId || i.isWeighed) return i;
        if (product?.trackInventory && i.quantity >= product.stockQuantity) return i;
        return { ...i, quantity: i.quantity + 1 };
      }),
    );
  };

  const removeProduct = (productId: string) => {
    setCartItems((current) => current.filter((i) => i.id !== productId));
  };

  const clearSale = () => {
    setCartItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("DINHEIRO");
    setReceivedAmount("");
    setPaymentSplits([]);
    setSplitPendingAmount("");
    setUseServiceFee(false);
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    setWalletBalance(null);
    setUseWalletBalance(false);
    setCompletedOrderId(null);
  };

  // ── Split payment handlers ─────────────────────────────────────────────────

  const handleAddSplit = () => {
    const amount = parseFloat(splitPendingAmount.replace(",", ".")) || 0;
    if (amount <= 0) return;
    const clampedAmount = round2(Math.min(amount, splitRemaining > 0 ? splitRemaining : amount));
    setPaymentSplits((prev) => [...prev, { method: splitPendingMethod, amount: clampedAmount }]);
    setSplitPendingAmount("");
  };

  const handleRemoveSplit = (index: number) => {
    setPaymentSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddFullRemainingSplit = () => {
    if (splitRemaining <= 0) return;
    setPaymentSplits((prev) => [...prev, { method: splitPendingMethod, amount: splitRemaining }]);
  };

  // ── Coupon ─────────────────────────────────────────────────────────────────

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    setAppliedCoupon(null);

    const result = await validarCupomPdv({
      slug,
      couponCode,
      customerPhone,
      subtotal: cartSubtotal,
    });

    setIsValidatingCoupon(false);

    if (result.success && result.discountAmount !== undefined && result.code) {
      setAppliedCoupon({ code: result.code, discountAmount: result.discountAmount });
    } else {
      setCouponError(result.error ?? "Erro ao validar cupom.");
    }
  }, [couponCode, slug, customerPhone, cartSubtotal]);

  // ── Scale weight capture ───────────────────────────────────────────────────

  const handleCaptureWeight = useCallback(async () => {
    if (!scaleProtocol) return;
    const weight = await captureWeight(scaleProtocol, scaleBaudRate);
    if (weight !== null) {
      setCapturedWeight(weight);
    }
  }, [captureWeight, scaleProtocol, scaleBaudRate]);

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrint = useCallback(async () => {
    if (!completedOrderId) return;
    setIsPrintLoading(true);

    const order = await buscarPedidoPdvParaImpressao(completedOrderId);
    setIsPrintLoading(false);

    if (!order) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <title>Cupom PDV #${order.id}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 4mm; width: 72mm; font-family: monospace; font-size: 12px; line-height: 1.2; color: black; }
            .center { text-align: center; } .bold { font-weight: bold; } .upper { text-transform: uppercase; }
            .dashed { border-top: 1px dashed black; margin: 8px 0; } .mb { margin-bottom: 16px; }
            .row { display: flex; justify-content: space-between; } .spacer { height: 80px; }
          </style>
        </head>
        <body>
          <div class="center mb">
            <h1 style="font-size:16px;" class="bold upper">${order.restaurant.name}</h1>
            <div class="dashed"></div>
            <h2 class="bold">CUPOM DE ENTREGA — PDV</h2>
            <p style="font-size:18px;" class="bold">PEDIDO #${order.id}</p>
          </div>
          <div class="mb">
            <p><span class="bold">CLIENTE:</span> ${order.customerName}</p>
            <p><span class="bold">DATA:</span> ${formatDateTime(order.createdAt)}</p>
            <p><span class="bold">FORMA:</span> ${order.paymentMethod === "DINHEIRO" ? "DINHEIRO" : order.paymentMethod === "PIX" ? "PIX" : "CARTÃO"}</p>
          </div>
          <div class="dashed"></div>
          <div class="mb">
            <div class="row bold"><span>ITEM</span><span>QTD</span></div>
            ${order.orderProducts.map((item) => `<div class="row"><span>${item.product.name}</span><span>${item.quantity}x</span></div>`).join("")}
          </div>
          <div class="dashed"></div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div class="row"><span>SUBTOTAL</span><span>${formatCurrency(order.subtotal)}</span></div>
            ${order.discountAmount > 0 ? `<div class="row"><span>DESCONTO</span><span>-${formatCurrency(order.discountAmount)}</span></div>` : ""}
            <div class="row bold" style="padding-top:4px;font-size:14px;"><span>TOTAL</span><span>${formatCurrency(order.total)}</span></div>
          </div>
          ${order.paymentMethod === "DINHEIRO" && order.changeFor ? `<div class="dashed"></div><p class="bold">TROCO PARA: ${formatCurrency(order.changeFor)}</p>` : ""}
          <div class="center spacer" style="margin-top:20px;font-size:10px;">
            <p>Obrigado pela preferência!</p><p>www.eeyfood.com.br</p>
          </div>
        </body>
      </html>`;

    const doc = iframe.contentWindow?.document ?? iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  }, [completedOrderId]);

  // ── Finish sale ────────────────────────────────────────────────────────────

  const buildPayload = (): FinalizarVendaPdvInput => {
    const primaryMethod =
      isSplitMode && paymentSplits.length > 0 ? paymentSplits[0].method : paymentMethod;

    return {
      slug,
      customerName,
      customerPhone,
      paymentMethod: primaryMethod as FinalizarVendaPdvInput["paymentMethod"],
      paymentSplits: isSplitMode ? paymentSplits : undefined,
      products: cartItems.map((item) => ({ id: item.id, quantity: item.quantity })),
      couponCode: appliedCoupon?.code,
      useWalletBalance: useWalletBalance && (walletBalance ?? 0) > 0,
      changeFor:
        !isSplitMode && paymentMethod === "DINHEIRO" && receivedAmountNum > 0
          ? receivedAmountNum
          : undefined,
      shiftId: activeShift?.id,
      serviceFeePercent: useServiceFee ? serviceFeePercent : undefined,
    };
  };

  const handleFinishSale = () => {
    setFeedback(null);

    const payload = buildPayload();

    // Offline: save to IndexedDB queue
    if (isOffline) {
      void saveOfflineOrder(payload).then(() => {
        setPendingOrdersCount((prev) => prev + 1);
        clearSale();
        setFeedback({
          type: "offline",
          message: "Venda salva localmente! Será sincronizada quando a internet retornar.",
        });
      });
      return;
    }

    startTransition(async () => {
      const result = await finalizarVendaPdv(payload);

      if (!result.success) {
        setFeedback({ type: "error", message: result.message });
        return;
      }

      const newOrderId = result.orderId ?? null;

      // Auto-open cash drawer when payment involves cash
      const hasCashPayment =
        (!isSplitMode && paymentMethod === "DINHEIRO") ||
        (isSplitMode && paymentSplits.some((s) => s.method === "DINHEIRO"));
      if (hasCashPayment) {
        void openDrawerUsb(drawerPulseHex);
      }

      clearSale();
      setCompletedOrderId(newOrderId);
      setFeedback({
        type: "success",
        message: `Venda registrada! Pedido #${String(result.orderId)} — ${formatCurrency(result.total ?? 0)}.`,
      });
    });
  };

  const canFinish =
    cartItems.length > 0 &&
    !isPending &&
    (isSplitMode ? round2(splitTotal) >= round2(finalTotal) : true);

  // ── Shift handlers ─────────────────────────────────────────────────────────

  const handleAbrirTurno = async () => {
    setIsShiftOpening(true);
    const amount = parseFloat(shiftOpeningAmount.replace(",", ".")) || 0;
    const result = await abrirTurnoCaixa({
      slug,
      openedByUser: shiftOperatorName,
      openingAmount: amount,
    });
    setIsShiftOpening(false);

    if (result.success && result.shift) {
      setActiveShift(result.shift);
      setIsShiftModalOpen(false);
    } else {
      setFeedback({ type: "error", message: result.message });
    }
  };

  const handleFecharTurno = async () => {
    if (!activeShift) return;
    setIsFechamentoLoading(true);

    const amount = parseFloat(fechamentoActualAmount.replace(",", ".")) || 0;
    const result = await fecharTurnoCaixa({
      shiftId: activeShift.id,
      slug,
      actualClosingAmount: amount,
      notes: fechamentoNotes,
    });

    setIsFechamentoLoading(false);

    if (result.success) {
      setFechamentoSummary(result.summary ?? null);
      setActiveShift(null);
    } else {
      setFeedback({ type: "error", message: result.message });
      setIsFechamentoOpen(false);
    }
  };

  const handleMovimentacao = async () => {
    if (!activeShift) return;
    setIsMovimentacaoLoading(true);

    const amount = parseFloat(movimentacaoAmount.replace(",", ".")) || 0;
    const result = await registrarMovimentacaoCaixa({
      shiftId: activeShift.id,
      slug,
      type: movimentacaoType,
      amount,
      reason: movimentacaoReason,
    });

    setIsMovimentacaoLoading(false);

    if (result.success) {
      setIsMovimentacaoOpen(false);
      setMovimentacaoAmount("");
      setMovimentacaoReason("");
      setFeedback({ type: "success", message: result.message });
    } else {
      setFeedback({ type: "error", message: result.message });
    }
  };

  // ── Stock label helpers ────────────────────────────────────────────────────

  const getAvailableStockLabel = (product: PdvProduct) => {
    if (!product.trackInventory) return "Livre";
    return `Estoque ${String(product.stockQuantity)}`;
  };

  const getAvailableStockVariant = (product: PdvProduct) => {
    if (!product.trackInventory) return "secondary" as const;
    return product.stockQuantity > 0 ? ("success" as const) : ("danger" as const);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-4">
      {/* ── Shift opening modal ──────────────────────────────────────────── */}
      <Dialog open={isShiftModalOpen} onOpenChange={() => void 0}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Abertura de Caixa</DialogTitle>
            <DialogDescription>
              Informe o operador e o valor do fundo de troco para iniciar o turno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do operador</Label>
              <Input
                value={shiftOperatorName}
                onChange={(e) => setShiftOperatorName(e.target.value)}
                placeholder="Ex.: Maria"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fundo de troco (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={shiftOpeningAmount}
                onChange={(e) => setShiftOpeningAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => void handleAbrirTurno()}
              disabled={isShiftOpening}
              className="w-full"
            >
              {isShiftOpening ? "Abrindo caixa..." : "Abrir caixa e iniciar turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fechar turno modal ───────────────────────────────────────────── */}
      <Dialog open={isFechamentoOpen} onOpenChange={setIsFechamentoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Fechamento de Caixa</DialogTitle>
            <DialogDescription>
              Informe o valor que você está contando na gaveta para fechar o turno.
            </DialogDescription>
          </DialogHeader>

          {fechamentoSummary ? (
            // Summary after closing
            <div className="space-y-3">
              <div className="rounded-xl border bg-slate-950 p-4 text-white text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">Total de vendas</span><span className="font-semibold">{formatCurrency(fechamentoSummary.totalVendas)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Dinheiro</span><span>{formatCurrency(fechamentoSummary.totalDinheiro)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Cartão</span><span>{formatCurrency(fechamentoSummary.totalCartao)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">PIX</span><span>{formatCurrency(fechamentoSummary.totalPix)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Vale</span><span>{formatCurrency(fechamentoSummary.totalVale)}</span></div>
                <Separator className="border-white/10" />
                <div className="flex justify-between"><span className="text-slate-400">Suprimentos</span><span className="text-emerald-400">+{formatCurrency(fechamentoSummary.totalSuprimento)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Sangrias</span><span className="text-rose-400">-{formatCurrency(fechamentoSummary.totalSangria)}</span></div>
                <Separator className="border-white/10" />
                <div className="flex justify-between font-semibold"><span>Esperado no caixa</span><span>{formatCurrency(fechamentoSummary.dinheiroEsperado)}</span></div>
                <div className={`flex justify-between font-bold text-base ${fechamentoSummary.diferenca >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  <span>Diferença</span>
                  <span>{fechamentoSummary.diferenca >= 0 ? "+" : ""}{formatCurrency(fechamentoSummary.diferenca)}</span>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                {fechamentoSummary.totalOrders} pedido(s) neste turno.
              </p>
              <Button
                className="w-full"
                onClick={() => { setIsFechamentoOpen(false); setFechamentoSummary(null); setIsShiftModalOpen(true); }}
              >
                Abrir novo turno
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Valor contado na gaveta (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={fechamentoActualAmount}
                  onChange={(e) => setFechamentoActualAmount(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Observações (opcional)</Label>
                <Input
                  value={fechamentoNotes}
                  onChange={(e) => setFechamentoNotes(e.target.value)}
                  placeholder="Ex.: troco faltou, etc."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFechamentoOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void handleFecharTurno()}
                  disabled={isFechamentoLoading || !fechamentoActualAmount}
                >
                  {isFechamentoLoading ? "Fechando..." : "Confirmar fechamento"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Sangria / Suprimento modal ───────────────────────────────────── */}
      <Dialog open={isMovimentacaoOpen} onOpenChange={setIsMovimentacaoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {movimentacaoType === "SANGRIA" ? "Sangria de Caixa" : "Suprimento de Caixa"}
            </DialogTitle>
            <DialogDescription>
              {movimentacaoType === "SANGRIA"
                ? "Registre uma retirada de dinheiro do caixa."
                : "Registre uma entrada de troco ou suprimento no caixa."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={movimentacaoAmount}
                onChange={(e) => setMovimentacaoAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input
                value={movimentacaoReason}
                onChange={(e) => setMovimentacaoReason(e.target.value)}
                placeholder={movimentacaoType === "SANGRIA" ? "Ex.: Pagamento fornecedor" : "Ex.: Troco para o caixa"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovimentacaoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleMovimentacao()}
              disabled={isMovimentacaoLoading || !movimentacaoAmount || !movimentacaoReason}
              className={movimentacaoType === "SANGRIA" ? "bg-rose-600 hover:bg-rose-700" : ""}
            >
              {isMovimentacaoLoading ? "Registrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <Card className="border-white/80 bg-white/85">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="w-fit" variant="secondary">Frente de caixa</Badge>
              {isOffline && (
                <Badge variant="danger" className="gap-1">
                  <WifiOffIcon size={11} /> Offline
                </Badge>
              )}
              {pendingOrdersCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {isSyncing ? "Sincronizando..." : `${String(pendingOrdersCount)} venda(s) na fila`}
                </Badge>
              )}
              {drawerStatus === "opening" && (
                <Badge variant="secondary" className="gap-1">Abrindo gaveta...</Badge>
              )}
              {drawerStatus === "done" && (
                <Badge variant="secondary" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800">Gaveta aberta</Badge>
              )}
              {drawerError && (
                <Badge variant="danger" className="gap-1">{drawerError}</Badge>
              )}
            </div>
            <CardTitle className="mt-2 font-display text-xl">PDV de {restaurantName}</CardTitle>
            <CardDescription>
              {activeShift
                ? `Turno aberto por ${activeShift.openedByUser} — ${formatDateTime(activeShift.openedAt)} · F2 Busca · F8 Pag. · F12 Fechar`
                : "Nenhum turno ativo."}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="grid gap-2 sm:grid-cols-3 flex-1">
              <Card className="bg-slate-950 text-white">
                <CardContent className="p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Itens</p>
                  <p className="mt-1 font-display text-xl">{String(totalItems)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                  <p className="mt-1 font-display text-xl">{formatCurrency(finalTotal)}</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50">
                <CardContent className="p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Turno</p>
                  <p className="mt-1 text-xs font-medium text-emerald-900">
                    {activeShift ? `Aberto · ${formatDateTime(activeShift.openedAt)}` : "Fechado"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Admin toolbar */}
            {activeShift && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => { setMovimentacaoType("SUPRIMENTO"); setIsMovimentacaoOpen(true); }}
                >
                  + Suprimento
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-rose-700 border-rose-300 hover:bg-rose-50"
                  onClick={() => { setMovimentacaoType("SANGRIA"); setIsMovimentacaoOpen(true); }}
                >
                  − Sangria
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-slate-300 hover:bg-slate-50"
                  onClick={() => { setFechamentoSummary(null); setFechamentoActualAmount(""); setFechamentoNotes(""); setIsFechamentoOpen(true); }}
                >
                  Fechar turno
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── Left column: product list ────────────────────────────────── */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Buscar produtos</CardTitle>
                  <CardDescription>
                    F2 para focar · busque por nome, categoria, SKU ou descrição.
                  </CardDescription>
                </div>

                {/* Scale weight capture */}
                {scaleProtocol && (
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={capturedWeight !== null ? "default" : "outline"}
                      className="gap-1.5"
                      disabled={scaleStatus === "requesting" || scaleStatus === "reading"}
                      onClick={() => {
                        if (capturedWeight !== null) {
                          setCapturedWeight(null);
                        } else {
                          void handleCaptureWeight();
                        }
                      }}
                    >
                      <ScaleIcon size={13} />
                      {scaleStatus === "requesting" && "Selecionando porta..."}
                      {scaleStatus === "reading" && "Lendo balança..."}
                      {scaleStatus === "done" && capturedWeight !== null && `${capturedWeight.toFixed(3)} kg ✓`}
                      {(scaleStatus === "idle" || scaleStatus === "error") && capturedWeight === null && "Capturar Peso"}
                      {capturedWeight !== null && scaleStatus !== "done" && `${capturedWeight.toFixed(3)} kg — limpar`}
                    </Button>
                    {capturedWeight !== null && (
                      <p className="text-[10px] text-emerald-700">
                        Próximo produto adicionado usará este peso.
                      </p>
                    )}
                    {scaleError && (
                      <p className="text-[10px] text-rose-600">{scaleError}</p>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  ref={searchInputRef}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Ex.: combo, coca, batata... ou código de barras"
                  className="pl-11"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-xs">{cat}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filteredProducts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-4 text-center">
                <SearchIcon className="text-slate-400" size={20} />
                <p className="font-medium text-slate-900">Nenhum produto encontrado</p>
                <p className="text-sm text-muted-foreground">Ajuste a busca ou a categoria.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                        <button
                          type="button"
                          title={product.description}
                          className="shrink-0 text-muted-foreground transition hover:text-slate-700"
                        >
                          <InfoIcon size={12} />
                        </button>
                      </div>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground truncate">SKU: {product.sku}</p>
                      )}
                    </div>
                    <Badge variant={getAvailableStockVariant(product)} className="shrink-0 text-xs">
                      {getAvailableStockLabel(product)}
                    </Badge>
                    <p className="w-20 shrink-0 text-right font-display text-sm font-semibold">
                      {formatCurrency(product.price)}
                    </p>
                    <Button
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={product.trackInventory && product.stockQuantity <= 0}
                      onClick={() => addProduct(product)}
                    >
                      <PlusIcon size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right column: sale summary ────────────────────────────────── */}
        <div className="space-y-3">
          {/* Customer + payment */}
          <Card className="border-white/80 bg-slate-950 text-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10">
                  <ShoppingCartIcon size={13} />
                </div>
                <div>
                  <CardTitle className="font-display text-base">Resumo da venda</CardTitle>
                  <CardDescription className="text-xs text-slate-300">
                    Operação pensada para caixa rápido.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Customer fields */}
              <div className="grid gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">
                    Nome do cliente
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Opcional. Padrão: Cliente do balcão"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">
                    Celular do cliente
                    {isCheckingWallet && (
                      <span className="ml-2 text-slate-400">Verificando saldo...</span>
                    )}
                    {!isCheckingWallet && walletBalance !== null && (
                      <span className="ml-2 text-emerald-400">
                        Cashback: {formatCurrency(walletBalance)}
                      </span>
                    )}
                  </label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Opcional. Informe para cashback"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Payment methods */}
              {!isSplitMode && (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {(
                    ["DINHEIRO", "CARTAO_PRESENCIAL", "PIX", "VALE_ALIMENTACAO", "VALE_REFEICAO"] as PdvPaymentMethod[]
                  ).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border px-2 py-2 text-center transition ${
                        paymentMethod === method
                          ? "border-white bg-white text-slate-950"
                          : "border-white/10 bg-white/5 text-white"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {method === "DINHEIRO" && <BanknoteIcon size={14} />}
                        {method === "CARTAO_PRESENCIAL" && <CreditCardIcon size={14} />}
                        {method === "PIX" && <QrCodeIcon size={14} />}
                        {(method === "VALE_ALIMENTACAO" || method === "VALE_REFEICAO") && (
                          <WalletIcon size={14} />
                        )}
                        <span className="text-[10px] font-medium leading-none">
                          {PAYMENT_LABELS[method]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Cash change (simple mode, DINHEIRO selected) */}
              {!isSplitMode && paymentMethod === "DINHEIRO" && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">
                    Valor recebido (R$)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="0,00"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  />
                  {receivedAmount !== "" && (
                    <div className="mt-2">
                      {change >= 0 ? (
                        <p className="text-sm font-semibold text-emerald-400">
                          Troco a devolver: <span className="font-display">{formatCurrency(change)}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-amber-400">
                          Valor insuficiente — faltam {formatCurrency(Math.abs(change))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Split payment section ──────────────────────────────── */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Dividir pagamento</span>
                  {isSplitMode && (
                    <button
                      type="button"
                      onClick={() => setPaymentSplits([])}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Cancelar divisão
                    </button>
                  )}
                </div>

                {paymentSplits.map((split, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">
                      {PAYMENT_LABELS[split.method as PdvPaymentMethod]}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{formatCurrency(split.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(index)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {isSplitMode && (
                  <div className="flex items-center justify-between text-xs font-semibold border-t border-white/10 pt-1.5">
                    <span className="text-slate-400">Restante</span>
                    <span className={splitRemaining > 0 ? "text-amber-400" : "text-emerald-400"}>
                      {formatCurrency(Math.max(splitRemaining, 0))}
                    </span>
                  </div>
                )}

                <div className="flex gap-1.5">
                  <select
                    value={splitPendingMethod}
                    onChange={(e) => setSplitPendingMethod(e.target.value as PdvPaymentMethod)}
                    className="rounded-lg border border-white/10 bg-white/5 text-white text-xs px-2 py-1.5 flex-1"
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO_PRESENCIAL">Cartão</option>
                    <option value="PIX">PIX</option>
                    <option value="VALE_ALIMENTACAO">Vale Alim.</option>
                    <option value="VALE_REFEICAO">Vale Ref.</option>
                  </select>
                  <Input
                    id="pdv-split-amount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={splitPendingAmount}
                    onChange={(e) => setSplitPendingAmount(e.target.value)}
                    placeholder="0,00"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSplit();
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddSplit}
                    disabled={!splitPendingAmount}
                    className="shrink-0 text-xs"
                  >
                    Add
                  </Button>
                </div>

                {splitRemaining > 0 && splitPendingAmount === "" && (
                  <button
                    type="button"
                    onClick={handleAddFullRemainingSplit}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    + Adicionar {formatCurrency(splitRemaining)} em {PAYMENT_LABELS[splitPendingMethod]}
                  </button>
                )}
              </div>

              {/* Service fee toggle */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-200">Taxa de serviço</p>
                  <p className="text-[10px] text-slate-400">Adicionada ao total antes do pagamento.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={serviceFeePercent}
                    onChange={(e) => setServiceFeePercent(Number(e.target.value))}
                    className="w-14 border-white/10 bg-white/5 text-white text-xs text-center placeholder:text-slate-400"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <button
                    type="button"
                    onClick={() => setUseServiceFee((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                      useServiceFee ? "bg-emerald-500" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition ${
                        useServiceFee ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Coupon */}
              {isCouponsEnabled && cartItems.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-200">
                    <TagIcon size={12} />
                    Cupom de desconto
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value); setAppliedCoupon(null); setCouponError(null); }}
                      placeholder="Ex.: BEMVINDO10"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!couponCode.trim() || isValidatingCoupon}
                      onClick={() => void handleApplyCoupon()}
                      className="shrink-0"
                    >
                      {isValidatingCoupon ? "..." : "Aplicar"}
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <p className="mt-1.5 text-xs font-medium text-emerald-400">
                      Cupom {appliedCoupon.code} aplicado — -{formatCurrency(appliedCoupon.discountAmount)}
                    </p>
                  )}
                  {couponError && <p className="mt-1.5 text-xs text-rose-400">{couponError}</p>}
                </div>
              )}

              {/* Cashback redemption */}
              {isCashbackEnabled && walletBalance !== null && (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={useWalletBalance}
                    onChange={(e) => setUseWalletBalance(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <WalletIcon size={13} className="shrink-0 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-200">
                      Usar cashback —{" "}
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(walletBalance)}
                      </span>{" "}
                      disponível
                    </span>
                  </div>
                </label>
              )}
            </CardContent>
          </Card>

          {/* Cart items + totals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Itens selecionados</CardTitle>
              <CardDescription>Ajuste as quantidades antes de concluir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {cartItems.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-slate-900">Carrinho vazio</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Adicione produtos para liberar o fechamento.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="rounded-xl border bg-slate-50/80 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-950">{item.name}</p>
                          {item.isWeighed && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              <ScaleIcon size={9} /> pesado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} / {item.isWeighed ? "kg" : "un."}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeProduct(item.id)} className="text-xs font-medium text-rose-600">
                        Remover
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {item.isWeighed ? (
                        <div className="flex items-center gap-1.5">
                          <ScaleIcon size={12} className="text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-800">
                            {item.quantity.toFixed(3)} kg
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => decreaseProduct(item.id)}>
                            <MinusIcon size={12} />
                          </Button>
                          <div className="flex h-7 min-w-9 items-center justify-center rounded-lg border bg-white px-2 text-sm font-semibold">
                            {String(item.quantity)}
                          </div>
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => increaseProduct(item.id)}>
                            <PlusIcon size={12} />
                          </Button>
                        </div>
                      )}
                      <p className="font-display text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Totals block */}
              <div className="rounded-xl border bg-slate-950 p-3 text-white">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Quantidade total</span>
                  <span>{String(totalItems)} itens</span>
                </div>
                {(discountAmount > 0 || serviceFeeAmount > 0) && (
                  <>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-slate-300">
                      <span>Subtotal</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex items-center justify-between text-xs text-emerald-400">
                        <span>Cupom ({appliedCoupon?.code})</span>
                        <span>-{formatCurrency(couponDiscount)}</span>
                      </div>
                    )}
                    {cashbackDiscount > 0 && (
                      <div className="flex items-center justify-between text-xs text-emerald-400">
                        <span>Cashback</span>
                        <span>-{formatCurrency(cashbackDiscount)}</span>
                      </div>
                    )}
                    {serviceFeeAmount > 0 && (
                      <div className="flex items-center justify-between text-xs text-amber-400">
                        <span>Taxa de serviço ({serviceFeePercent}%)</span>
                        <span>+{formatCurrency(serviceFeeAmount)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">Total da venda</span>
                  <span className="font-display text-xl font-semibold">{formatCurrency(finalTotal)}</span>
                </div>
                {isSplitMode && (
                  <div className={`mt-1 flex items-center justify-between text-xs ${splitTotal >= finalTotal ? "text-emerald-400" : "text-amber-400"}`}>
                    <span>Pago (divisão)</span>
                    <span>{formatCurrency(splitTotal)}</span>
                  </div>
                )}
              </div>

              {/* Split mode warning */}
              {isSplitMode && splitTotal < finalTotal && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <CircleAlertIcon size={13} className="shrink-0" />
                  Faltam {formatCurrency(splitRemaining)} para completar o pagamento.
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    feedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : feedback.type === "offline"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* Print after successful sale */}
              {feedback?.type === "success" && completedOrderId && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  disabled={isPrintLoading}
                  onClick={() => void handlePrint()}
                >
                  <PrinterIcon size={14} />
                  {isPrintLoading ? "Preparando impressão..." : "Imprimir Cupom da Venda"}
                </Button>
              )}

              {/* Shift required warning */}
              {!activeShift && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <CircleAlertIcon size={13} className="shrink-0" />
                  Abra um turno de caixa para habilitar as vendas.
                  <button type="button" onClick={() => setIsShiftModalOpen(true)} className="font-semibold underline">
                    Abrir turno
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isPending || cartItems.length === 0}
                  onClick={clearSale}
                >
                  Limpar venda
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!canFinish || !activeShift}
                  onClick={handleFinishSale}
                >
                  {isPending
                    ? "Fechando venda..."
                    : `Fechar conta${isOffline ? " (offline)" : ""} · F12`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PdvFrenteCaixa;
