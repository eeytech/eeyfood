"use client";

import type { CashRegisterShift } from "@fsw/db";
import {
  BanknoteIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  CircleAlertIcon,
  ClockIcon,
  CreditCardIcon,
  InfoIcon,
  LoaderCircleIcon,
  MinusIcon,
  MonitorSmartphoneIcon,
  PlusIcon,
  PrinterIcon,
  QrCodeIcon,
  RotateCcwIcon,
  ScaleIcon,
  SearchIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
  UserIcon,
  UtensilsCrossedIcon,
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
import { toast } from "sonner";

import {
  abrirTurnoCaixa,
  buscarPedidoPdvParaImpressao,
  buscarProdutoComOpcoesPdv,
  buscarSaldoCashbackPdv,
  fecharTurnoCaixa,
  finalizarVendaPdv,
  registrarMovimentacaoCaixa,
  validarCupomPdv,
} from "@/app/(dashboard)/pdv/actions";
import type { FinalizarVendaPdvInput } from "@/app/(dashboard)/pdv/actions";
import { useCashDrawer } from "@/hooks/use-cash-drawer";
import { useWebSerial } from "@/hooks/use-web-serial";
import type { ScaleProtocol } from "@/hooks/use-web-serial";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdvCategory {
  id: string;
  name: string;
  isPizzaCategory: boolean;
}

export interface PdvProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  categoryName: string;
  isPizzaCategory: boolean;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
  sku?: string;
}

export interface CartItemOption {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number; // Unit price including fraction & options
  quantity: number;
  isWeighed?: boolean;
  selectedOptionIds?: string[];
  selectedOptionNames?: string[];
  notes?: string;
  isPizza?: boolean;
  fraction?: "inteira" | "meio-a-meio";
  flavor1Name?: string;
  flavor2Name?: string;
  borderName?: string;
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

interface OptionGroupWithOptions {
  id: string;
  name: string;
  minOptions: number;
  maxOptions: number;
  options: Array<{
    id: string;
    name: string;
    price: number;
    description?: string | null;
  }>;
}

interface PdvFrenteCaixaProps {
  slug: string;
  restaurantName: string;
  products: PdvProduct[];
  categories?: PdvCategory[];
  isCashbackEnabled: boolean;
  isCouponsEnabled: boolean;
  pizzaPricingRule?: "MAX" | "AVERAGE";
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

// ─── IndexedDB helpers (Offline Queue) ────────────────────────────────────────

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
    req.onsuccess = () =>
      resolve(req.result as Array<FinalizarVendaPdvInput & { localId: number }>);
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
  categories: initialCategories,
  isCashbackEnabled,
  isCouponsEnabled,
  pizzaPricingRule = "MAX",
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
  const { status: scaleStatus, captureWeight } = useWebSerial();
  const { openDrawerUsb } = useCashDrawer();
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);

  // ── Modals: Pizza Builder ─────────────────────────────────────────────────
  const [selectedPizzaProduct, setSelectedPizzaProduct] = useState<PdvProduct | null>(null);
  const [pizzaFraction, setPizzaFraction] = useState<"inteira" | "meio-a-meio">("inteira");
  const [pizzaFlavor2, setPizzaFlavor2] = useState<PdvProduct | null>(null);
  const [pizzaFlavor2Search, setPizzaFlavor2Search] = useState("");
  const [pizzaBorderOptions, setPizzaBorderOptions] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [selectedPizzaBorder, setSelectedPizzaBorder] = useState<{ id: string; name: string; price: number } | null>(null);
  const [pizzaNotes, setPizzaNotes] = useState("");
  const [pizzaQuantity, setPizzaQuantity] = useState(1);
  const [isPizzaLoading, setIsPizzaLoading] = useState(false);

  // ── Modals: Product Customization / Adicionais ─────────────────────────────
  const [customizingProduct, setCustomizingProduct] = useState<PdvProduct | null>(null);
  const [customOptionGroups, setCustomOptionGroups] = useState<OptionGroupWithOptions[]>([]);
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string[]>>({});
  const [customNotes, setCustomNotes] = useState("");
  const [customQuantity, setCustomQuantity] = useState(1);
  const [isCustomLoading, setIsCustomLoading] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef("");
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleFinishSaleRef = useRef<() => void>(() => {});
  const addProductRef = useRef<(product: PdvProduct, overrideWeight?: number) => void>(() => {});

  // ── Categories & Filtering ─────────────────────────────────────────────────
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = deferredSearchValue.trim().toLowerCase();

