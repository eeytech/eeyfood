"use client";

import type {
  MesaComanda,
  PaymentMethod,
  PedidoRecebimento,
  TableReservation,
  Waiter,
  WaitingQueueEntry,
  ComandaAvulsaComPedido,
} from "@fsw/db";
import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  ClockIcon,
  CreditCardIcon,
  GitMergeIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
  MapIcon,
  MicIcon,
  PlusIcon,
  QrCodeIcon,
  ScissorsIcon,
  SearchIcon,
  ShoppingBasketIcon,
  UsersRoundIcon,
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
import { io } from "socket.io-client";

import {
  abrirComandaAvulsaAction,
  abrirMesaAction,
  adicionarItensComandaAction,
  adicionarClienteFilaAction,
  atualizarStatusFilaAction,
  atualizarStatusReservaAction,
  buscarPagamentosParciaisAction,
  criarReservaAction,
  fecharComandaAction,
  fecharComandaAvulsaAction,
  registrarPagamentoParcialAction,
  transferirItensComandaAction,
  transferirMesaAction,
  unirMesasAction,
} from "@/app/[slug]/comandas/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProdutoComanda {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryName: string;
  isActive: boolean;
  trackInventory: boolean;
  stockQuantity: number;
}

interface ComandaDigitalProps {
  slug: string;
  restaurantName: string;
  initialTables: MesaComanda[];
  products: ProdutoComanda[];
  initialWaiters?: Waiter[];
  initialReservations?: TableReservation[];
  initialQueue?: WaitingQueueEntry[];
  initialComandasAvulsas?: ComandaAvulsaComPedido[];
}

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

type TableFilter = "TODAS" | "LIVRES" | "OCUPADAS";
type MainView = "MESAS" | "COMANDAS_AVULSAS";
type SalonView = "LISTA" | "MAPA";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDateTime = (value: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));

const formatTime = (value: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );

const getMesaColor = (mesa: MesaComanda, reservedTableIds: Set<string>) => {
  if (mesa.currentOrder) {
    const order = mesa.currentOrder;
    if (order.paymentStatus === "PAID" || order.status === "FINISHED") {
      return "border-emerald-400 bg-emerald-50";
    }
    if (order.total > 0 && order.orderProducts.length > 0) {
      return "border-blue-400 bg-blue-50";
    }
    return "border-amber-400 bg-amber-50";
  }
  if (reservedTableIds.has(mesa.table.id)) {
    return "border-orange-400 bg-orange-50";
  }
  return "border-slate-200 bg-white";
};

const getMesaStatusLabel = (mesa: MesaComanda, reservedTableIds: Set<string>) => {
  if (mesa.currentOrder) {
    if (mesa.currentOrder.paymentStatus === "PAID") return "Fechando";
    return "Ocupada";
  }
  if (reservedTableIds.has(mesa.table.id)) return "Reservada";
  return "Livre";
};

const getMesaStatusBadgeVariant = (
  mesa: MesaComanda,
  reservedTableIds: Set<string>,
): "secondary" | "warning" | "success" | "danger" => {
  if (mesa.currentOrder) {
    if (mesa.currentOrder.paymentStatus === "PAID") return "success";
    return "warning";
  }
  if (reservedTableIds.has(mesa.table.id)) return "danger";
  return "secondary";
};

