"use client";

import type {
  MesaComanda,
  PaymentMethod,
  PedidoRecebimento,
  TableReservation,
  WaitingQueueEntry,
  ComandaAvulsaComPedido,
} from "@fsw/db";
import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  CreditCardIcon,
  GitMergeIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
  LogOutIcon,
  MapIcon,
  PlusIcon,
  QrCodeIcon,
  ReceiptTextIcon,
  ScissorsIcon,
  SearchIcon,
  UsersRoundIcon,
  UtensilsCrossedIcon,
  CheckCircle2Icon,
  InfoIcon,
  UserIcon,
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
import { toast } from "sonner";

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
} from "@/app/(dashboard)/comandas/actions";
import { logoutAction } from "@/lib/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
  initialReservations?: TableReservation[];
  initialQueue?: WaitingQueueEntry[];
  initialComandasAvulsas?: ComandaAvulsaComPedido[];
  userName?: string;
  userRole?: string;
  isDedicatedMode?: boolean;
}

type TableFilter = "TODAS" | "LIVRES" | "OCUPADAS" | "RESERVADAS";
type MainView = "MESAS" | "COMANDAS_AVULSAS";
type SalonView = "GRADE" | "MAPA";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Componente Principal ─────────────────────────────────────────────────────

const ComandaDigital = ({
  slug,
  restaurantName,
  initialTables,
  products,
  initialReservations = [],
  initialQueue = [],
  initialComandasAvulsas = [],
  userName,
  userRole,
  isDedicatedMode = false,
}: ComandaDigitalProps) => {
  // ── Estado de Mesas e Visualização ──────────────────────────────────────────
  const [tables, setTables] = useState(initialTables);
  const [mainView, setMainView] = useState<MainView>("MESAS");
  const [salonView, setSalonView] = useState<SalonView>("GRADE");
  const [tableFilter, setTableFilter] = useState<TableFilter>("TODAS");
  const [tableSearch, setTableSearch] = useState("");

  // ── Sheet / Drawer de Comanda Aberta ─────────────────────────────────────────
  const [selectedMesaId, setSelectedMesaId] = useState<string | null>(null);
  const [selectedAvulsaId, setSelectedAvulsaId] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<"CARDAPIO" | "CONTA">("CARDAPIO");

  // ── Fila de Espera e Reservas ───────────────────────────────────────────────
  const [reservations, setReservations] = useState<TableReservation[]>(initialReservations);
  const [queue, setQueue] = useState<WaitingQueueEntry[]>(initialQueue);
  const [comandasAvulsas, setComandasAvulsas] = useState<ComandaAvulsaComPedido[]>(
    initialComandasAvulsas,
  );

  const [isFilaOpen, setIsFilaOpen] = useState(false);
  const [isReservasOpen, setIsReservasOpen] = useState(false);

  // ── Produtos e Busca ────────────────────────────────────────────────────────
  const [selectedProductCategory, setSelectedProductCategory] = useState("TODOS");
  const [searchValue, setSearchValue] = useState("");
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // ── Abertura e Formulários ──────────────────────────────────────────────────
  const [openingCustomerName, setOpeningCustomerName] = useState("");
  const [avulsaCustomerName, setAvulsaCustomerName] = useState("");
  const [avulsaBarcode, setAvulsaBarcode] = useState("");
  const [avulsaBarcodeInput, setAvulsaBarcodeInput] = useState("");

  // ── Diálogos de Mesa ────────────────────────────────────────────────────────
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [targetTableId, setTargetTableId] = useState("");

  const [isItemTransferOpen, setIsItemTransferOpen] = useState(false);
  const [itemTransferTargetOrderId, setItemTransferTargetOrderId] = useState<number | null>(null);
  const [itemTransferSelectedIds, setItemTransferSelectedIds] = useState(new Set<string>());

  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSecondaryOrderId, setMergeSecondaryOrderId] = useState<number | null>(null);

  // ── Divisão e Pagamento Parcial ─────────────────────────────────────────────
  const [divisaoPessoas, setDivisaoPessoas] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set<string>());
  const [paidAmount, setPaidAmount] = useState(0);

  // ── Formulários Fila / Reserva ──────────────────────────────────────────────
  const [reservaForm, setReservaForm] = useState({
    customerName: "",
    customerPhone: "",
    partySize: 2,
    scheduledFor: "",
    diningTableId: "",
    notes: "",
  });
  const [filaForm, setFilaForm] = useState({ customerName: "", partySize: 2 });
  const [filaErrors, setFilaErrors] = useState<Record<string, string>>({});
  const [reservaErrors, setReservaErrors] = useState<Record<string, string>>({});

  // ── Conexão e Transição ─────────────────────────────────────────────────────
  const [socketConnected, setSocketConnected] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deferredSearchValue = useDeferredValue(searchValue);
  const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  // ── Dados Derivados ─────────────────────────────────────────────────────────
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
          .filter((id): id is string => Boolean(id)),
      ),
    [todayReservations],
  );

  const selectedMesa = useMemo(
    () => tables.find((m) => m.table.id === selectedMesaId) ?? null,
    [selectedMesaId, tables],
  );

  const selectedAvulsa = useMemo(
    () => comandasAvulsas.find((c) => c.id === selectedAvulsaId) ?? null,
    [selectedAvulsaId, comandasAvulsas],
  );

  const occupiedTables = tables.filter((m) => m.currentOrder).length;
  const freeTables = tables.length - occupiedTables;

  const filteredTables = useMemo(() => {
    let list = tables;

    if (tableFilter === "LIVRES") {
      list = list.filter((m) => !m.currentOrder);
    } else if (tableFilter === "OCUPADAS") {
      list = list.filter((m) => Boolean(m.currentOrder));
    } else if (tableFilter === "RESERVADAS") {
      list = list.filter((m) => reservedTableIds.has(m.table.id));
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.table.name.toLowerCase().includes(q) ||
          m.currentOrder?.customerName?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [tables, tableFilter, tableSearch, reservedTableIds]);

  const filteredAvulsas = useMemo(() => {
    if (!avulsaBarcodeInput.trim()) return comandasAvulsas;
    const q = avulsaBarcodeInput.toLowerCase().trim();
    return comandasAvulsas.filter(
      (c) =>
        String(c.numero).includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.barcode?.toLowerCase().includes(q),
    );
  }, [comandasAvulsas, avulsaBarcodeInput]);

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

  const activeOrder = selectedMesa?.currentOrder ?? selectedAvulsa?.order ?? null;
  const orderTotal = activeOrder?.total ?? 0;
  const remainingAmount = Math.max(Number((orderTotal - paidAmount).toFixed(2)), 0);

  const selectedItemsTotal = useMemo(
    () =>
      activeOrder?.orderProducts
        .filter((item) => selectedItemIds.has(item.id))
        .reduce((acc, item) => acc + item.lineTotal, 0) ?? 0,
    [activeOrder?.orderProducts, selectedItemIds],
  );

  const valorPorPessoa =
    divisaoPessoas > 0 ? Number((remainingAmount / divisaoPessoas).toFixed(2)) : remainingAmount;

  // ── Buscar Pagamento Parcial ────────────────────────────────────────────────
  useEffect(() => {
    setSelectedItemIds(new Set());
    setDivisaoPessoas(1);
    if (!activeOrder?.id) {
      setPaidAmount(0);
      return;
    }
    let cancelled = false;
    void buscarPagamentosParciaisAction(activeOrder.id).then(({ totalPago }) => {
      if (!cancelled) setPaidAmount(totalPago);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrder?.id]);

  // ── WebSocket Live Sync ─────────────────────────────────────────────────────
  const syncTables = useCallback(async () => {
    const res = await fetch(`/api/comandas/${slug}`, { cache: "no-store" });
    if (!res.ok) return;
    const updated = (await res.json()) as MesaComanda[];
    setTables(updated);
  }, [slug]);

  useEffect(() => {
    const socket = io(websocketUrl, { transports: ["websocket"] });
    const onConnect = () => {
      setSocketConnected(true);
      socket.emit("JOIN_RESTAURANT_ROOM", slug);
    };
    const onDisconnect = () => {
      setSocketConnected(false);
    };
    const onEvent = async (payload: { restaurantSlug: string }) => {
      if (payload.restaurantSlug !== slug) return;
      await syncTables();
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("NEW_ORDER", onEvent);
    socket.on("ORDER_UPDATED", onEvent);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("NEW_ORDER", onEvent);
      socket.off("ORDER_UPDATED", onEvent);
      socket.disconnect();
    };
  }, [slug, syncTables, websocketUrl]);

  // ── Barcode scanner listener para avulsas ───────────────────────────────────
  const barcodeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mainView === "COMANDAS_AVULSAS" && e.key === "Enter" && avulsaBarcodeInput) {
        const found = comandasAvulsas.find(
          (c) => c.barcode === avulsaBarcodeInput || String(c.numero) === avulsaBarcodeInput,
        );
        if (found) {
          setSelectedAvulsaId(found.id);
        }
        setAvulsaBarcodeInput("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [avulsaBarcodeInput, comandasAvulsas, mainView]);

  // ── Funções de Apoio Otimistas ──────────────────────────────────────────────
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

  // ── Ações Operacionais ──────────────────────────────────────────────────────
  const handleOpenTable = () => {
    if (!selectedMesa) return;
    startTransition(async () => {
      try {
        const order = await abrirMesaAction({
          slug,
          diningTableId: selectedMesa.table.id,
          customerName: openingCustomerName,
        });
        updateMesaOrder(order);
        setOpeningCustomerName("");
        toast.success(`${selectedMesa.table.name} aberta com sucesso!`);
        setSheetTab("CARDAPIO");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao abrir mesa.");
      }
    });
  };

  const handleAddProduct = (productId: string) => {
    const order = selectedMesa?.currentOrder ?? selectedAvulsa?.order;
    if (!order) return;
    setRecentlyAddedId(productId);
    setTimeout(() => setRecentlyAddedId(null), 900);

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(35);
    }

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
        const prod = products.find((p) => p.id === productId);
        toast.success(`${prod?.name ?? "Item"} adicionado à comanda!`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao lançar item.");
      }
    });
  };

  const handleCloseBill = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!selectedMesa?.currentOrder) return;
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
        toast.success(
          `Conta da ${selectedMesa.table.name} encerrada — ${formatCurrency(order.total)}.`,
        );
        setSelectedMesaId(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao fechar conta.");
      }
    });
  };

  const handleCloseAvulsaBill = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!selectedAvulsa?.order) return;
    startTransition(async () => {
      try {
        await fecharComandaAvulsaAction({
          slug,
          comandaId: selectedAvulsa.id,
          orderId: selectedAvulsa.order!.id,
          paymentMethod,
        });
        setComandasAvulsas((prev) => prev.filter((c) => c.id !== selectedAvulsaId));
        toast.success(`Comanda #${selectedAvulsa.numero} encerrada com sucesso.`);
        setSelectedAvulsaId(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao fechar comanda avulsa.");
      }
    });
  };

  const handleTransferirMesa = () => {
    if (!selectedMesa?.currentOrder || !targetTableId) return;
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
        setSelectedMesaId(targetTableId);
        setIsTransferOpen(false);
        setTargetTableId("");
        toast.success(`Comanda transferida para ${newTableName}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao transferir mesa.");
      }
    });
  };

  const handleItemTransfer = () => {
    if (!selectedMesa?.currentOrder || !itemTransferTargetOrderId || itemTransferSelectedIds.size === 0)
      return;
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
        toast.success("Itens transferidos com sucesso.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao transferir itens.");
      }
    });
  };

  const handleUnirMesas = () => {
    if (!selectedMesa?.currentOrder || !mergeSecondaryOrderId) return;
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
        toast.success(`Mesas unidas com sucesso na ${selectedMesa.table.name}!`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao unir mesas.");
      }
    });
  };

  const handlePagamentoParcial = (
    paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">,
  ) => {
    if (!activeOrder || selectedItemsTotal <= 0) return;
    const orderId = activeOrder.id;
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
        toast.success(`Pagamento parcial de ${formatCurrency(result.amountPaid)} registrado!`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao registrar pagamento parcial.");
      }
    });
  };

  const handleCriarReserva = () => {
    const newErrors: Record<string, string> = {};
    if (!reservaForm.customerName.trim()) newErrors.customerName = "Informe o nome do cliente.";
    if (!reservaForm.scheduledFor) newErrors.scheduledFor = "Selecione a data e horário.";
    if (!reservaForm.partySize || reservaForm.partySize < 1) newErrors.partySize = "Informe a quantidade.";

    if (Object.keys(newErrors).length > 0) {
      setReservaErrors(newErrors);
      toast.error("Preencha os campos obrigatórios da reserva.");
      return;
    }

    startTransition(async () => {
      try {
        const reserva = await criarReservaAction({
          slug,
          customerName: reservaForm.customerName.trim(),
          customerPhone: reservaForm.customerPhone.trim(),
          partySize: reservaForm.partySize,
          scheduledFor: reservaForm.scheduledFor,
          diningTableId: reservaForm.diningTableId || undefined,
          notes: reservaForm.notes.trim(),
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
        setReservaErrors({});
        setIsReservasOpen(false);
        toast.success("Reserva cadastrada com sucesso!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao cadastrar reserva.");
      }
    });
  };

  const handleAdicionarFila = () => {
    const newErrors: Record<string, string> = {};
    if (!filaForm.customerName.trim()) newErrors.customerName = "Informe o nome do cliente.";
    if (!filaForm.partySize || filaForm.partySize < 1) newErrors.partySize = "Informe a quantidade.";

    if (Object.keys(newErrors).length > 0) {
      setFilaErrors(newErrors);
      toast.error("Preencha os campos obrigatórios da fila.");
      return;
    }

    startTransition(async () => {
      try {
        const entry = await adicionarClienteFilaAction({
          slug,
          customerName: filaForm.customerName.trim(),
          partySize: filaForm.partySize,
        });
        setQueue((prev) => [...prev, entry]);
        setFilaForm({ customerName: "", partySize: 2 });
        setFilaErrors({});
        toast.success(`${entry.customerName} adicionado(a) à fila!`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao adicionar à fila.");
      }
    });
  };

  const handleAcomodarFila = (entryId: string, tableId: string) => {
    startTransition(async () => {
      try {
        await atualizarStatusFilaAction({ slug, entryId, status: "SEATED", diningTableId: tableId });
        setQueue((prev) => prev.filter((e) => e.id !== entryId));
        setIsFilaOpen(false);
        setSelectedMesaId(tableId);
        toast.success("Cliente acomodado na mesa selecionada.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao acomodar cliente.");
      }
    });
  };

  const handleAbrirComandaAvulsa = () => {
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
        toast.success(`Comanda #${result.comanda?.numero} aberta com sucesso!`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao abrir comanda avulsa.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header (matching usuarios-client standard) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <UtensilsCrossedIcon size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Comandas e Mesas
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    socketConnected ? "bg-emerald-600 animate-pulse" : "bg-amber-600",
                  )}
                />
                {socketConnected ? "Ao Vivo" : "Sincronizando"}
              </span>
              {userName && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  <UserIcon size={12} className="text-slate-400" />
                  {userName}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              Lançamentos ágeis de comandas, mesas do salão, divisão de contas e fila de espera.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilaOpen(true)}
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            <ClockIcon size={14} className="text-primary" />
            <span>Fila de Espera</span>
            {queue.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold px-1.5">
                {queue.length}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReservasOpen(true)}
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            <UsersRoundIcon size={14} className="text-primary" />
            <span>Reservas</span>
            {todayReservations.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold px-1.5">
                {todayReservations.length}
              </span>
            )}
          </Button>

          {(isDedicatedMode || userRole === "WAITER") && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (window.confirm("Deseja sair do terminal de comandas?")) {
                  await logoutAction();
                }
              }}
              className="h-10 gap-1.5 rounded-full border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all"
            >
              <LogOutIcon size={14} />
              <span>Sair</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Metric Cards (following the system theme) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Mesas Livres */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Mesas Livres
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary shrink-0">
                <LayoutGridIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {freeTables}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Prontas para atendimento
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Mesas Ocupadas */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Mesas Ocupadas
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary shrink-0">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {occupiedTables}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Comandas ativas no salão
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Comandas Avulsas */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Comandas Avulsas
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary shrink-0">
                <QrCodeIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {comandasAvulsas.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Balcão e avulsas ativas
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Fila de Espera */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Fila de Espera
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary shrink-0">
                <UsersRoundIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {queue.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {queue.length === 1 ? "Cliente aguardando" : "Clientes aguardando"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Sub-Tabs Navigation (Salão vs Comandas Avulsas) ── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-0">
        <div className="flex">
          <button
            type="button"
            onClick={() => setMainView("MESAS")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all",
              mainView === "MESAS"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <LayoutGridIcon size={16} />
            <span>Mesas do Salão</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
              {tables.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainView("COMANDAS_AVULSAS")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all",
              mainView === "COMANDAS_AVULSAS"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <QrCodeIcon size={16} />
            <span>Comandas Avulsas</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
              {comandasAvulsas.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Conteúdo Principal: Mesas do Salão ── */}
      {mainView === "MESAS" && (
        <div className="space-y-4">
          {/* Toolbar de Controle de Mesas */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Filtro em Pílulas */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: "TODAS", label: `Todas (${tables.length})` },
                    { id: "LIVRES", label: `Livres (${freeTables})` },
                    { id: "OCUPADAS", label: `Ocupadas (${occupiedTables})` },
                    { id: "RESERVADAS", label: `Reservadas (${reservedTableIds.size})` },
                  ] as Array<{ id: TableFilter; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTableFilter(tab.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                      tableFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Busca e Alternador de Vista (Grade / Mapa) */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <SearchIcon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Buscar mesa ou cliente..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 bg-slate-50/70 pl-8 pr-8 text-xs focus:bg-white"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => setTableSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>

                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSalonView("GRADE")}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
                      salonView === "GRADE"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                    title="Visualização em Grade"
                  >
                    <LayoutGridIcon size={13} />
                    <span className="hidden sm:inline">Grade</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalonView("MAPA")}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
                      salonView === "MAPA"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                    title="Mapa Visual do Salão"
                  >
                    <MapIcon size={13} />
                    <span className="hidden sm:inline">Mapa</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modo Mapa Visual */}
          {salonView === "MAPA" ? (
            <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4">
                <div
                  className="relative overflow-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                  style={{ minHeight: "360px" }}
                >
                  <div className="relative" style={{ width: "720px", height: "450px" }}>
                    {filteredTables.map((mesa) => {
                      const isOccupied = Boolean(mesa.currentOrder);
                      const isReserved = reservedTableIds.has(mesa.table.id);
                      const isClosing = mesa.currentOrder?.paymentStatus === "PAID";
                      const x =
                        mesa.table.positionX ?? (mesa.table.displayOrder * 90) % 640 + 20;
                      const y =
                        mesa.table.positionY ??
                        Math.floor((mesa.table.displayOrder * 90) / 640) * 100 + 20;

                      return (
                        <button
                          key={mesa.table.id}
                          type="button"
                          onClick={() => setSelectedMesaId(mesa.table.id)}
                          style={{ left: x, top: y }}
                          className={cn(
                            "absolute flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 p-1.5 text-xs font-semibold shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer",
                            isClosing
                              ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                              : isOccupied
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : isReserved
                                  ? "border-amber-400 bg-amber-50 text-amber-900"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                          )}
                        >
                          <span className="truncate text-xs font-bold leading-tight">
                            {mesa.table.name}
                          </span>
                          {mesa.currentOrder ? (
                            <span className="mt-1 font-display text-[11px] font-bold text-primary leading-tight">
                              {formatCurrency(mesa.currentOrder.total)}
                            </span>
                          ) : (
                            <span className="mt-0.5 text-[10px] text-slate-400 font-normal">
                              Livre
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Modo Grade Prática de Mesas */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6">
              {filteredTables.map((mesa) => {
                const isOccupied = Boolean(mesa.currentOrder);
                const isReserved = reservedTableIds.has(mesa.table.id);
                const isClosing = mesa.currentOrder?.paymentStatus === "PAID";
                const itemCount =
                  mesa.currentOrder?.orderProducts.reduce((acc, p) => acc + p.quantity, 0) ?? 0;

                return (
                  <div
                    key={mesa.table.id}
                    onClick={() => setSelectedMesaId(mesa.table.id)}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-2xl border p-3.5 shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-[0.99]",
                      isClosing
                        ? "border-emerald-300 bg-emerald-50/40 hover:border-emerald-400"
                        : isOccupied
                          ? "border-primary/50 bg-primary/[0.02] hover:border-primary ring-1 ring-primary/20"
                          : isReserved
                            ? "border-amber-300 bg-amber-50/40 hover:border-amber-400"
                            : "border-slate-200/90 bg-white hover:border-slate-300",
                    )}
                  >
                    <div>
                      {/* Top Header of Table Card */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-display text-base font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {mesa.table.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 border",
                            isClosing
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : isOccupied
                                ? "bg-primary/10 text-primary border-primary/20"
                                : isReserved
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200",
                          )}
                        >
                          {isClosing
                            ? "Fechando"
                            : isOccupied
                              ? "Ocupada"
                              : isReserved
                                ? "Reservada"
                                : "Livre"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {mesa.table.seats} lugares
                      </p>

                      {/* Middle Table Information */}
                      <div className="my-3 min-h-[42px]">
                        {isOccupied && mesa.currentOrder ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {mesa.currentOrder.customerName || "Em atendimento"}
                            </p>
                            <span className="inline-block text-[10px] text-slate-500">
                              {itemCount} {itemCount === 1 ? "item lançado" : "itens lançados"}
                            </span>
                          </div>
                        ) : isReserved ? (
                          <p className="text-[11px] text-amber-700 font-medium">
                            Reserva agendada hoje
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Disponível para atendimento
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action / Total of Table */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {isOccupied && mesa.currentOrder ? (
                        <>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wide block">
                              Total
                            </span>
                            <span className="font-display text-sm font-bold text-primary">
                              {formatCurrency(mesa.currentOrder.total)}
                            </span>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            Gerenciar
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500 group-hover:text-primary flex items-center gap-1 transition-colors">
                          <PlusIcon size={12} />
                          <span>Abrir Mesa</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredTables.length === 0 && (
            <Card className="border-slate-200/80 bg-white shadow-sm p-12 text-center">
              <LayoutGridIcon size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma mesa encontrada</p>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os termos da busca ou selecionar outro filtro acima.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Conteúdo Principal: Comandas Avulsas ── */}
      {mainView === "COMANDAS_AVULSAS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Formulário Compacto de Abertura e Leitor de Barras (4 cols) */}
            <div className="space-y-4 lg:col-span-4">
              <Card className="border-slate-200/80 bg-white shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <QrCodeIcon size={16} />
                    </div>
                    <div>
                      <h2 className="font-display text-sm font-bold text-slate-900">
                        Nova Comanda Avulsa
                      </h2>
                      <p className="text-xs text-slate-500">
                        Abra com cartão físico ou número sequencial
                      </p>
                    </div>
                  </div>

                  {/* Leitor Rápido de Código de Barras */}
                  <div className="space-y-1.5">
                    <Label htmlFor="avulsa-quick-barcode" className="text-xs font-semibold text-slate-700">
                      Bipar Cartão / Código de Barras
                    </Label>
                    <div className="relative">
                      <QrCodeIcon
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <Input
                        id="avulsa-quick-barcode"
                        ref={barcodeRef}
                        value={avulsaBarcodeInput}
                        onChange={(e) => setAvulsaBarcodeInput(e.target.value)}
                        placeholder="Número ou bipe o cartão..."
                        className="h-10 pl-9 rounded-xl border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Formulário de Abertura */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <Label htmlFor="avulsa-name" className="text-xs font-semibold text-slate-700">
                        Nome do Cliente (Opcional)
                      </Label>
                      <Input
                        id="avulsa-name"
                        value={avulsaCustomerName}
                        onChange={(e) => setAvulsaCustomerName(e.target.value)}
                        placeholder="Ex.: Lucas Balcão"
                        className="h-10 rounded-xl border-slate-200 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="avulsa-card-number" className="text-xs font-semibold text-slate-700">
                        Código do Cartão / Comanda
                      </Label>
                      <Input
                        id="avulsa-card-number"
                        value={avulsaBarcode}
                        onChange={(e) => setAvulsaBarcode(e.target.value)}
                        placeholder="Ex.: 042"
                        className="h-10 rounded-xl border-slate-200 text-xs"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAbrirComandaAvulsa}
                      disabled={isPending}
                      className="w-full h-10 rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
                    >
                      {isPending ? (
                        <Loader2Icon size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <PlusIcon size={14} className="mr-1.5" />
                      )}
                      <span>Abrir Nova Comanda</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista / Grade de Comandas Avulsas Ativas (8 cols) */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredAvulsas.map((comanda) => {
                  const itemCount =
                    comanda.order?.orderProducts.reduce((acc, p) => acc + p.quantity, 0) ?? 0;

                  return (
                    <div
                      key={comanda.id}
                      onClick={() => setSelectedAvulsaId(comanda.id)}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all cursor-pointer hover:border-primary/50 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-display text-base font-bold text-slate-900 group-hover:text-primary transition-colors">
                            Comanda #{comanda.numero}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                            Ativa
                          </span>
                        </div>

                        <div className="my-2 space-y-0.5">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {comanda.customerName || "Cliente do Balcão"}
                          </p>
                          {comanda.barcode && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Cód: {comanda.barcode}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500">
                            {itemCount} {itemCount === 1 ? "item lançado" : "itens lançados"}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wide block">
                            Total
                          </span>
                          <span className="font-display text-sm font-bold text-primary">
                            {formatCurrency(comanda.order?.total ?? 0)}
                          </span>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          Gerenciar
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredAvulsas.length === 0 && (
                <Card className="border-slate-200/80 bg-white shadow-sm p-12 text-center">
                  <QrCodeIcon size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhuma comanda avulsa ativa
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Abra uma comanda avulsa pelo formulário ao lado para começar a lançar itens.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet / Drawer Lateral de Gestão da Comanda (Mesa ou Avulsa) ── */}
      <Sheet
        open={Boolean(selectedMesaId || selectedAvulsaId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMesaId(null);
            setSelectedAvulsaId(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 border-l border-slate-200 bg-white"
        >
          {/* Header do Sheet */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  {selectedMesa ? <LayoutGridIcon size={18} /> : <QrCodeIcon size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-slate-900 leading-tight">
                      {selectedMesa ? selectedMesa.table.name : `Comanda #${selectedAvulsa?.numero}`}
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                        activeOrder
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                    >
                      {activeOrder ? "Em Atendimento" : "Mesa Livre"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {activeOrder?.customerName
                      ? `Cliente: ${activeOrder.customerName}`
                      : selectedMesa
                        ? `${selectedMesa.table.seats} lugares no salão`
                        : "Comanda de balcão"}
                  </p>
                </div>
              </div>
            </div>

            {/* Ações da Mesa (Transferência, Unir) */}
            {selectedMesa && selectedMesa.currentOrder && (
              <div className="flex items-center gap-1.5 pt-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTransferOpen(true)}
                  className="h-7 text-[11px] gap-1 rounded-full border-slate-200 font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ArrowLeftRightIcon size={12} />
                  <span>Transferir Mesa</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsItemTransferOpen(true)}
                  className="h-7 text-[11px] gap-1 rounded-full border-slate-200 font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ScissorsIcon size={12} />
                  <span>Transferir Itens</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMergeOpen(true)}
                  className="h-7 text-[11px] gap-1 rounded-full border-slate-200 font-medium text-slate-700 hover:bg-slate-100"
                >
                  <GitMergeIcon size={12} />
                  <span>Unir Mesas</span>
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Caso a mesa esteja livre, formulário de abertura */}
            {selectedMesa && !selectedMesa.currentOrder ? (
              <Card className="border-slate-200/80 bg-white shadow-sm p-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LayoutGridIcon size={24} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Abrir {selectedMesa.table.name}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">
                    Informe o nome do cliente ou referência para iniciar os lançamentos.
                  </p>
                </div>

                <div className="max-w-sm mx-auto space-y-2">
                  <Input
                    value={openingCustomerName}
                    onChange={(e) => setOpeningCustomerName(e.target.value)}
                    placeholder="Nome do cliente (ex.: Família Silva)"
                    className="h-10 rounded-xl border-slate-200 text-xs text-center"
                  />
                  <Button
                    onClick={handleOpenTable}
                    disabled={isPending}
                    className="w-full h-10 rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
                  >
                    {isPending ? (
                      <Loader2Icon size={14} className="animate-spin mr-1.5" />
                    ) : (
                      <PlusIcon size={14} className="mr-1.5" />
                    )}
                    <span>Abrir Mesa e Iniciar Comanda</span>
                  </Button>
                </div>
              </Card>
            ) : (
              /* Mesa ou Comanda Avulsa Aberta */
              <div className="space-y-4">
                {/* Abas da Comanda: Cardápio (Lançar) vs Conta da Mesa */}
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSheetTab("CARDAPIO")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
                      sheetTab === "CARDAPIO"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    <UtensilsCrossedIcon size={13} />
                    <span>Lançar Produtos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSheetTab("CONTA")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
                      sheetTab === "CONTA"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    <ReceiptTextIcon size={13} />
                    <span>Conta da Mesa</span>
                    <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.2 text-[10px] font-bold">
                      {activeOrder?.orderProducts.reduce((acc, p) => acc + p.quantity, 0) ?? 0}
                    </span>
                  </button>
                </div>

                {/* Aba de Lançamento de Produtos */}
                {sheetTab === "CARDAPIO" && (
                  <div className="space-y-3">
                    {/* Barra de Pesquisa de Produto */}
                    <div className="relative">
                      <SearchIcon
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        placeholder="Buscar produto no cardápio..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="h-10 pl-9 pr-8 rounded-xl border-slate-200 bg-slate-50/70 text-xs focus:bg-white"
                      />
                      {searchValue && (
                        <button
                          type="button"
                          onClick={() => setSearchValue("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <XIcon size={12} />
                        </button>
                      )}
                    </div>

                    {/* Carrossel de Categorias */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {productCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedProductCategory(cat)}
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                            selectedProductCategory === cat
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Lista de Produtos */}
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {filteredProducts.map((product) => {
                        const isRecentlyAdded = recentlyAddedId === product.id;
                        return (
                          <div
                            key={product.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs transition-all hover:border-slate-300"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs text-slate-900 leading-tight">
                                {product.name}
                              </p>
                              {product.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {product.description}
                                </p>
                              )}
                              <div className="mt-1 flex items-center gap-2">
                                <span className="font-display text-xs font-bold text-slate-900">
                                  {formatCurrency(product.price)}
                                </span>
                                {product.trackInventory && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                                    Est. {product.stockQuantity}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              size="icon"
                              disabled={
                                isPending || (product.trackInventory && product.stockQuantity <= 0)
                              }
                              onClick={() => handleAddProduct(product.id)}
                              className={cn(
                                "h-9 w-9 shrink-0 rounded-xl transition-all active:scale-90",
                                isRecentlyAdded
                                  ? "bg-emerald-600 text-white"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90",
                              )}
                            >
                              {isRecentlyAdded ? (
                                <CheckIcon size={16} className="animate-in zoom-in" />
                              ) : (
                                <PlusIcon size={16} />
                              )}
                            </Button>
                          </div>
                        );
                      })}

                      {filteredProducts.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-center">
                          <p className="text-xs text-slate-500">Nenhum produto encontrado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Aba de Conta & Fechamento */}
                {sheetTab === "CONTA" && (
                  <div className="space-y-4">
                    {/* Lista de Itens Lançados */}
                    <Card className="border-slate-200/80 bg-white shadow-sm">
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-slate-900">
                            Itens Lançados na Comanda
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Marque para pagar avulso
                          </span>
                        </div>

                        {!activeOrder || activeOrder.orderProducts.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 space-y-1">
                            <ReceiptTextIcon size={24} className="mx-auto text-slate-300" />
                            <p className="text-xs">Nenhum item lançado ainda.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {activeOrder.orderProducts.map((item) => {
                              const isChecked = selectedItemIds.has(item.id);
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleSelectedItem(item.id)}
                                  className={cn(
                                    "flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all",
                                    isChecked
                                      ? "border-primary bg-primary/[0.04]"
                                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-50",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectedItem(item.id)}
                                    className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                                      {item.productNameSnapshot || item.product.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {item.quantity} × {formatCurrency(item.price)}
                                    </p>
                                    {item.notes && (
                                      <p className="text-[10px] italic text-slate-500">
                                        Obs: {item.notes}
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-display text-xs font-bold text-slate-900 shrink-0">
                                    {formatCurrency(item.lineTotal)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Divisão de Conta Simplificada */}
                    {activeOrder && activeOrder.orderProducts.length > 0 && (
                      <Card className="border-slate-200/80 bg-white shadow-sm">
                        <CardContent className="p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                Divisão de Conta
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Dividir saldo entre pessoas
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setDivisaoPessoas(num)}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold transition-all",
                                    divisaoPessoas === num
                                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                  )}
                                >
                                  {num}x
                                </button>
                              ))}
                            </div>
                          </div>

                          {divisaoPessoas > 1 && (
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 flex items-center justify-between text-xs">
                              <span className="text-slate-600 font-medium">
                                Valor por pessoa ({divisaoPessoas}x):
                              </span>
                              <span className="font-display text-sm font-bold text-primary">
                                {formatCurrency(valorPorPessoa)}
                              </span>
                            </div>
                          )}

                          {/* Pagamento Parcial de Itens Selecionados */}
                          {selectedItemIds.size > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-amber-900 block">
                                  {selectedItemIds.size} item(s) selecionado(s)
                                </span>
                                <span className="text-[11px] text-amber-700 font-semibold">
                                  Total: {formatCurrency(selectedItemsTotal)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => handlePagamentoParcial("DINHEIRO")}
                                  className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                >
                                  Pagar Dinheiro
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => handlePagamentoParcial("CARTAO_PRESENCIAL")}
                                  className="h-7 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                                >
                                  Pagar Cartão
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Resumo Financeiro & Fechamento Total */}
                    <Card className="border-slate-200/80 bg-white shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Total Geral</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(orderTotal)}
                            </span>
                          </div>
                          {paidAmount > 0 && (
                            <div className="flex justify-between text-emerald-700 font-medium">
                              <span>Valor Já Pago</span>
                              <span>-{formatCurrency(paidAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-slate-900 font-bold text-sm">
                            <span>Saldo a Pagar</span>
                            <span className="font-display text-lg text-primary">
                              {formatCurrency(remainingAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Botões de Fechamento */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            disabled={isPending || !activeOrder || remainingAmount <= 0}
                            onClick={() =>
                              selectedMesa
                                ? handleCloseBill("DINHEIRO")
                                : handleCloseAvulsaBill("DINHEIRO")
                            }
                            className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                          >
                            <BanknoteIcon size={16} />
                            <span>Fechar em Dinheiro</span>
                          </Button>

                          <Button
                            disabled={isPending || !activeOrder || remainingAmount <= 0}
                            onClick={() =>
                              selectedMesa
                                ? handleCloseBill("CARTAO_PRESENCIAL")
                                : handleCloseAvulsaBill("CARTAO_PRESENCIAL")
                            }
                            className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs gap-1.5 shadow-sm"
                          >
                            <CreditCardIcon size={16} />
                            <span>Fechar no Cartão</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog: Fila de Espera ── */}
      <Dialog open={isFilaOpen} onOpenChange={setIsFilaOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10">
                <UsersRoundIcon size={22} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Fila de Espera
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gerencie clientes aguardando uma mesa disponível no salão.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Formulário de Adicionar à Fila */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Adicionar Cliente à Fila
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor="fila-nome" className="text-xs font-semibold text-slate-700">
                    Nome do Cliente *
                  </Label>
                  <Input
                    id="fila-nome"
                    value={filaForm.customerName}
                    onChange={(e) => {
                      setFilaForm((f) => ({ ...f, customerName: e.target.value }));
                      if (filaErrors.customerName) setFilaErrors((prev) => ({ ...prev, customerName: "" }));
                    }}
                    placeholder="Ex.: Carlos Silva"
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                  {filaErrors.customerName && (
                    <p className="text-[10px] font-medium text-rose-500">{filaErrors.customerName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fila-pessoas" className="text-xs font-semibold text-slate-700">
                    Pessoas *
                  </Label>
                  <Input
                    id="fila-pessoas"
                    type="number"
                    min={1}
                    max={20}
                    value={filaForm.partySize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFilaForm((f) => ({ ...f, partySize: Math.max(1, val) }));
                      if (filaErrors.partySize) setFilaErrors((prev) => ({ ...prev, partySize: "" }));
                    }}
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAdicionarFila}
                disabled={isPending}
                className="w-full h-9 rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
              >
                {isPending ? (
                  <Loader2Icon size={14} className="animate-spin mr-1.5" />
                ) : (
                  <PlusIcon size={14} className="mr-1.5" />
                )}
                <span>Adicionar à Fila</span>
              </Button>
            </div>

            {/* Lista de Clientes Aguardando */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Clientes na Fila ({queue.length})
                </span>
                {freeTables > 0 && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {freeTables} {freeTables === 1 ? "mesa livre" : "mesas livres"}
                  </span>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <UsersRoundIcon size={28} className="mx-auto text-slate-400 mb-1 opacity-60" />
                  <p className="text-xs font-semibold text-slate-700">Fila vazia</p>
                  <p className="text-[11px] text-slate-500">Nenhum cliente aguardando mesa no momento.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {queue.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                            #{entry.position}
                          </span>
                          <div>
                            <p className="font-semibold text-xs text-slate-800">{entry.customerName}</p>
                            <p className="text-[11px] text-slate-500">
                              {entry.partySize} {entry.partySize === 1 ? "pessoa" : "pessoas"} · Chegou às{" "}
                              {formatTime(entry.arrivedAt)}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                          Aguardando
                        </span>
                      </div>

                      {freeTables > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-500 font-medium">Acomodar na mesa:</span>
                          <div className="flex flex-wrap gap-1">
                            {tables
                              .filter((m) => !m.currentOrder)
                              .map((m) => (
                                <button
                                  key={m.table.id}
                                  type="button"
                                  onClick={() => handleAcomodarFila(entry.id, m.table.id)}
                                  className="h-6 px-2 text-[10px] font-semibold rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-colors"
                                >
                                  {m.table.name}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reservas de Mesas ── */}
      <Dialog open={isReservasOpen} onOpenChange={setIsReservasOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10">
                <ClockIcon size={22} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Reservas de Mesas
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Agenda e controle de reservas do restaurante.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Formulário de Nova Reserva */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Nova Reserva
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="reserva-name" className="text-xs font-semibold text-slate-700">
                    Nome do Cliente *
                  </Label>
                  <Input
                    id="reserva-name"
                    value={reservaForm.customerName}
                    onChange={(e) => {
                      setReservaForm((f) => ({ ...f, customerName: e.target.value }));
                      if (reservaErrors.customerName) setReservaErrors((prev) => ({ ...prev, customerName: "" }));
                    }}
                    placeholder="Ex.: Mariana Souza"
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reserva-phone" className="text-xs font-semibold text-slate-700">
                    Telefone de Contato
                  </Label>
                  <Input
                    id="reserva-phone"
                    value={reservaForm.customerPhone}
                    onChange={(e) => setReservaForm((f) => ({ ...f, customerPhone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reserva-party-size" className="text-xs font-semibold text-slate-700">
                    Pessoas *
                  </Label>
                  <Input
                    id="reserva-party-size"
                    type="number"
                    min={1}
                    max={50}
                    value={reservaForm.partySize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setReservaForm((f) => ({ ...f, partySize: Math.max(1, val) }));
                      if (reservaErrors.partySize) setReservaErrors((prev) => ({ ...prev, partySize: "" }));
                    }}
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reserva-datetime" className="text-xs font-semibold text-slate-700">
                    Data e Horário *
                  </Label>
                  <DatePicker
                    value={reservaForm.scheduledFor}
                    onChange={(_, str) => {
                      setReservaForm((f) => ({ ...f, scheduledFor: str }));
                      if (reservaErrors.scheduledFor) setReservaErrors((prev) => ({ ...prev, scheduledFor: "" }));
                    }}
                    withTime
                    placeholder="Selecione data e hora"
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Mesa Preferencial (Opcional)
                  </Label>
                  <Select
                    value={reservaForm.diningTableId}
                    onValueChange={(v) => setReservaForm((f) => ({ ...f, diningTableId: v }))}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-xs">
                      <SelectValue placeholder="Selecione a mesa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((m) => (
                        <SelectItem key={m.table.id} value={m.table.id}>
                          {m.table.name} ({m.table.seats} lugares)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reserva-notes" className="text-xs font-semibold text-slate-700">
                    Observações
                  </Label>
                  <Input
                    id="reserva-notes"
                    value={reservaForm.notes}
                    onChange={(e) => setReservaForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Ex.: Aniversário, perto da janela"
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleCriarReserva}
                disabled={isPending}
                className="w-full h-9 rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
              >
                {isPending ? (
                  <Loader2Icon size={14} className="animate-spin mr-1.5" />
                ) : (
                  <PlusIcon size={14} className="mr-1.5" />
                )}
                <span>Criar Reserva</span>
              </Button>
            </div>

            {/* Lista de Reservas Ativas */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Reservas Cadastradas ({reservations.filter((r) => r.status !== "CANCELLED" && r.status !== "FINISHED").length})
              </span>

              {reservations.filter((r) => r.status !== "CANCELLED" && r.status !== "FINISHED").length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <ClockIcon size={28} className="mx-auto text-slate-400 mb-1 opacity-60" />
                  <p className="text-xs font-semibold text-slate-700">Nenhuma reserva ativa</p>
                  <p className="text-[11px] text-slate-500">Todas as reservas foram atendidas ou não há agendamentos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {reservations
                    .filter((r) => r.status !== "CANCELLED" && r.status !== "FINISHED")
                    .map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-xs text-slate-800">{r.customerName}</p>
                            <p className="text-[11px] text-slate-500">
                              {r.partySize} {r.partySize === 1 ? "pessoa" : "pessoas"} · {formatDateTime(r.scheduledFor)}
                            </p>
                            {r.customerPhone && (
                              <p className="text-[11px] text-slate-400">Tel: {r.customerPhone}</p>
                            )}
                            {r.notes && (
                              <p className="text-[10px] italic text-slate-600 mt-0.5">
                                Obs: {r.notes}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                              r.status === "CONFIRMED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200",
                            )}
                          >
                            {r.status === "CONFIRMED" ? "Confirmada" : "Pendente"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end gap-1.5">
                          {r.status === "PENDING" && (
                            <button
                              type="button"
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
                                toast.success("Reserva confirmada!");
                              }}
                              className="h-6 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              Confirmar
                            </button>
                          )}
                          <button
                            type="button"
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
                              toast.info("Reserva cancelada.");
                            }}
                            className="h-6 px-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Transferir Mesa Inteira ── */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">
              Transferir Mesa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Move todos os itens e a comanda da mesa atual para outra mesa livre.
            </DialogDescription>
          </DialogHeader>

          {transferTargetTables.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              Nenhuma outra mesa livre disponível no salão.
            </p>
          ) : (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Mesa de Destino</Label>
              <Select value={targetTableId} onValueChange={setTargetTableId}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="Selecione a mesa destino..." />
                </SelectTrigger>
                <SelectContent>
                  {transferTargetTables.map((m) => (
                    <SelectItem key={m.table.id} value={m.table.id}>
                      {m.table.name} ({m.table.seats} lugares)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTransferOpen(false)}
              className="rounded-full border-slate-200 text-xs font-medium text-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleTransferirMesa}
              disabled={!targetTableId || isPending || transferTargetTables.length === 0}
              className="rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
            >
              {isPending ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Transferir Itens Selecionados ── */}
      <Dialog open={isItemTransferOpen} onOpenChange={setIsItemTransferOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">
              Transferir Itens Selecionados
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mova itens específicos da comanda para outra mesa ocupada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <Label className="text-xs font-semibold text-slate-700">
              Selecione os itens a transferir
            </Label>
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {selectedMesa?.currentOrder?.orderProducts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleItemTransferSelection(item.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2 cursor-pointer transition-all",
                    itemTransferSelectedIds.has(item.id)
                      ? "border-primary bg-primary/5"
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={itemTransferSelectedIds.has(item.id)}
                    onChange={() => toggleItemTransferSelection(item.id)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{item.product.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <span className="font-display text-xs font-bold text-slate-900 shrink-0">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700">Mesa de Destino</Label>
              <Select
                value={itemTransferTargetOrderId ? String(itemTransferTargetOrderId) : ""}
                onValueChange={(v) => setItemTransferTargetOrderId(Number(v))}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="Selecione a mesa destino..." />
                </SelectTrigger>
                <SelectContent>
                  {tables
                    .filter((m) => m.currentOrder && m.table.id !== selectedMesa?.table.id)
                    .map((m) => (
                      <SelectItem key={m.table.id} value={String(m.currentOrder!.id)}>
                        {m.table.name} — Total: {formatCurrency(m.currentOrder!.total)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsItemTransferOpen(false)}
              className="rounded-full border-slate-200 text-xs font-medium text-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleItemTransfer}
              disabled={
                itemTransferSelectedIds.size === 0 || !itemTransferTargetOrderId || isPending
              }
              className="rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
            >
              {isPending
                ? "Transferindo..."
                : `Transferir ${itemTransferSelectedIds.size} item(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Unir Mesas ── */}
      <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-slate-900">
              Unir Mesas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Todos os itens da outra mesa serão agrupados na {selectedMesa?.table.name}. A mesa secundária
              será liberada.
            </DialogDescription>
          </DialogHeader>

          {mergeTargetOrders.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              Nenhuma outra mesa ocupada disponível para incorporar.
            </p>
          ) : (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Mesa a Incorporar</Label>
              <Select
                value={mergeSecondaryOrderId ? String(mergeSecondaryOrderId) : ""}
                onValueChange={(v) => setMergeSecondaryOrderId(Number(v))}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="Selecione a mesa..." />
                </SelectTrigger>
                <SelectContent>
                  {mergeTargetOrders.map((m) => (
                    <SelectItem key={m.table.id} value={String(m.currentOrder!.id)}>
                      {m.table.name} — Total: {formatCurrency(m.currentOrder!.total)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMergeOpen(false)}
              className="rounded-full border-slate-200 text-xs font-medium text-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUnirMesas}
              disabled={!mergeSecondaryOrderId || isPending || mergeTargetOrders.length === 0}
              className="rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
            >
              {isPending ? "Unindo..." : "Confirmar União"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComandaDigital;