  const categories = useMemo(() => {
    if (initialCategories && initialCategories.length > 0) {
      return ["TODOS", ...initialCategories.map((c) => c.name)];
    }
    const cats = Array.from(
      new Set(products.filter((p) => p.isActive).map((p) => p.categoryName)),
    ).sort();
    return ["TODOS", ...cats];
  }, [products, initialCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (!product.isActive) return false;
      if (selectedCategory !== "TODOS" && product.categoryName !== selectedCategory) {
        return false;
      }
      if (!normalizedSearchValue) return true;
      return (
        product.name.toLowerCase().includes(normalizedSearchValue) ||
        product.categoryName.toLowerCase().includes(normalizedSearchValue) ||
        product.description.toLowerCase().includes(normalizedSearchValue) ||
        (product.sku?.toLowerCase().includes(normalizedSearchValue) ?? false)
      );
    });
  }, [products, selectedCategory, normalizedSearchValue]);

  // Pizzas in the same category as selectedPizzaProduct for flavor 2 selection
  const otherPizzaFlavors = useMemo(() => {
    if (!selectedPizzaProduct) return [];
    return products.filter(
      (p) =>
        p.isActive &&
        p.id !== selectedPizzaProduct.id &&
        (p.isPizzaCategory || p.categoryName === selectedPizzaProduct.categoryName),
    );
  }, [products, selectedPizzaProduct]);

  const filteredOtherPizzaFlavors = useMemo(() => {
    if (!pizzaFlavor2Search.trim()) return otherPizzaFlavors;
    const lower = pizzaFlavor2Search.toLowerCase().trim();
    return otherPizzaFlavors.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower),
    );
  }, [otherPizzaFlavors, pizzaFlavor2Search]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalItems = cartItems.reduce(
    (acc, item) => acc + (item.isWeighed ? 1 : item.quantity),
    0,
  );
  const cartSubtotal = round2(
    cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
  );
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

  // ── Calculated price for Pizza Modal ───────────────────────────────────────
  const computedPizzaPrice = useMemo(() => {
    if (!selectedPizzaProduct) return 0;
    const p1 = Number(selectedPizzaProduct.price || 0);
    const borderCost = selectedPizzaBorder ? Number(selectedPizzaBorder.price || 0) : 0;

    if (pizzaFraction === "inteira" || !pizzaFlavor2) {
      return round2(p1 + borderCost);
    }

    const p2 = Number(pizzaFlavor2.price || 0);
    const base =
      pizzaPricingRule === "MAX" ? Math.max(p1, p2) : (p1 + p2) / 2;

    return round2(base + borderCost);
  }, [selectedPizzaProduct, pizzaFlavor2, pizzaFraction, selectedPizzaBorder, pizzaPricingRule]);

  // ── Calculated price for Customization Modal ────────────────────────────────
  const computedCustomPrice = useMemo(() => {
    if (!customizingProduct) return 0;
    let total = Number(customizingProduct.price || 0);

    for (const group of customOptionGroups) {
      const selectedIds = selectedCustomOptions[group.id] || [];
      for (const optId of selectedIds) {
        const found = group.options.find((o) => o.id === optId);
        if (found) {
          total += Number(found.price || 0);
        }
      }
    }

    return round2(total);
  }, [customizingProduct, customOptionGroups, selectedCustomOptions]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Clear coupon & cashback when cart changes
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError(null);
    setUseWalletBalance(false);
  }, [cartItems]);

  // Clear splits when total changes
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

  // Sync callback refs
  useEffect(() => {
    handleFinishSaleRef.current = handleFinishSale;
    addProductRef.current = handleProductCardClick;
  });

  // Keyboard shortcuts (F2 / F8 / F12) + barcode scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "F8") {
        e.preventDefault();
        document.getElementById("pdv-split-amount")?.focus();
        return;
      }
      if (e.key === "F12") {
        e.preventDefault();
        if (cartItems.length > 0 && !isPending && activeShift) {
          handleFinishSaleRef.current();
        }
        return;
      }

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
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 80);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems, isPending, activeShift, products]);

  // Online / offline sync
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
            // Keep in offline queue
          }
        }
        setIsSyncing(false);
        if (synced > 0) {
          toast.success(`${synced} venda(s) offline sincronizada(s) com sucesso!`);
          setPendingOrdersCount((prev) => prev - synced);
        }
      } catch {
        setIsSyncing(false);
      }
    };

    window.addEventListener("online", () => void syncPending());
    void syncPending();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // ── Open Pizza Builder Modal ───────────────────────────────────────────────
  const openPizzaBuilder = async (product: PdvProduct) => {
    setSelectedPizzaProduct(product);
    setPizzaFraction("inteira");
    setPizzaFlavor2(null);
    setPizzaFlavor2Search("");
    setSelectedPizzaBorder(null);
    setPizzaNotes("");
    setPizzaQuantity(1);
    setIsPizzaLoading(true);

    try {
      const full = await buscarProdutoComOpcoesPdv(slug, product.id);
      if (full && full.optionGroups) {
        const borderGroup = full.optionGroups.find((g) =>
          g.name.toLowerCase().includes("borda"),
        );
        if (borderGroup) {
          setPizzaBorderOptions(
            borderGroup.options.map((o) => ({
              id: o.id,
              name: o.name,
              price: Number(o.price || 0),
            })),
          );
        } else {
          setPizzaBorderOptions([]);
        }
      } else {
        setPizzaBorderOptions([]);
      }
    } catch {
      setPizzaBorderOptions([]);
    } finally {
      setIsPizzaLoading(false);
    }
  };

  // ── Open Customization Modal (Adicionais nos lanches/pratos) ────────────────
  const openProductCustomization = async (product: PdvProduct) => {
    setCustomizingProduct(product);
    setSelectedCustomOptions({});
    setCustomNotes("");
    setCustomQuantity(1);
    setIsCustomLoading(true);

    try {
      const full = await buscarProdutoComOpcoesPdv(slug, product.id);
      if (full && full.optionGroups && full.optionGroups.length > 0) {
        setCustomOptionGroups(
          full.optionGroups.map((g) => ({
            id: g.id,
            name: g.name,
            minOptions: g.minOptions ?? 0,
            maxOptions: g.maxOptions ?? 1,
            options: g.options.map((o) => ({
              id: o.id,
              name: o.name,
              price: Number(o.price || 0),
              description: o.description,
            })),
          })),
        );
      } else {
        // No option groups, add directly
        setCustomizingProduct(null);
        addSimpleProduct(product);
      }
    } catch {
      setCustomizingProduct(null);
      addSimpleProduct(product);
    } finally {
      setIsCustomLoading(false);
    }
  };

  // ── Click on Product Card ──────────────────────────────────────────────────
  const handleProductCardClick = (product: PdvProduct, overrideWeight?: number) => {
    // If scale has captured weight, add as weighed item directly
    if (overrideWeight !== undefined || capturedWeight !== null) {
      addSimpleProduct(product, overrideWeight);
      return;
    }

    if (product.isPizzaCategory) {
      void openPizzaBuilder(product);
      return;
    }

    // Opens customization modal to check if there are option groups
    void openProductCustomization(product);
  };

  // ── Add simple product directly (no options) ──────────────────────────────
  const addSimpleProduct = (product: PdvProduct, overrideWeight?: number) => {
    setFeedback(null);
    const weightToUse = overrideWeight ?? capturedWeight;

    if (weightToUse !== null) {
      setCapturedWeight(null);
      setCartItems((current) => [
        ...current,
        {
          id: `${product.id}_w${String(Date.now())}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: round2(weightToUse),
          isWeighed: true,
        },
      ]);
      toast.success(`${product.name} adicionado (${weightToUse.toFixed(3)} kg)`);
      return;
    }

    setCartItems((current) => {
      const existing = current.find(
        (i) => i.productId === product.id && !i.isWeighed && !i.selectedOptionIds?.length && !i.notes,
      );
      if (!existing) {
        return [
          ...current,
          {
            id: `${product.id}_${String(Date.now())}`,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          },
        ];
      }
      if (product.trackInventory && existing.quantity >= product.stockQuantity) {
        toast.warning("Limite de estoque atingido para este item.");
        return current;
      }
      return current.map((i) =>
        i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
      );
    });
    toast.success(`${product.name} adicionado ao pedido`);
  };

  // ── Confirm Pizza Addition to Cart ─────────────────────────────────────────
  const handleConfirmPizza = () => {
    if (!selectedPizzaProduct) return;

    if (pizzaFraction === "meio-a-meio" && !pizzaFlavor2) {
      toast.warning("Selecione o segundo sabor da pizza para continuar.");
      return;
    }

    const flavorLabel =
      pizzaFraction === "meio-a-meio" && pizzaFlavor2
        ? `${selectedPizzaProduct.name} / ${pizzaFlavor2.name}`
        : selectedPizzaProduct.name;

    const noteParts: string[] = [];
    if (pizzaFraction === "meio-a-meio" && pizzaFlavor2) {
      noteParts.push(`1/2 ${selectedPizzaProduct.name} + 1/2 ${pizzaFlavor2.name}`);
    }
    if (selectedPizzaBorder) {
      noteParts.push(`Borda: ${selectedPizzaBorder.name}`);
    }
    if (pizzaNotes.trim()) {
      noteParts.push(pizzaNotes.trim());
    }
    const finalNotes = noteParts.join(" | ");

    const selectedOptionIds = selectedPizzaBorder ? [selectedPizzaBorder.id] : [];
    const selectedOptionNames = selectedPizzaBorder
      ? [`Borda ${selectedPizzaBorder.name} (+${formatCurrency(selectedPizzaBorder.price)})`]
      : [];

    const primaryProduct =
      pizzaPricingRule === "MAX" && pizzaFlavor2 && Number(pizzaFlavor2.price) > Number(selectedPizzaProduct.price)
        ? pizzaFlavor2
        : selectedPizzaProduct;

    const cartItem: CartItem = {
      id: `pizza_${primaryProduct.id}_${pizzaFraction}_${pizzaFlavor2?.id ?? ""}_${Date.now()}`,
      productId: primaryProduct.id,
      name: `Pizza — ${flavorLabel}`,
      price: computedPizzaPrice,
      quantity: pizzaQuantity,
      isPizza: true,
      fraction: pizzaFraction,
      flavor1Name: selectedPizzaProduct.name,
      flavor2Name: pizzaFlavor2?.name,
      borderName: selectedPizzaBorder?.name,
      selectedOptionIds,
      selectedOptionNames,
      notes: finalNotes || undefined,
    };

    setCartItems((prev) => [...prev, cartItem]);
    setSelectedPizzaProduct(null);
    toast.success(`Pizza ${flavorLabel} adicionada com sucesso!`);
  };

  // ── Confirm Custom Product Addition to Cart ────────────────────────────────
  const handleConfirmCustomProduct = () => {
    if (!customizingProduct) return;

    // Validate required groups
    for (const group of customOptionGroups) {
      const selected = selectedCustomOptions[group.id] || [];
      if (group.minOptions > 0 && selected.length < group.minOptions) {
        toast.warning(
          `O grupo "${group.name}" requer pelo menos ${group.minOptions} opção(ões) selecionada(s).`,
        );
        return;
      }
    }

    const allOptionIds: string[] = [];
    const allOptionNames: string[] = [];

    for (const group of customOptionGroups) {
      const selectedIds = selectedCustomOptions[group.id] || [];
      for (const optId of selectedIds) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          allOptionIds.push(opt.id);
          const priceSuffix = opt.price > 0 ? ` (+${formatCurrency(opt.price)})` : "";
          allOptionNames.push(`${opt.name}${priceSuffix}`);
        }
      }
    }

    const cartItem: CartItem = {
      id: `prod_${customizingProduct.id}_${Date.now()}`,
      productId: customizingProduct.id,
      name: customizingProduct.name,
      price: computedCustomPrice,
      quantity: customQuantity,
      selectedOptionIds: allOptionIds,
      selectedOptionNames: allOptionNames,
      notes: customNotes.trim() || undefined,
    };

    setCartItems((prev) => [...prev, cartItem]);
    setCustomizingProduct(null);
    toast.success(`${customizingProduct.name} adicionado com opcionais!`);
  };

  // ── Cart item controls ─────────────────────────────────────────────────────
  const decreaseCartItem = (itemId: string) => {
    setCartItems((current) =>
      current
        .map((i) => (i.id === itemId && !i.isWeighed ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const increaseCartItem = (itemId: string) => {
    setCartItems((current) =>
      current.map((i) => (i.id === itemId && !i.isWeighed ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  };

  const removeCartItem = (itemId: string) => {
    setCartItems((current) => current.filter((i) => i.id !== itemId));
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

    if (result.success && result.discountAmount) {
      setAppliedCoupon({
        code: couponCode.trim().toUpperCase(),
        discountAmount: result.discountAmount,
      });
      toast.success(`Cupom aplicado! Desconto de ${formatCurrency(result.discountAmount)}`);
    } else {
      const err = result.error || "Cupom inválido.";
      setCouponError(err);
      toast.error(err);
    }
  }, [couponCode, slug, customerPhone, cartSubtotal]);

  // ── Print receipt ──────────────────────────────────────────────────────────
  const handlePrintReceipt = useCallback(async () => {
    if (!completedOrderId) return;
    setIsPrintLoading(true);

    const order = await buscarPedidoPdvParaImpressao(completedOrderId);
    setIsPrintLoading(false);

    if (!order) {
      toast.error("Não foi possível carregar os dados para impressão.");
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cupom Pedido #${order.id}</title>
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
            <h2 class="bold">CUPOM DE BALCÃO — PDV</h2>
            <p style="font-size:18px;" class="bold">PEDIDO #${order.id}</p>
          </div>
          <div class="mb">
            <p><span class="bold">CLIENTE:</span> ${order.customerName}</p>
            <p><span class="bold">DATA:</span> ${formatDateTime(order.createdAt)}</p>
            <p><span class="bold">PAGAMENTO:</span> ${order.paymentMethod}</p>
          </div>
          <div class="dashed"></div>
          <div class="mb">
            <div class="row bold"><span>ITEM</span><span>QTD</span></div>
            ${order.orderProducts.map((item) => {
              const optionsHtml = item.orderProductOptions && item.orderProductOptions.length > 0
                ? item.orderProductOptions.map((o) => `<div style="font-size:10px;padding-left:8px;color:#333;">• ${o.nameSnapshot}</div>`).join("")
                : "";
              const notesHtml = item.notes ? `<div style="font-size:10px;font-style:italic;padding-left:8px;">- Obs: ${item.notes}</div>` : "";
              return `<div class="row" style="margin-top:3px;"><span class="bold">${item.productNameSnapshot || item.product.name}</span><span>${item.quantity}x</span></div>${optionsHtml}${notesHtml}`;
            }).join("")}
          </div>
          <div class="dashed"></div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div class="row"><span>SUBTOTAL</span><span>${formatCurrency(order.subtotal)}</span></div>
            ${order.discountAmount > 0 ? `<div class="row"><span>DESCONTO</span><span>-${formatCurrency(order.discountAmount)}</span></div>` : ""}
            <div class="row bold" style="padding-top:4px;font-size:14px;"><span>TOTAL</span><span>${formatCurrency(order.total)}</span></div>
          </div>
          ${order.paymentMethod === "DINHEIRO" && order.changeFor ? `<div class="dashed"></div><p class="bold">TROCO PARA: ${formatCurrency(order.changeFor)}</p>` : ""}
          <div class="center spacer" style="margin-top:20px;font-size:10px;">
            <p>Obrigado pela preferência!</p><p>EeyFood Gestão</p>
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
      products: cartItems.map((item) => ({
        id: item.productId,
        name: item.name,
        quantity: item.quantity,
        selectedOptions: item.selectedOptionIds,
        notes: item.notes,
      })),
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
    if (cartItems.length === 0) {
      toast.warning("Adicione pelo menos um item para finalizar a venda.");
      return;
    }

    if (!activeShift) {
      toast.warning("Abra um turno de caixa antes de realizar vendas.");
      setIsShiftModalOpen(true);
      return;
    }

    if (isSplitMode && splitRemaining !== 0) {
      toast.error(
        splitRemaining > 0
          ? `Falta cobrir ${formatCurrency(splitRemaining)} nos pagamentos divididos.`
          : `Os pagamentos excedem o total em ${formatCurrency(Math.abs(splitRemaining))}.`,
      );
      return;
    }

    if (!isSplitMode && paymentMethod === "DINHEIRO" && receivedAmountNum > 0 && change < 0) {
      toast.error(`Valor recebido insuficiente. Faltam ${formatCurrency(Math.abs(change))}.`);
      return;
    }

    const payload = buildPayload();

    if (paymentMethod === "DINHEIRO" || (isSplitMode && paymentSplits.some((s) => s.method === "DINHEIRO"))) {
      void openDrawerUsb(drawerPulseHex);
    }

    startTransition(async () => {
      if (!navigator.onLine) {
        try {
          await saveOfflineOrder(payload);
          setPendingOrdersCount((c) => c + 1);
          toast.success("Venda salva em modo offline com sucesso!");
          clearSale();
        } catch {
          toast.error("Erro ao salvar venda offline.");
        }
        return;
      }

      try {
        const result = await finalizarVendaPdv(payload);
        if (result.success) {
          toast.success(`Venda #${result.orderId} finalizada com sucesso!`);
          setCompletedOrderId(result.orderId ?? null);
          clearSale();
        } else {
          toast.error(result.message || "Erro ao finalizar venda.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro inesperado.");
      }
    });
  };

  // ── Shift management handlers ──────────────────────────────────────────────
  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success("Turno de caixa aberto com sucesso!");
    } else {
      toast.error(result.message);
    }
  };

  const handleOpenFechamentoModal = async () => {
    if (!activeShift) return;
    setIsFechamentoLoading(true);
    setIsFechamentoOpen(true);

    const result = await fecharTurnoCaixa({
      slug,
      shiftId: activeShift.id,
      actualClosingAmount: 0,
    });

    setIsFechamentoLoading(false);
    if (result.success && result.summary) {
      setFechamentoSummary(result.summary);
      setFechamentoActualAmount(result.summary.dinheiroEsperado.toFixed(2));
    } else {
      toast.error(result.message || "Não foi possível carregar o resumo.");
    }
  };

  const handleConfirmFechamento = async () => {
    if (!activeShift) return;
    setIsFechamentoLoading(true);

    const actual = parseFloat(fechamentoActualAmount.replace(",", ".")) || 0;
    const result = await fecharTurnoCaixa({
      slug,
      shiftId: activeShift.id,
      actualClosingAmount: actual,
      notes: fechamentoNotes,
    });

    setIsFechamentoLoading(false);
    if (result.success) {
      toast.success("Turno de caixa fechado com sucesso!");
      setActiveShift(null);
      setIsFechamentoOpen(false);
      setFechamentoSummary(null);
      setIsShiftModalOpen(true);
    } else {
      toast.error(result.message);
    }
  };

  const handleMovimentacaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setIsMovimentacaoLoading(true);

    const amount = parseFloat(movimentacaoAmount.replace(",", ".")) || 0;
    const result = await registrarMovimentacaoCaixa({
      slug,
      shiftId: activeShift.id,
      type: movimentacaoType,
      amount,
      reason: movimentacaoReason,
    });

    setIsMovimentacaoLoading(false);
    if (result.success) {
      toast.success(result.message);
      setIsMovimentacaoOpen(false);
      setMovimentacaoAmount("");
      setMovimentacaoReason("");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header (matching usuarios-client standard) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <MonitorSmartphoneIcon size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Frente de Caixa (PDV)
              </h1>
              {activeShift ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Turno Aberto: {activeShift.openedByUser}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                  Caixa Fechado
                </span>
              )}
              {isOffline && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                  <WifiOffIcon size={12} />
                  Offline ({pendingOrdersCount})
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              Lançamento ágil de pedidos, pizzas meio a meio com 2 sabores, adicionais, pesagem e recebimentos.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeShift ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMovimentacaoOpen(true)}
                className="h-10 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RotateCcwIcon size={14} />
                <span>Sangria / Suprimento</span>
              </Button>

              <Button
                size="sm"
                onClick={handleOpenFechamentoModal}
                className="h-10 gap-1.5 rounded-full bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                <span>Fechar Caixa</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsShiftModalOpen(true)}
              className="h-10 gap-1.5 rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <ClockIcon size={14} />
              <span>Abrir Turno de Caixa</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Metric Cards (matching usuarios-client standard) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Carrinho Atual
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700 shrink-0">
                <ShoppingCartIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {formatCurrency(finalTotal)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {totalItems} {totalItems === 1 ? "item adicionado" : "itens adicionados"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Regra de Pizza
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700 shrink-0">
                <ChefHatIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-slate-900">
              {pizzaPricingRule === "MAX" ? "Maior Valor" : "Média dos Sabores"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Cálculo para 2 sabores
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Balança Serial
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700 shrink-0">
                <ScaleIcon size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-slate-900">
                {capturedWeight !== null ? `${capturedWeight.toFixed(3)} kg` : "—"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {scaleStatus === "reading" || scaleStatus === "done"
                ? "Conectada (Lendo)"
                : scaleStatus === "error"
                  ? "Erro na Balança"
                  : "Manual / Pronta"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Conexão
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 shrink-0">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {isOffline ? "Offline" : "100% Online"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {pendingOrdersCount > 0 ? `${pendingOrdersCount} pendente(s) de envio` : "Sincronizado com retaguarda"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Workspace: Catalog (Left) + Cart/Checkout (Right) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Products & Categories (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Search bar & Category filter */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <SearchIcon
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar por nome, código SKU ou bipe o código de barras (F2)..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => setSearchValue("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>

              {/* Category Pills Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                        isSelected
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
                      )}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProducts.map((product) => {
              const inCart = cartItems.find((i) => i.productId === product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductCardClick(product)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all cursor-pointer hover:border-slate-400 hover:shadow-md",
                    inCart && "border-slate-900/60 ring-1 ring-slate-900/30",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 truncate max-w-[120px]">
                        {product.categoryName}
                      </span>
                      {product.isPizzaCategory && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 shrink-0">
                          🍕 Pizza
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Preço</span>
                      <span className="font-display text-sm font-bold text-slate-900">
                        {formatCurrency(product.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {product.isPizzaCategory ? (
                        <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm group-hover:bg-slate-800">
                          <ChefHatIcon size={12} />
                          <span>Montar</span>
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                          <PlusIcon size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <Card className="border-slate-200/80 bg-white shadow-sm p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">Nenhum produto encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os termos da busca ou selecionar outra categoria.
              </p>
            </Card>
          )}
        </div>

        {/* Right Column: Cart & Checkout (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-800">
                    <ShoppingCartIcon size={16} />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Pedido em Andamento
                    </h2>
                    <p className="text-xs text-slate-500">
                      {cartItems.length} {cartItems.length === 1 ? "item" : "itens"} na comanda
                    </p>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSale}
                    className="h-8 gap-1 text-xs text-slate-500 hover:text-rose-600"
                  >
                    <Trash2Icon size={13} />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
                {cartItems.map((item) => (
                  <div key={item.id} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 line-clamp-1">
                          {item.name}
                        </p>
                        {item.fraction === "meio-a-meio" && (
                          <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                            1/2 {item.flavor1Name} + 1/2 {item.flavor2Name}
                          </span>
                        )}
                        {item.borderName && (
                          <p className="text-[11px] text-amber-700 font-medium">
                            • Borda: {item.borderName}
                          </p>
                        )}
                        {item.selectedOptionNames && item.selectedOptionNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.selectedOptionNames.map((optName, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-blue-50 px-1 py-0.2 text-[10px] text-blue-700 border border-blue-100"
                              >
                                {optName}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[11px] italic text-slate-500 flex items-center gap-1 mt-0.5">
                            <InfoIcon size={10} className="shrink-0" />
                            <span>Obs: {item.notes}</span>
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-semibold text-xs text-slate-900">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatCurrency(item.price)} cada
                        </p>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => decreaseCartItem(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                          <MinusIcon size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseCartItem(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                          <PlusIcon size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        className="text-[11px] text-rose-600 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}

                {cartItems.length === 0 && (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <ShoppingCartIcon size={28} className="mx-auto text-slate-300" />
                    <p className="text-xs">Nenhum item adicionado ao pedido ainda.</p>
                  </div>
                )}
              </div>

              {/* Customer and phone identification */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <Label htmlFor="pdv-cust-name" className="text-[11px] font-semibold text-slate-700">
                    Nome do Cliente
                  </Label>
                  <Input
                    id="pdv-cust-name"
                    placeholder="Ex: Carlos"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-8 rounded-lg border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pdv-cust-phone" className="text-[11px] font-semibold text-slate-700">
                    WhatsApp (Cashback)
                  </Label>
                  <Input
                    id="pdv-cust-phone"
                    placeholder="11999999999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-8 rounded-lg border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Cashback toggle if available */}
              {walletBalance && walletBalance > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                  <div className="flex items-center gap-2">
                    <WalletIcon size={16} className="text-emerald-700" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">
                        Saldo Cashback: {formatCurrency(walletBalance)}
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        Usar {formatCurrency(cashbackDiscount)} neste pedido
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={useWalletBalance}
                    onCheckedChange={setUseWalletBalance}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              )}

              {/* Coupon input */}
              {isCouponsEnabled && (
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Código do cupom de desconto..."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="h-8 rounded-lg border-slate-200 text-xs uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    onClick={handleApplyCoupon}
                    className="h-8 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 shrink-0"
                  >
                    {isValidatingCoupon ? "..." : "Aplicar"}
                  </Button>
                </div>
              )}

              {/* Payment Methods */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Forma de Pagamento
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["DINHEIRO", "CARTAO_PRESENCIAL", "PIX", "VALE_REFEICAO", "VALE_ALIMENTACAO"] as PdvPaymentMethod[]).map(
                    (method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={cn(
                            "flex items-center justify-center gap-1 rounded-xl border p-2 text-xs font-semibold transition-all",
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          {method === "DINHEIRO" && <BanknoteIcon size={13} />}
                          {method === "CARTAO_PRESENCIAL" && <CreditCardIcon size={13} />}
                          {method === "PIX" && <QrCodeIcon size={13} />}
                          {method === "VALE_REFEICAO" && <UtensilsCrossedIcon size={13} />}
                          {method === "VALE_ALIMENTACAO" && <TagIcon size={13} />}
                          <span>{PAYMENT_LABELS[method]}</span>
                        </button>
                      );
                    },
                  )}
                </div>

                {/* Cash change field */}
                {paymentMethod === "DINHEIRO" && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1">
                      <Label htmlFor="pdv-cash-received" className="text-[10px] text-slate-500">
                        Valor Recebido (R$)
                      </Label>
                      <Input
                        id="pdv-cash-received"
                        placeholder="Ex: 50,00"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        className="h-8 rounded-lg border-slate-200 text-xs"
                      />
                    </div>
                    {receivedAmountNum > 0 && (
                      <div className="flex-1 text-right">
                        <span className="text-[10px] text-slate-500 block">Troco</span>
                        <span
                          className={cn(
                            "font-bold text-xs",
                            change >= 0 ? "text-emerald-700" : "text-rose-600",
                          )}
                        >
                          {change >= 0 ? formatCurrency(change) : "Falta dinheiro"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Service fee toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600 font-medium">Taxa de Serviço (10%)</span>
                <Switch
                  checked={useServiceFee}
                  onCheckedChange={setUseServiceFee}
                  className="data-[state=checked]:bg-slate-900"
                />
              </div>

              {/* Summary totals */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-medium">
                    <span>Descontos</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {useServiceFee && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Serviço (10%)</span>
                    <span>+{formatCurrency(serviceFeeAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Total a Pagar</span>
                  <span className="font-display text-base text-slate-900">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Action Finish Button */}
              <Button
                type="button"
                onClick={handleFinishSale}
                disabled={isPending || cartItems.length === 0}
                className="h-12 w-full gap-2 rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <LoaderCircleIcon size={16} className="animate-spin" />
                    <span>Finalizando Venda...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon size={16} />
                    <span>Finalizar Venda (F12)</span>
                  </>
                )}
              </Button>

              {completedOrderId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintReceipt}
                  disabled={isPrintLoading}
                  className="h-10 w-full gap-1.5 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <PrinterIcon size={14} />
                  <span>Imprimir Cupom do Pedido #{completedOrderId}</span>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Modal: Pizza Builder (1 ou 2 Sabores / Meio a Meio) ── */}
      <Dialog
        open={Boolean(selectedPizzaProduct)}
        onOpenChange={(open) => !open && setSelectedPizzaProduct(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                <ChefHatIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Montar Pizza — {selectedPizzaProduct?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Personalize os sabores, selecione borda recheada e observações.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedPizzaProduct && (
            <div className="space-y-4 pt-2">
              {/* Fraction Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Divisão de Sabores
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPizzaFraction("inteira");
                      setPizzaFlavor2(null);
                    }}
                    className={cn(
                      "rounded-xl border p-2.5 text-xs font-semibold transition-all",
                      pizzaFraction === "inteira"
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    Pizza Inteira (1 Sabor)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPizzaFraction("meio-a-meio")}
                    className={cn(
                      "rounded-xl border p-2.5 text-xs font-semibold transition-all",
                      pizzaFraction === "meio-a-meio"
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    Meio a Meio (2 Sabores)
                  </button>
                </div>
              </div>

              {/* Sabor 1 info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    {pizzaFraction === "meio-a-meio" ? "1º Sabor (1/2)" : "Sabor Escolhido"}
                  </span>
                  <p className="font-semibold text-sm text-slate-900">
                    {selectedPizzaProduct.name}
                  </p>
                </div>
                <span className="font-bold text-xs text-slate-900">
                  {formatCurrency(selectedPizzaProduct.price)}
                </span>
              </div>

              {/* Sabor 2 Picker if Meio a Meio */}
              {pizzaFraction === "meio-a-meio" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      Escolha o 2º Sabor (1/2) *
                    </Label>
                    <span className="text-[11px] text-amber-700 font-medium">
                      {pizzaPricingRule === "MAX"
                        ? "Cobrança pelo maior valor"
                        : "Cobrança pela média dos sabores"}
                    </span>
                  </div>

                  {/* Search for flavor 2 */}
                  <Input
                    placeholder="Filtrar outros sabores..."
                    value={pizzaFlavor2Search}
                    onChange={(e) => setPizzaFlavor2Search(e.target.value)}
                    className="h-8 rounded-lg border-slate-200 text-xs"
                  />

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border rounded-xl p-2 border-slate-200 bg-slate-50/40">
                    {filteredOtherPizzaFlavors.map((flavor) => {
                      const isChosen = pizzaFlavor2?.id === flavor.id;
                      return (
                        <div
                          key={flavor.id}
                          onClick={() => setPizzaFlavor2(flavor)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border text-xs",
                            isChosen
                              ? "border-slate-900 bg-slate-900 text-white font-semibold shadow-sm"
                              : "border-transparent bg-white text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate">{flavor.name}</p>
                            {flavor.description && (
                              <p className={cn("text-[10px] truncate", isChosen ? "text-slate-300" : "text-slate-400")}>
                                {flavor.description}
                              </p>
                            )}
                          </div>
                          <span className={cn("shrink-0 font-bold", isChosen ? "text-white" : "text-slate-900")}>
                            {formatCurrency(flavor.price)}
                          </span>
                        </div>
                      );
                    })}

                    {filteredOtherPizzaFlavors.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">
                        Nenhum outro sabor encontrado.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Borda Recheada selection if available */}
              {pizzaBorderOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Borda Recheada (Opcional)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPizzaBorder(null)}
                      className={cn(
                        "rounded-xl border p-2 text-xs font-medium transition-all text-left",
                        !selectedPizzaBorder
                          ? "border-slate-900 bg-slate-900 text-white font-semibold"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <span>Sem Borda</span>
                    </button>
                    {pizzaBorderOptions.map((border) => {
                      const isChosen = selectedPizzaBorder?.id === border.id;
                      return (
                        <button
                          key={border.id}
                          type="button"
                          onClick={() => setSelectedPizzaBorder(border)}
                          className={cn(
                            "rounded-xl border p-2 text-xs font-medium transition-all text-left flex justify-between items-center",
                            isChosen
                              ? "border-slate-900 bg-slate-900 text-white font-semibold"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          <span className="truncate">{border.name}</span>
                          <span className="shrink-0 text-[11px] font-bold">
                            +{formatCurrency(border.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="pdv-pizza-notes" className="text-xs font-semibold text-slate-700">
                  Observações da Pizza (Ex: Sem cebola, massa bem assada)
                </Label>
                <Input
                  id="pdv-pizza-notes"
                  placeholder="Escreva aqui..."
                  value={pizzaNotes}
                  onChange={(e) => setPizzaNotes(e.target.value)}
                  className="h-9 rounded-xl border-slate-200 text-xs"
                />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Quantidade</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPizzaQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <MinusIcon size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-900">
                    {pizzaQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPizzaQuantity((q) => q + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedPizzaProduct(null)}
                  className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPizza}
                  disabled={pizzaFraction === "meio-a-meio" && !pizzaFlavor2}
                  className="rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  <span>
                    Adicionar Pizza — {formatCurrency(computedPizzaPrice * pizzaQuantity)}
                  </span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Product Customization / Adicionais nos Lanches ── */}
      <Dialog
        open={Boolean(customizingProduct)}
        onOpenChange={(open) => !open && setCustomizingProduct(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                <PlusIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Personalizar — {customizingProduct?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Selecione opcionais, adicionais e complementos para este item.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {customizingProduct && (
            <div className="space-y-4 pt-2">
              {isCustomLoading ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <LoaderCircleIcon size={18} className="animate-spin" />
                  <span className="text-xs">Carregando grupos de adicionais...</span>
                </div>
              ) : (
                <>
                  <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
                    {customOptionGroups.map((group) => {
                      const selected = selectedCustomOptions[group.id] || [];
                      const isRequired = group.minOptions > 0;
                      const isSingle = group.maxOptions === 1;

                      return (
                        <div
                          key={group.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-900">
                              {group.name}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                isRequired && selected.length < group.minOptions
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200",
                              )}
                            >
                              {isRequired
                                ? `Obrigatório (mín. ${group.minOptions})`
                                : `Opcional (máx. ${group.maxOptions})`}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-1.5">
                            {group.options.map((opt) => {
                              const isChecked = selected.includes(opt.id);

                              const toggleOption = () => {
                                setSelectedCustomOptions((prev) => {
                                  const current = prev[group.id] || [];
                                  if (isSingle) {
                                    return { ...prev, [group.id]: [opt.id] };
                                  }
                                  if (current.includes(opt.id)) {
                                    return {
                                      ...prev,
                                      [group.id]: current.filter((id) => id !== opt.id),
                                    };
                                  }
                                  if (current.length >= group.maxOptions) {
                                    toast.warning(`Limite de ${group.maxOptions} opção(ões) atingido.`);
                                    return prev;
                                  }
                                  return { ...prev, [group.id]: [...current, opt.id] };
                                });
                              };

                              return (
                                <div
                                  key={opt.id}
                                  onClick={toggleOption}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-lg cursor-pointer border text-xs transition-all",
                                    isChecked
                                      ? "border-slate-900 bg-slate-900 text-white font-semibold"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                                  )}
                                >
                                  <div>
                                    <p>{opt.name}</p>
                                    {opt.description && (
                                      <p className={cn("text-[10px]", isChecked ? "text-slate-300" : "text-slate-400")}>
                                        {opt.description}
                                      </p>
                                    )}
                                  </div>
                                  <span className={cn("font-bold text-xs shrink-0", isChecked ? "text-white" : "text-slate-900")}>
                                    {opt.price > 0 ? `+${formatCurrency(opt.price)}` : "Grátis"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pdv-custom-notes" className="text-xs font-semibold text-slate-700">
                      Observações (Ex: Sem cebola, pão bem passado)
                    </Label>
                    <Input
                      id="pdv-custom-notes"
                      placeholder="Escreva alguma observação para a cozinha..."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      className="h-9 rounded-xl border-slate-200 text-xs"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Quantidade</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomQuantity((q) => Math.max(1, q - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <MinusIcon size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-slate-900">
                        {customQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomQuantity((q) => q + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <PlusIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomizingProduct(null)}
                      className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmCustomProduct}
                      className="rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                      <span>
                        Adicionar ao Pedido — {formatCurrency(computedCustomPrice * customQuantity)}
                      </span>
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Abertura de Turno ── */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <ClockIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Abertura de Turno de Caixa
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Identifique o operador e informe o valor de fundo de troco inicial.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleOpenShiftSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="shift-operator" className="text-xs font-semibold text-slate-700">
                Nome do Operador *
              </Label>
              <Input
                id="shift-operator"
                required
                placeholder="Ex.: Matheus"
                value={shiftOperatorName}
                onChange={(e) => setShiftOperatorName(e.target.value)}
                className="h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-opening-amount" className="text-xs font-semibold text-slate-700">
                Fundo de Caixa Inicial (R$) *
              </Label>
              <Input
                id="shift-opening-amount"
                required
                placeholder="0,00"
                value={shiftOpeningAmount}
                onChange={(e) => setShiftOpeningAmount(e.target.value)}
                className="h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="submit"
                disabled={isShiftOpening || !shiftOperatorName.trim()}
                className="w-full rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {isShiftOpening && <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />}
                {isShiftOpening ? "Abrindo Turno..." : "Confirmar Abertura de Turno"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Movimentação (Sangria / Suprimento) ── */}
      <Dialog open={isMovimentacaoOpen} onOpenChange={setIsMovimentacaoOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <RotateCcwIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Movimentação de Caixa
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Registre uma retirada de valor (sangria) ou entrada adicional (suprimento).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleMovimentacaoSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMovimentacaoType("SANGRIA")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold transition-all",
                  movimentacaoType === "SANGRIA"
                    ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                Sangria (Retirada)
              </button>

              <button
                type="button"
                onClick={() => setMovimentacaoType("SUPRIMENTO")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold transition-all",
                  movimentacaoType === "SUPRIMENTO"
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                Suprimento (Entrada)
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mov-amount" className="text-xs font-semibold text-slate-700">
                Valor da Movimentação (R$) *
              </Label>
              <Input
                id="mov-amount"
                required
                placeholder="0,00"
                value={movimentacaoAmount}
                onChange={(e) => setMovimentacaoAmount(e.target.value)}
                className="h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mov-reason" className="text-xs font-semibold text-slate-700">
                Motivo / Justificativa *
              </Label>
              <Input
                id="mov-reason"
                required
                placeholder="Ex: Pagamento de fornecedor de gelo"
                value={movimentacaoReason}
                onChange={(e) => setMovimentacaoReason(e.target.value)}
                className="h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMovimentacaoOpen(false)}
                className="rounded-full border-slate-200 text-xs font-medium text-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isMovimentacaoLoading || !movimentacaoAmount.trim() || !movimentacaoReason.trim()}
                className="rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                {isMovimentacaoLoading ? "Registrando..." : "Confirmar Movimentação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Fechamento de Caixa ── */}
      <Dialog open={isFechamentoOpen} onOpenChange={setIsFechamentoOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                <ClockIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Fechamento de Turno de Caixa
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Confira as vendas do turno e informe a contagem física do dinheiro em gaveta.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isFechamentoLoading ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <LoaderCircleIcon size={16} className="animate-spin" />
              <span className="text-xs">Calculando totais do turno...</span>
            </div>
          ) : (
            fechamentoSummary && (
              <div className="space-y-3 pt-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Total de Pedidos</span>
                    <span className="font-semibold text-slate-900">{fechamentoSummary.totalOrders}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Vendas em Dinheiro</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(fechamentoSummary.totalDinheiro)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Vendas em Cartão</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(fechamentoSummary.totalCartao)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Vendas em PIX</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(fechamentoSummary.totalPix)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Suprimentos (+)</span>
                    <span className="font-semibold text-emerald-700">+{formatCurrency(fechamentoSummary.totalSuprimento)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Sangrias (-)</span>
                    <span className="font-semibold text-rose-600">-{formatCurrency(fechamentoSummary.totalSangria)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                    <span>Dinheiro Esperado em Caixa</span>
                    <span className="text-sm font-bold text-blue-700">
                      {formatCurrency(fechamentoSummary.dinheiroEsperado)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fech-actual" className="text-xs font-semibold text-slate-700">
                    Valor Físico em Dinheiro Contado na Gaveta (R$) *
                  </Label>
                  <Input
                    id="fech-actual"
                    required
                    value={fechamentoActualAmount}
                    onChange={(e) => setFechamentoActualAmount(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fech-notes" className="text-xs font-semibold text-slate-700">
                    Observações do Fechamento
                  </Label>
                  <Input
                    id="fech-notes"
                    placeholder="Alguma divergência ou justificativa..."
                    value={fechamentoNotes}
                    onChange={(e) => setFechamentoNotes(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFechamentoOpen(false)}
                    className="rounded-full border-slate-200 text-xs font-medium text-slate-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmFechamento}
                    disabled={isFechamentoLoading || !fechamentoActualAmount.trim()}
                    className="rounded-full bg-rose-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                  >
                    Confirmar Fechamento
                  </Button>
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PdvFrenteCaixa;