const ComandaDigital = ({
  slug,
  restaurantName,
  initialTables,
  products,
  initialWaiters = [],
  initialReservations = [],
  initialQueue = [],
  initialComandasAvulsas = [],
}: ComandaDigitalProps) => {
  // ── Table / view state ──────────────────────────────────────────────────
  const [tables, setTables] = useState(initialTables);
  const [selectedTableId, setSelectedTableId] = useState(initialTables[0]?.table.id ?? "");
  const [tableFilter, setTableFilter] = useState<TableFilter>("TODAS");
  const [mainView, setMainView] = useState<MainView>("MESAS");
  const [salonView, setSalonView] = useState<SalonView>("LISTA");

  // ── Waiters / reservations / queue / avulsas ────────────────────────────
  const [waiters] = useState<Waiter[]>(initialWaiters);
  const [reservations, setReservations] = useState<TableReservation[]>(initialReservations);
  const [queue, setQueue] = useState<WaitingQueueEntry[]>(initialQueue);
  const [comandasAvulsas, setComandasAvulsas] = useState<ComandaAvulsaComPedido[]>(
    initialComandasAvulsas,
  );
  const [selectedAvulsaId, setSelectedAvulsaId] = useState<string | null>(null);

  // ── Drawer / side panel state ───────────────────────────────────────────
  const [isFilaOpen, setIsFilaOpen] = useState(false);
  const [isReservasOpen, setIsReservasOpen] = useState(false);

  // ── Product search ──────────────────────────────────────────────────────
  const [selectedProductCategory, setSelectedProductCategory] = useState("TODOS");
  const [searchValue, setSearchValue] = useState("");

  // ── Opening ────────────────────────────────────────────────────────────
  const [openingCustomerName, setOpeningCustomerName] = useState("");

  // ── Feedback ───────────────────────────────────────────────────────────
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Transfer dialog ────────────────────────────────────────────────────
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [targetTableId, setTargetTableId] = useState("");

  // ── Item transfer modal ─────────────────────────────────────────────────
  const [isItemTransferOpen, setIsItemTransferOpen] = useState(false);
  const [itemTransferTargetOrderId, setItemTransferTargetOrderId] = useState<number | null>(null);
  const [itemTransferSelectedIds, setItemTransferSelectedIds] = useState(new Set<string>());

  // ── Table merge dialog ──────────────────────────────────────────────────
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSecondaryOrderId, setMergeSecondaryOrderId] = useState<number | null>(null);

  // ── Division / partial payment ─────────────────────────────────────────
  const [divisaoPessoas, setDivisaoPessoas] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set<string>());
  const [paidAmount, setPaidAmount] = useState(0);

  // ── Reserva form ───────────────────────────────────────────────────────
  const [reservaForm, setReservaForm] = useState({
    customerName: "",
    customerPhone: "",
    partySize: 2,
    scheduledFor: "",
    diningTableId: "",
    notes: "",
  });

  // ── Fila form ──────────────────────────────────────────────────────────
  const [filaForm, setFilaForm] = useState({ customerName: "", partySize: 2 });

  // ── Avulsa form ────────────────────────────────────────────────────────
  const [avulsaCustomerName, setAvulsaCustomerName] = useState("");
  const [avulsaBarcode, setAvulsaBarcode] = useState("");
  const [avulsaBarcodeInput, setAvulsaBarcodeInput] = useState("");

  const deferredSearchValue = useDeferredValue(searchValue);
  const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  // ── Derived state ───────────────────────────────────────────────────────
  const todayReservations = useMemo(() => {
    const today = new Date();
    return reservations.filter((r) => {
      const d = new Date(r.scheduledFor);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate() &&
        r.status !== "CANCELLED" &&
        r.status !== "FINISHED"
      );
    });
  }, [reservations]);

  const reservedTableIds = useMemo(
    () =>
      new Set(
        todayReservations
          .map((r) => r.diningTableId)
          .filter((id): id is string => !!id),
      ),
    [todayReservations],
  );

  const selectedMesa = useMemo(
    () => tables.find((m) => m.table.id === selectedTableId) ?? null,
    [selectedTableId, tables],
  );

  const selectedAvulsa = useMemo(
    () => comandasAvulsas.find((c) => c.id === selectedAvulsaId) ?? null,
    [selectedAvulsaId, comandasAvulsas],
  );

  const occupiedTables = tables.filter((m) => m.currentOrder).length;
  const freeTables = tables.length - occupiedTables;

  const displayedTables = useMemo(() => {
    if (tableFilter === "LIVRES") return tables.filter((m) => !m.currentOrder);
    if (tableFilter === "OCUPADAS") return tables.filter((m) => m.currentOrder);
    return tables;
  }, [tables, tableFilter]);

  const productCategories = useMemo(() => {
    const cats = Array.from(
      new Set(products.filter((p) => p.isActive).map((p) => p.categoryName)),
    ).sort();
    return ["TODOS", ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = deferredSearchValue.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.isActive) return false;
      if (selectedProductCategory !== "TODOS" && p.categoryName !== selectedProductCategory)
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [deferredSearchValue, products, selectedProductCategory]);

  const selectedOrderItemsCount =
    selectedMesa?.currentOrder?.orderProducts.reduce((a, i) => a + i.quantity, 0) ?? 0;

  const transferTargetTables = useMemo(
    () => tables.filter((m) => !m.currentOrder && m.table.id !== selectedMesa?.table.id),
    [tables, selectedMesa?.table.id],
  );

  const mergeTargetOrders = useMemo(
    () =>
      tables.filter(
        (m) =>
          m.currentOrder &&
          m.table.id !== selectedMesa?.table.id,
      ),
    [tables, selectedMesa?.table.id],
  );

  const orderTotal = selectedMesa?.currentOrder?.total ?? 0;
  const remainingAmount = Math.max(Number((orderTotal - paidAmount).toFixed(2)), 0);

  const selectedItemsTotal = useMemo(
    () =>
      selectedMesa?.currentOrder?.orderProducts
        .filter((item) => selectedItemIds.has(item.id))
        .reduce((acc, item) => acc + item.lineTotal, 0) ?? 0,
    [selectedMesa?.currentOrder?.orderProducts, selectedItemIds],
  );

  const valorPorPessoa =
    divisaoPessoas > 0 ? Number((remainingAmount / divisaoPessoas).toFixed(2)) : remainingAmount;

  // ── Active order id for partial payment tracking ────────────────────────
  const activeOrderId = selectedMesa?.currentOrder?.id;

  useEffect(() => {
    setSelectedItemIds(new Set());
    setDivisaoPessoas(1);
    if (!activeOrderId) {
      setPaidAmount(0);
      return;
    }
    let cancelled = false;
    void buscarPagamentosParciaisAction(activeOrderId).then(({ totalPago }) => {
      if (!cancelled) setPaidAmount(totalPago);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrderId]);

  // ── WebSocket sync ─────────────────────────────────────────────────────
  const syncTables = useCallback(async () => {
    const res = await fetch(`/api/comandas/${slug}`, { cache: "no-store" });
    if (!res.ok) return;
    const updated = (await res.json()) as MesaComanda[];
    setTables(updated);
  }, [slug]);

  useEffect(() => {
    const socket = io(websocketUrl, { transports: ["websocket"] });
    const onConnect = () => socket.emit("JOIN_RESTAURANT_ROOM", slug);
    const onEvent = async (payload: { restaurantSlug: string }) => {
      if (payload.restaurantSlug !== slug) return;
      await syncTables();
    };
    socket.on("connect", onConnect);
    socket.on("NEW_ORDER", onEvent);
    socket.on("ORDER_UPDATED", onEvent);
    return () => {
      socket.off("connect", onConnect);
      socket.off("NEW_ORDER", onEvent);
      socket.off("ORDER_UPDATED", onEvent);
      socket.disconnect();
    };
  }, [slug, syncTables, websocketUrl]);

  // ── Barcode scanner for avulsas ─────────────────────────────────────────
  const barcodeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mainView === "COMANDAS_AVULSAS" && e.key === "Enter" && avulsaBarcodeInput) {
        const found = comandasAvulsas.find((c) => c.barcode === avulsaBarcodeInput);
        if (found) {
          setSelectedAvulsaId(found.id);
        }
        setAvulsaBarcodeInput("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [avulsaBarcodeInput, comandasAvulsas, mainView]);

  // ── Local optimistic helpers ────────────────────────────────────────────
  const updateMesaOrder = (updatedOrder: PedidoRecebimento) => {
    setTables((current) =>
      current.map((m) =>
        m.table.id === updatedOrder.diningTable?.id
          ? {
              ...m,
              currentOrder:
                updatedOrder.status === "FINISHED" || updatedOrder.status === "CANCELLED"
                  ? null
                  : updatedOrder,
            }
          : m,
      ),
    );
  };

  const toggleSelectedItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleItemTransferSelection = (itemId: string) => {
    setItemTransferSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // ── Action handlers ────────────────────────────────────────────────────
  const handleOpenTable = () => {
    if (!selectedMesa) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const order = await abrirMesaAction({
          slug,
          diningTableId: selectedMesa.table.id,
          customerName: openingCustomerName,
        });
        updateMesaOrder(order);
        setOpeningCustomerName("");
        setFeedback({ type: "success", message: `${selectedMesa.table.name} aberta.` });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao abrir mesa.",
        });
      }
    });
  };

  const handleAddProduct = (productId: string) => {
    const order = selectedMesa?.currentOrder ?? selectedAvulsa?.order;
    if (!order) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const updated = await adicionarItensComandaAction({
          slug,
          orderId: order.id,
          products: [{ id: productId, quantity: 1 }],
        });
        if (selectedMesa) updateMesaOrder(updated);
        if (selectedAvulsa) {
          setComandasAvulsas((prev) =>
            prev.map((c) => (c.id === selectedAvulsaId ? { ...c, order: updated } : c)),
          );
        }
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao lancar item.",
        });
      }
    });
  };

  const handleCloseBill = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!selectedMesa?.currentOrder) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const order = await fecharComandaAction({
          slug,
          orderId: selectedMesa.currentOrder!.id,
          paymentMethod,
        });
        updateMesaOrder(order);
        setPaidAmount(0);
        setSelectedItemIds(new Set());
        setFeedback({
          type: "success",
          message: `Conta da ${selectedMesa.table.name} encerrada — ${formatCurrency(order.total)}.`,
        });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao fechar conta.",
        });
      }
    });
  };

  const handleCloseAvulsaBill = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!selectedAvulsa?.order) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await fecharComandaAvulsaAction({
          slug,
          comandaId: selectedAvulsa.id,
          orderId: selectedAvulsa.order!.id,
          paymentMethod,
        });
        setComandasAvulsas((prev) => prev.filter((c) => c.id !== selectedAvulsaId));
        setSelectedAvulsaId(null);
        setFeedback({ type: "success", message: "Comanda avulsa encerrada." });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao fechar comanda.",
        });
      }
    });
  };

  const handleTransferirMesa = () => {
    if (!selectedMesa?.currentOrder || !targetTableId) return;
    setFeedback(null);
    const orderId = selectedMesa.currentOrder.id;
    const oldTableId = selectedMesa.table.id;
    const newTableName =
      tables.find((m) => m.table.id === targetTableId)?.table.name ?? "nova mesa";
    startTransition(async () => {
      try {
        const updated = await transferirMesaAction({ slug, orderId, novoTableId: targetTableId });
        setTables((current) =>
          current.map((m) => {
            if (m.table.id === oldTableId) return { ...m, currentOrder: null };
            if (m.table.id === targetTableId) return { ...m, currentOrder: updated };
            return m;
          }),
        );
        setSelectedTableId(targetTableId);
        setIsTransferOpen(false);
        setTargetTableId("");
        setFeedback({ type: "success", message: `Comanda transferida para ${newTableName}.` });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao transferir.",
        });
      }
    });
  };

  const handleItemTransfer = () => {
    if (!selectedMesa?.currentOrder || !itemTransferTargetOrderId || itemTransferSelectedIds.size === 0)
      return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await transferirItensComandaAction({
          slug,
          sourceOrderId: selectedMesa.currentOrder!.id,
          destinationOrderId: itemTransferTargetOrderId,
          orderProductIds: Array.from(itemTransferSelectedIds),
        });
        if (result.sourceOrder) updateMesaOrder(result.sourceOrder);
        if (result.destinationOrder) updateMesaOrder(result.destinationOrder);
        setIsItemTransferOpen(false);
        setItemTransferSelectedIds(new Set());
        setItemTransferTargetOrderId(null);
        setFeedback({ type: "success", message: "Itens transferidos com sucesso." });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao transferir itens.",
        });
      }
    });
  };

  const handleUnirMesas = () => {
    if (!selectedMesa?.currentOrder || !mergeSecondaryOrderId) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const updated = await unirMesasAction({
          slug,
          mainOrderId: selectedMesa.currentOrder!.id,
          secondaryOrderId: mergeSecondaryOrderId,
        });
        if (updated) updateMesaOrder(updated);
        await syncTables();
        setIsMergeOpen(false);
        setMergeSecondaryOrderId(null);
        setFeedback({ type: "success", message: "Mesas unidas. Todos os itens estao na mesa atual." });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao unir mesas.",
        });
      }
    });
  };

  const handlePagamentoParcial = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!selectedMesa?.currentOrder || selectedItemsTotal <= 0) return;
    setFeedback(null);
    const orderId = selectedMesa.currentOrder.id;
    const amount = Number(selectedItemsTotal.toFixed(2));
    startTransition(async () => {
      try {
        const result = await registrarPagamentoParcialAction({
          slug,
          orderId,
          amount,
          paymentMethod,
        });
        setPaidAmount((prev) => Number((prev + result.amountPaid).toFixed(2)));
        setSelectedItemIds(new Set());
        setFeedback({
          type: "success",
          message: `Pagamento parcial de ${formatCurrency(result.amountPaid)} registrado.`,
        });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao registrar pagamento parcial.",
        });
      }
    });
  };

  const handleCriarReserva = () => {
    if (!reservaForm.customerName || !reservaForm.scheduledFor) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const reserva = await criarReservaAction({
          slug,
          customerName: reservaForm.customerName,
          customerPhone: reservaForm.customerPhone,
          partySize: reservaForm.partySize,
          scheduledFor: reservaForm.scheduledFor,
          diningTableId: reservaForm.diningTableId || undefined,
          notes: reservaForm.notes,
        });
        setReservations((prev) => [...prev, reserva]);
        setReservaForm({
          customerName: "",
          customerPhone: "",
          partySize: 2,
          scheduledFor: "",
          diningTableId: "",
          notes: "",
        });
        setFeedback({ type: "success", message: "Reserva criada com sucesso." });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao criar reserva.",
        });
      }
    });
  };

  const handleAdicionarFila = () => {
    if (!filaForm.customerName) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const entry = await adicionarClienteFilaAction({
          slug,
          customerName: filaForm.customerName,
          partySize: filaForm.partySize,
        });
        setQueue((prev) => [...prev, entry]);
        setFilaForm({ customerName: "", partySize: 2 });
        setFeedback({ type: "success", message: `${filaForm.customerName} adicionado(a) a fila.` });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao adicionar a fila.",
        });
      }
    });
  };

  const handleAcomodarFila = (entryId: string, tableId: string) => {
    startTransition(async () => {
      try {
        await atualizarStatusFilaAction({ slug, entryId, status: "SEATED", diningTableId: tableId });
        setQueue((prev) => prev.filter((e) => e.id !== entryId));
        setIsFilaOpen(false);
        setSelectedTableId(tableId);
        setFeedback({ type: "success", message: "Cliente acomodado. Abra a mesa para iniciar a comanda." });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao acomodar cliente.",
        });
      }
    });
  };

  const handleAbrirComandaAvulsa = () => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await abrirComandaAvulsaAction({
          slug,
          customerName: avulsaCustomerName || undefined,
          barcode: avulsaBarcode || undefined,
        });
        if (result.comanda) {
          setComandasAvulsas((prev) => [
            ...prev,
            { ...result.comanda, order: result.order ?? null },
          ]);
          setSelectedAvulsaId(result.comanda.id);
        }
        setAvulsaCustomerName("");
        setAvulsaBarcode("");
        setFeedback({
          type: "success",
          message: `Comanda #${result.comanda?.numero} aberta.`,
        });
      } catch (e) {
        setFeedback({
          type: "error",
          message: e instanceof Error ? e.message : "Erro ao abrir comanda avulsa.",
        });
      }
    });
  };

  // ── Product panel (shared between mesas and avulsas) ───────────────────
  const activeOrderForProducts =
    mainView === "MESAS" ? selectedMesa?.currentOrder : selectedAvulsa?.order;

  const ProductPanel = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Lancar itens</CardTitle>
        <CardDescription>Toque para enviar para a comanda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-11"
          />
        </div>

        <Tabs value={selectedProductCategory} onValueChange={setSelectedProductCategory}>
          <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
            {productCategories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center">
            <p className="text-sm font-medium text-slate-900">Nenhum produto encontrado</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                  </div>
                  <Badge
                    variant={
                      product.trackInventory
                        ? product.stockQuantity > 0
                          ? "success"
                          : "danger"
                        : "secondary"
                    }
                    className="shrink-0 text-xs"
                  >
                    {product.trackInventory ? `Est. ${String(product.stockQuantity)}` : "Livre"}
                  </Badge>
                  <p className="w-20 shrink-0 text-right font-display text-sm font-semibold">
                    {formatCurrency(product.price)}
                  </p>
                  <Button
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={
                      isPending || (product.trackInventory && product.stockQuantity <= 0)
                    }
                    onClick={() => handleAddProduct(product.id)}
                  >
                    <PlusIcon size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  return (
    <section className="space-y-4">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <Card className="border-white/80 bg-white/85">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="w-fit" variant="secondary">
              Comanda digital
            </Badge>
            <CardTitle className="mt-2 font-display text-xl">
              Salao de {restaurantName}
            </CardTitle>
            <CardDescription>
              Controle de mesas, comandas avulsas e fila de espera em tempo real.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFilaOpen(true)}>
              <ClockIcon size={14} />
              Fila de espera
              {queue.length > 0 && (
                <Badge variant="warning" className="ml-1 text-xs">
                  {queue.length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsReservasOpen(true)}>
              <UsersRoundIcon size={14} />
              Reservas
              {todayReservations.length > 0 && (
                <Badge variant="danger" className="ml-1 text-xs">
                  {todayReservations.length}
                </Badge>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ── Stats row ───────────────────────────────────────────────── */}
      <div className="grid gap-2 sm:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mesas livres</p>
            <p className="mt-1 font-display text-xl">{String(freeTables)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-950 text-white">
          <CardContent className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mesas ocupadas</p>
            <p className="mt-1 font-display text-xl">{String(occupiedTables)}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Itens na mesa</p>
            <p className="mt-1 font-display text-xl">{String(selectedOrderItemsCount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-700">Na fila</p>
            <p className="mt-1 font-display text-xl">{String(queue.length)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main view tabs ──────────────────────────────────────────── */}
      <Tabs value={mainView} onValueChange={(v) => setMainView(v as MainView)}>
        <TabsList>
          <TabsTrigger value="MESAS" className="gap-1.5">
            <LayoutGridIcon size={14} />
            Mesas
          </TabsTrigger>
          <TabsTrigger value="COMANDAS_AVULSAS" className="gap-1.5">
            <QrCodeIcon size={14} />
            Comandas avulsas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mainView === "MESAS" ? (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* ── Table list / map sidebar ────────────────────────────── */}
          <Card className="xl:sticky xl:top-4 xl:self-start">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Mesas</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={salonView === "LISTA" ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSalonView("LISTA")}
                    title="Lista"
                  >
                    <ListIcon size={14} />
                  </Button>
                  <Button
                    variant={salonView === "MAPA" ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSalonView("MAPA")}
                    title="Mapa"
                  >
                    <MapIcon size={14} />
                  </Button>
                </div>
              </div>
              <CardDescription>Toque em uma mesa para operar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs
                value={tableFilter}
                onValueChange={(v) => setTableFilter(v as TableFilter)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="TODAS" className="flex-1 text-xs">
                    Todas ({String(tables.length)})
                  </TabsTrigger>
                  <TabsTrigger value="LIVRES" className="flex-1 text-xs">
                    Livres ({String(freeTables)})
                  </TabsTrigger>
                  <TabsTrigger value="OCUPADAS" className="flex-1 text-xs">
                    Ocupadas ({String(occupiedTables)})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* ── Color legend ──────────────────────────────────── */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm border border-slate-200 bg-white" />
                  Livre
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm border border-blue-400 bg-blue-50" />
                  Ocupada
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-50" />
                  Aguard. pedido
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm border border-orange-400 bg-orange-50" />
                  Reservada
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm border border-emerald-400 bg-emerald-50" />
                  Fechando conta
                </span>
              </div>

              {salonView === "MAPA" ? (
                /* ── Map view ──────────────────────────────────────── */
                <div
                  className="relative overflow-auto rounded-xl border bg-slate-50"
                  style={{ minHeight: "280px" }}
                >
                  <div className="relative" style={{ width: "600px", height: "400px" }}>
                    {displayedTables.map((mesa) => {
                      const colorClass = getMesaColor(mesa, reservedTableIds);
                      const isSelected = selectedTableId === mesa.table.id;
                      const x = (mesa.table.positionX ?? 0) || (mesa.table.displayOrder * 80) % 520 + 20;
                      const y = (mesa.table.positionY ?? 0) || Math.floor((mesa.table.displayOrder * 80) / 520) * 90 + 20;
                      return (
                        <button
                          key={mesa.table.id}
                          type="button"
                          onClick={() => setSelectedTableId(mesa.table.id)}
                          style={{ left: x, top: y }}
                          className={`absolute flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 text-xs font-medium transition ${colorClass} ${
                            isSelected ? "ring-2 ring-primary ring-offset-1" : ""
                          }`}
                        >
                          <span className="truncate text-[10px] font-bold leading-tight">
                            {mesa.table.name}
                          </span>
                          {mesa.currentOrder && (
                            <span className="text-[9px] leading-tight">
                              {formatCurrency(mesa.currentOrder.total)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ── List view ─────────────────────────────────────── */
                <div className="grid grid-cols-2 gap-2">
                  {displayedTables.map((mesa) => {
                    const colorClass = getMesaColor(mesa, reservedTableIds);
                    return (
                      <button
                        key={mesa.table.id}
                        type="button"
                        onClick={() => setSelectedTableId(mesa.table.id)}
                        className={`rounded-2xl border p-3 text-left transition ${colorClass} ${
                          selectedTableId === mesa.table.id
                            ? "ring-2 ring-primary ring-offset-1"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{mesa.table.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {String(mesa.table.seats)} lugares
                            </p>
                          </div>
                          <Badge
                            variant={getMesaStatusBadgeVariant(mesa, reservedTableIds)}
                            className="shrink-0 text-xs"
                          >
                            {getMesaStatusLabel(mesa, reservedTableIds)}
                          </Badge>
                        </div>
                        {mesa.currentOrder ? (
                          <p className="mt-2 text-xs font-medium text-slate-900">
                            {formatCurrency(mesa.currentOrder.total)}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">Pronta para abrir</p>
                        )}
                      </button>
                    );
                  })}

                  {displayedTables.length === 0 && (
                    <div className="col-span-2 rounded-xl border border-dashed py-6 text-center">
                      <p className="text-sm text-muted-foreground">Nenhuma mesa neste filtro.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Main panel ─────────────────────────────────────────── */}
          <div className="space-y-4">
            {selectedMesa ? (
              <>
                {/* Selected table header */}
                <Card className="border-white/80 bg-slate-950 text-white">
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <Badge
                          variant="secondary"
                          className="w-fit bg-white/10 text-white"
                        >
                          {selectedMesa.currentOrder ? "Mesa em atendimento" : "Mesa livre"}
                        </Badge>
                        <CardTitle className="mt-2 font-display text-xl">
                          {selectedMesa.table.name}
                        </CardTitle>
                        <CardDescription className="text-slate-300">
                          {selectedMesa.currentOrder
                            ? `Comanda aberta em ${formatDateTime(selectedMesa.currentOrder.createdAt)}`
                            : "Abra a mesa para comecar a lancar itens."}
                        </CardDescription>

                        {selectedMesa.currentOrder && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                              onClick={() => { setTargetTableId(""); setIsTransferOpen(true); }}
                              disabled={isPending}
                            >
                              <ArrowLeftRightIcon size={13} />
                              Transferir mesa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                              onClick={() => { setItemTransferSelectedIds(new Set()); setIsItemTransferOpen(true); }}
                              disabled={isPending}
                            >
                              <ScissorsIcon size={13} />
                              Transferir itens
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                              onClick={() => { setMergeSecondaryOrderId(null); setIsMergeOpen(true); }}
                              disabled={isPending}
                            >
                              <GitMergeIcon size={13} />
                              Unir mesas
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Status
                          </p>
                          <p className="mt-1.5 text-sm font-medium text-white">
                            {selectedMesa.currentOrder ? "Em aberto" : "Aguardando abertura"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Total atual
                          </p>
                          <p className="mt-1 font-display text-xl font-semibold">
                            {formatCurrency(selectedMesa.currentOrder?.total ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {!selectedMesa.currentOrder ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Abrir mesa</CardTitle>
                      <CardDescription>Registre um nome e inicie a comanda.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="max-w-md">
                        <label className="mb-2 block text-sm font-medium">
                          Nome do cliente ou referencia
                        </label>
                        <Input
                          value={openingCustomerName}
                          onChange={(e) => setOpeningCustomerName(e.target.value)}
                          placeholder="Ex.: Ana, familia Silva, aniversario"
                        />
                      </div>
                      <Button disabled={isPending} onClick={handleOpenTable}>
                        {isPending ? (
                          <>
                            <Loader2Icon className="animate-spin" size={16} />
                            Abrindo...
                          </>
                        ) : (
                          "Abrir comanda"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
                    <ProductPanel />

                    {/* Bill panel */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle>Conta da mesa</CardTitle>
                          <CardDescription>Itens lancados e opcoes de pagamento.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-lg border bg-slate-50 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Cliente
                            </p>
                            <p className="mt-0.5 text-sm font-medium text-slate-950">
                              {selectedMesa.currentOrder.customerName}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            {selectedMesa.currentOrder.orderProducts.length === 0 ? (
                              <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center">
                                <p className="text-sm font-medium text-slate-900">
                                  Nenhum item lancado ainda
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs text-muted-foreground">
                                  Marque itens para divisao parcial
                                </p>
                                {selectedMesa.currentOrder.orderProducts.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition ${
                                      selectedItemIds.has(item.id)
                                        ? "border-amber-300 bg-amber-50"
                                        : "border-border bg-slate-50/80"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.has(item.id)}
                                      onChange={() => toggleSelectedItem(item.id)}
                                      disabled={isPending}
                                      className="h-4 w-4 shrink-0 cursor-pointer rounded accent-amber-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-slate-950">
                                        {item.product.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {String(item.quantity)} × {formatCurrency(item.price)}
                                      </p>
                                      {item.notes && (
                                        <p className="mt-0.5 text-xs italic text-amber-600/80">
                                          {item.notes}
                                        </p>
                                      )}
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold text-slate-950">
                                      {formatCurrency(item.lineTotal)}
                                    </p>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>

                          <div className="rounded-xl border bg-slate-950 p-3 text-white">
                            <div className="flex items-center justify-between text-xs text-slate-300">
                              <span>Itens lancados</span>
                              <span>{String(selectedOrderItemsCount)} unidades</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-sm font-medium">Total da conta</span>
                              <span className="font-display text-xl font-semibold">
                                {formatCurrency(selectedMesa.currentOrder.total)}
                              </span>
                            </div>
                          </div>

                          {selectedMesa.currentOrder.orderProducts.length > 0 && (
                            <div className="space-y-3 rounded-xl border p-3">
                              <div className="flex items-center gap-1.5">
                                <ScissorsIcon size={13} className="text-muted-foreground" />
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Opcoes de divisao
                                </p>
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-medium">
                                  Dividir por pessoas
                                </label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={divisaoPessoas}
                                    onChange={(e) =>
                                      setDivisaoPessoas(Math.max(1, Number(e.target.value) || 1))
                                    }
                                    className="h-8 w-20 text-center"
                                  />
                                  <span className="text-xs text-muted-foreground">pessoas</span>
                                  <span className="ml-auto text-sm font-semibold text-slate-900">
                                    {formatCurrency(valorPorPessoa)} / pessoa
                                  </span>
                                </div>
                              </div>

                              {selectedItemIds.size > 0 ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-amber-800">
                                      {selectedItemIds.size} item(s) selecionado(s)
                                    </span>
                                    <span className="text-sm font-semibold text-amber-900">
                                      {formatCurrency(selectedItemsTotal)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-amber-700">
                                    Registra pagamento parcial sem encerrar a comanda.
                                  </p>
                                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                    <Button
                                      size="sm"
                                      disabled={isPending}
                                      onClick={() => handlePagamentoParcial("DINHEIRO")}
                                      className="gap-1.5"
                                    >
                                      <BanknoteIcon size={13} />
                                      Parcial dinheiro
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isPending}
                                      onClick={() => handlePagamentoParcial("CARTAO_PRESENCIAL")}
                                      className="gap-1.5"
                                    >
                                      <CreditCardIcon size={13} />
                                      Parcial cartao
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Marque itens acima para registrar um pagamento parcial.
                                </p>
                              )}
                            </div>
                          )}

                          {paidAmount > 0 && (
                            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                              <div>
                                <p className="text-xs font-medium text-emerald-800">Ja pago</p>
                                <p className="font-display text-base font-semibold text-emerald-700">
                                  {formatCurrency(paidAmount)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium text-slate-700">
                                  Saldo restante
                                </p>
                                <p className="font-display text-lg font-semibold text-slate-900">
                                  {formatCurrency(remainingAmount)}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              disabled={isPending}
                              onClick={() => handleCloseBill("DINHEIRO")}
                            >
                              <BanknoteIcon size={15} />
                              Fechar em dinheiro
                            </Button>
                            <Button
                              disabled={isPending}
                              variant="outline"
                              onClick={() => handleCloseBill("CARTAO_PRESENCIAL")}
                            >
                              <CreditCardIcon size={15} />
                              Fechar no cartao
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <UsersRoundIcon className="text-slate-400" size={28} />
                  <p className="font-medium text-slate-900">Nenhuma mesa cadastrada</p>
                  <p className="text-sm text-muted-foreground">
                    Cadastre mesas no banco para comecar a operar a comanda digital.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* ── Comandas Avulsas View ──────────────────────────────────── */
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* Sidebar */}
          <Card className="xl:sticky xl:top-4 xl:self-start">
            <CardHeader className="pb-3">
              <CardTitle>Comandas avulsas</CardTitle>
              <CardDescription>
                Digitar ou escanear o numero/codigo para abrir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Barcode / number lookup */}
              <div className="relative">
                <QrCodeIcon
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <Input
                  ref={barcodeRef}
                  value={avulsaBarcodeInput}
                  onChange={(e) => setAvulsaBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const found = comandasAvulsas.find(
                        (c) =>
                          c.barcode === avulsaBarcodeInput ||
                          String(c.numero) === avulsaBarcodeInput,
                      );
                      if (found) setSelectedAvulsaId(found.id);
                      setAvulsaBarcodeInput("");
                    }
                  }}
                  placeholder="Numero ou codigo de barras..."
                  className="pl-9"
                />
              </div>

              {/* Open new avulsa */}
              <div className="space-y-2 rounded-xl border p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Nova comanda
                </p>
                <Input
                  value={avulsaCustomerName}
                  onChange={(e) => setAvulsaCustomerName(e.target.value)}
                  placeholder="Nome do cliente (opcional)"
                />
                <Input
                  value={avulsaBarcode}
                  onChange={(e) => setAvulsaBarcode(e.target.value)}
                  placeholder="Codigo de barras/QR (opcional)"
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isPending}
                  onClick={handleAbrirComandaAvulsa}
                >
                  {isPending ? <Loader2Icon className="animate-spin" size={14} /> : <PlusIcon size={14} />}
                  Abrir comanda
                </Button>
              </div>

              {/* Active avulsas list */}
              <div className="space-y-1.5">
                {comandasAvulsas.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhuma comanda avulsa ativa.
                  </p>
                ) : (
                  comandasAvulsas.map((comanda) => (
                    <button
                      key={comanda.id}
                      type="button"
                      onClick={() => setSelectedAvulsaId(comanda.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedAvulsaId === comanda.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Comanda #{comanda.numero}</p>
                        <Badge variant="warning" className="text-xs">
                          Ativa
                        </Badge>
                      </div>
                      {comanda.customerName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{comanda.customerName}</p>
                      )}
                      <p className="mt-1 text-sm font-medium">
                        {formatCurrency(comanda.order?.total ?? 0)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Avulsa detail */}
          <div className="space-y-4">
            {selectedAvulsa ? (
              <>
                <Card className="border-white/80 bg-slate-950 text-white">
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit bg-white/10 text-white">
                      Comanda avulsa
                    </Badge>
                    <CardTitle className="mt-2 font-display text-xl">
                      Comanda #{selectedAvulsa.numero}
                      {selectedAvulsa.customerName && ` — ${selectedAvulsa.customerName}`}
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Aberta em {formatDateTime(selectedAvulsa.createdAt)}
                      {selectedAvulsa.barcode && ` · Codigo: ${selectedAvulsa.barcode}`}
                    </CardDescription>
                    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 w-fit">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
                      <p className="mt-1 font-display text-xl font-semibold">
                        {formatCurrency(selectedAvulsa.order?.total ?? 0)}
                      </p>
                    </div>
                  </CardHeader>
                </Card>

                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <ProductPanel />

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Itens da comanda</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!selectedAvulsa.order || selectedAvulsa.order.orderProducts.length === 0 ? (
                        <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center">
                          <p className="text-sm font-medium text-slate-900">Nenhum item ainda</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedAvulsa.order.orderProducts.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2.5 rounded-lg border bg-slate-50/80 px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {String(item.quantity)} × {formatCurrency(item.price)}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-semibold">
                                {formatCurrency(item.lineTotal)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          disabled={isPending || !selectedAvulsa.order}
                          onClick={() => handleCloseAvulsaBill("DINHEIRO")}
                        >
                          <BanknoteIcon size={15} />
                          Fechar dinheiro
                        </Button>
                        <Button
                          disabled={isPending || !selectedAvulsa.order}
                          variant="outline"
                          onClick={() => handleCloseAvulsaBill("CARTAO_PRESENCIAL")}
                        >
                          <CreditCardIcon size={15} />
                          Fechar cartao
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <QrCodeIcon className="text-slate-400" size={28} />
                  <p className="font-medium text-slate-900">Selecione ou abra uma comanda</p>
                  <p className="text-sm text-muted-foreground">
                    Escaneie o codigo ou abra uma nova comanda avulsa ao lado.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback ────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* ── Transfer mesa dialog ─────────────────────────────────────── */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transferir mesa inteira</DialogTitle>
            <DialogDescription>
              Move todos os itens e a comanda para outra mesa livre.
            </DialogDescription>
          </DialogHeader>
          {transferTargetTables.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma mesa livre disponivel.
            </p>
          ) : (
            <Select value={targetTableId} onValueChange={setTargetTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a mesa destino..." />
              </SelectTrigger>
              <SelectContent>
                {transferTargetTables.map((m) => (
                  <SelectItem key={m.table.id} value={m.table.id}>
                    {m.table.name} — {String(m.table.seats)} lugares
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransferirMesa}
              disabled={!targetTableId || isPending || transferTargetTables.length === 0}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" size={14} />
                  Transferindo...
                </>
              ) : (
                "Confirmar transferencia"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Item transfer dialog ────────────────────────────────────── */}
      <Dialog open={isItemTransferOpen} onOpenChange={setIsItemTransferOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transferir itens selecionados</DialogTitle>
            <DialogDescription>
              Selecione os itens e a mesa de destino. Os totais serao recalculados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Itens para transferir
            </p>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {selectedMesa?.currentOrder?.orderProducts.map((item) => (
                <div
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition ${
                    itemTransferSelectedIds.has(item.id)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => toggleItemTransferSelection(item.id)}
                >
                  <input
                    type="checkbox"
                    checked={itemTransferSelectedIds.has(item.id)}
                    onChange={() => toggleItemTransferSelection(item.id)}
                    className="h-4 w-4 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(item.quantity)} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatCurrency(item.lineTotal)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Mesa / comanda destino
              </p>
              <Select
                value={itemTransferTargetOrderId ? String(itemTransferTargetOrderId) : ""}
                onValueChange={(v) => setItemTransferTargetOrderId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a mesa destino..." />
                </SelectTrigger>
                <SelectContent>
                  {tables
                    .filter(
                      (m) =>
                        m.currentOrder &&
                        m.table.id !== selectedMesa?.table.id,
                    )
                    .map((m) => (
                      <SelectItem key={m.table.id} value={String(m.currentOrder!.id)}>
                        {m.table.name} — {formatCurrency(m.currentOrder!.total)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsItemTransferOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleItemTransfer}
              disabled={
                itemTransferSelectedIds.size === 0 ||
                !itemTransferTargetOrderId ||
                isPending
              }
            >
              {isPending ? (
                <Loader2Icon className="animate-spin" size={14} />
              ) : (
                `Transferir ${String(itemTransferSelectedIds.size)} item(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Merge tables dialog ─────────────────────────────────────── */}
      <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unir mesas</DialogTitle>
            <DialogDescription>
              Todos os itens da mesa selecionada serao movidos para {selectedMesa?.table.name}.
              A mesa secundaria sera liberada.
            </DialogDescription>
          </DialogHeader>

          {mergeTargetOrders.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma outra mesa ocupada disponivel para unir.
            </p>
          ) : (
            <Select
              value={mergeSecondaryOrderId ? String(mergeSecondaryOrderId) : ""}
              onValueChange={(v) => setMergeSecondaryOrderId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a mesa a incorporar..." />
              </SelectTrigger>
              <SelectContent>
                {mergeTargetOrders.map((m) => (
                  <SelectItem key={m.table.id} value={String(m.currentOrder!.id)}>
                    {m.table.name} — {formatCurrency(m.currentOrder!.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMergeOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleUnirMesas}
              disabled={!mergeSecondaryOrderId || isPending || mergeTargetOrders.length === 0}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" size={14} />
                  Unindo...
                </>
              ) : (
                "Confirmar uniao"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fila de espera drawer ───────────────────────────────────── */}
      <Sheet open={isFilaOpen} onOpenChange={setIsFilaOpen}>
        <SheetContent className="w-full max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Fila de espera</SheetTitle>
            <SheetDescription>
              Gerencie clientes aguardando uma mesa disponivel.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Add to queue form */}
            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Adicionar a fila
              </p>
              <Input
                value={filaForm.customerName}
                onChange={(e) => setFilaForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="Nome do cliente"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Pessoas:</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={filaForm.partySize}
                  onChange={(e) =>
                    setFilaForm((f) => ({ ...f, partySize: Math.max(1, Number(e.target.value)) }))
                  }
                  className="h-8 w-20"
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!filaForm.customerName || isPending}
                onClick={handleAdicionarFila}
              >
                <PlusIcon size={14} />
                Adicionar
              </Button>
            </div>

            {/* Queue list */}
            {queue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Fila vazia. Nenhum cliente aguardando.
              </p>
            ) : (
              <div className="space-y-2">
                {queue.map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">
                          #{entry.position} — {entry.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.partySize} pessoas · Chegou {formatTime(entry.arrivedAt)}
                        </p>
                      </div>
                      <Badge variant="warning" className="text-xs">
                        Aguardando
                      </Badge>
                    </div>
                    {freeTables > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs text-muted-foreground">Acomodar em:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tables
                            .filter((m) => !m.currentOrder)
                            .map((m) => (
                              <Button
                                key={m.table.id}
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={isPending}
                                onClick={() => handleAcomodarFila(entry.id, m.table.id)}
                              >
                                {m.table.name}
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Reservas drawer ─────────────────────────────────────────── */}
      <Sheet open={isReservasOpen} onOpenChange={setIsReservasOpen}>
        <SheetContent className="w-full max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reservas</SheetTitle>
            <SheetDescription>Agenda de reservas do restaurante.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* New reservation form */}
            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Nova reserva
              </p>
              <Input
                value={reservaForm.customerName}
                onChange={(e) => setReservaForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="Nome do cliente *"
              />
              <Input
                value={reservaForm.customerPhone}
                onChange={(e) => setReservaForm((f) => ({ ...f, customerPhone: e.target.value }))}
                placeholder="Telefone"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Pessoas:</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={reservaForm.partySize}
                  onChange={(e) =>
                    setReservaForm((f) => ({
                      ...f,
                      partySize: Math.max(1, Number(e.target.value)),
                    }))
                  }
                  className="h-8 w-20"
                />
              </div>
              <Input
                type="datetime-local"
                value={reservaForm.scheduledFor}
                onChange={(e) => setReservaForm((f) => ({ ...f, scheduledFor: e.target.value }))}
              />
              <Select
                value={reservaForm.diningTableId}
                onValueChange={(v) => setReservaForm((f) => ({ ...f, diningTableId: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Mesa (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((m) => (
                    <SelectItem key={m.table.id} value={m.table.id}>
                      {m.table.name} ({String(m.table.seats)} lugares)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={reservaForm.notes}
                onChange={(e) => setReservaForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observacoes"
              />
              <Button
                size="sm"
                className="w-full"
                disabled={!reservaForm.customerName || !reservaForm.scheduledFor || isPending}
                onClick={handleCriarReserva}
              >
                <PlusIcon size={14} />
                Criar reserva
              </Button>
            </div>

            {/* Reservations list */}
            {reservations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma reserva cadastrada.
              </p>
            ) : (
              <div className="space-y-2">
                {reservations
                  .filter((r) => r.status !== "CANCELLED" && r.status !== "FINISHED")
                  .map((r) => (
                    <div key={r.id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{r.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.partySize} pessoas ·{" "}
                            {formatDateTime(r.scheduledFor)}
                          </p>
                          {r.customerPhone && (
                            <p className="text-xs text-muted-foreground">{r.customerPhone}</p>
                          )}
                          {r.notes && (
                            <p className="mt-0.5 text-xs italic text-muted-foreground">
                              {r.notes}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            r.status === "CONFIRMED"
                              ? "success"
                              : r.status === "PENDING"
                                ? "warning"
                                : "secondary"
                          }
                          className="shrink-0 text-xs"
                        >
                          {r.status === "CONFIRMED"
                            ? "Confirmada"
                            : r.status === "PENDING"
                              ? "Pendente"
                              : r.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {r.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={isPending}
                            onClick={async () => {
                              await atualizarStatusReservaAction({
                                slug,
                                reservaId: r.id,
                                status: "CONFIRMED",
                              });
                              setReservations((prev) =>
                                prev.map((x) =>
                                  x.id === r.id ? { ...x, status: "CONFIRMED" as const } : x,
                                ),
                              );
                            }}
                          >
                            Confirmar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-rose-600"
                          disabled={isPending}
                          onClick={async () => {
                            await atualizarStatusReservaAction({
                              slug,
                              reservaId: r.id,
                              status: "CANCELLED",
                            });
                            setReservations((prev) =>
                              prev.map((x) =>
                                x.id === r.id ? { ...x, status: "CANCELLED" as const } : x,
                              ),
                            );
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default ComandaDigital;
