"use client";

import type { Courier, OrderStatus, PedidoRecebimento } from "@fsw/db";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeDollarSignIcon,
  BikeIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  InboxIcon,
  Loader2Icon,
  MapPinIcon,
  PackageCheckIcon,
  PrinterIcon,
  ReceiptTextIcon,
  SearchIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import { useTheme } from "@/components/theme-provider";
import { soundNotifier } from "@/lib/sound-notifications";
import { dispatchOrderAction, getCouriersAction } from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PainelPedidosProps {
  slug: string;
  initialOrders: PedidoRecebimento[];
}

interface NovoPedidoEvento {
  orderId: number;
  restaurantSlug: string;
  sentAt: string;
}

interface PedidoAtualizadoEvento extends NovoPedidoEvento {
  status?: string;
  paymentStatus?: string;
}

type ActiveView = "PRODUCAO" | "LOGISTICA" | "HISTORICO" | "GERAL";

export interface KanbanColumnConfig {
  status: OrderStatus;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  theme: {
    headerBg: string;
    headerBorder: string;
    headerBorderTop: string;
    headerTitle: string;
    iconColor: string;
    badgeClass: string;
    dotClass: string;
    columnBg: string;
    columnBorder: string;
    cardBorderLeft: string;
    cardHoverBorder: string;
    idBadgeClass: string;
    advanceButtonClass: string;
    emptyCard: string;
    emptyIcon: string;
  };
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    status: "PENDING",
    title: "Solicitados",
    description: "Pedidos recém-chegados aguardando triagem.",
    icon: InboxIcon,
    theme: {
      headerBg: "bg-gradient-to-br from-amber-50 to-amber-100/60",
      headerBorder: "border-amber-200",
      headerBorderTop: "border-t-[4px] border-t-amber-500",
      headerTitle: "text-amber-950",
      iconColor: "text-amber-600",
      badgeClass: "bg-amber-500 text-white font-bold shadow-xs",
      dotClass: "bg-amber-500 ring-2 ring-amber-200",
      columnBg: "bg-amber-50/20",
      columnBorder: "border-amber-200/60",
      cardBorderLeft: "border-l-[4px] border-l-amber-500",
      cardHoverBorder: "hover:border-amber-300 hover:shadow-md",
      idBadgeClass: "bg-amber-100/90 text-amber-900 border border-amber-300/80 font-mono font-bold",
      advanceButtonClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs",
      emptyCard: "border-amber-200/80 bg-amber-50/40 text-amber-800",
      emptyIcon: "text-amber-500",
    },
  },
  {
    status: "IN_PREPARATION",
    title: "Em produção",
    description: "Pedidos em preparo na cozinha ou montagem.",
    icon: ChefHatIcon,
    theme: {
      headerBg: "bg-gradient-to-br from-blue-50 to-blue-100/60",
      headerBorder: "border-blue-200",
      headerBorderTop: "border-t-[4px] border-t-blue-500",
      headerTitle: "text-blue-950",
      iconColor: "text-blue-600",
      badgeClass: "bg-blue-600 text-white font-bold shadow-xs",
      dotClass: "bg-blue-500 ring-2 ring-blue-200",
      columnBg: "bg-blue-50/20",
      columnBorder: "border-blue-200/60",
      cardBorderLeft: "border-l-[4px] border-l-blue-500",
      cardHoverBorder: "hover:border-blue-300 hover:shadow-md",
      idBadgeClass: "bg-blue-100/90 text-blue-900 border border-blue-300/80 font-mono font-bold",
      advanceButtonClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs",
      emptyCard: "border-blue-200/80 bg-blue-50/40 text-blue-800",
      emptyIcon: "text-blue-500",
    },
  },
  {
    status: "READY_FOR_PICKUP",
    title: "Prontos",
    description: "Finalizados, aguardando retirada ou expedição.",
    icon: PackageCheckIcon,
    theme: {
      headerBg: "bg-gradient-to-br from-teal-50 to-teal-100/60",
      headerBorder: "border-teal-200",
      headerBorderTop: "border-t-[4px] border-t-teal-500",
      headerTitle: "text-teal-950",
      iconColor: "text-teal-600",
      badgeClass: "bg-teal-600 text-white font-bold shadow-xs",
      dotClass: "bg-teal-500 ring-2 ring-teal-200",
      columnBg: "bg-teal-50/20",
      columnBorder: "border-teal-200/60",
      cardBorderLeft: "border-l-[4px] border-l-teal-500",
      cardHoverBorder: "hover:border-teal-300 hover:shadow-md",
      idBadgeClass: "bg-teal-100/90 text-teal-900 border border-teal-300/80 font-mono font-bold",
      advanceButtonClass: "bg-teal-600 hover:bg-teal-700 text-white shadow-xs",
      emptyCard: "border-teal-200/80 bg-teal-50/40 text-teal-800",
      emptyIcon: "text-teal-500",
    },
  },
  {
    status: "OUT_FOR_DELIVERY",
    title: "Em entrega",
    description: "Despachados em rota com o entregador.",
    icon: BikeIcon,
    theme: {
      headerBg: "bg-gradient-to-br from-purple-50 to-purple-100/60",
      headerBorder: "border-purple-200",
      headerBorderTop: "border-t-[4px] border-t-purple-500",
      headerTitle: "text-purple-950",
      iconColor: "text-purple-600",
      badgeClass: "bg-purple-600 text-white font-bold shadow-xs",
      dotClass: "bg-purple-500 ring-2 ring-purple-200",
      columnBg: "bg-purple-50/20",
      columnBorder: "border-purple-200/60",
      cardBorderLeft: "border-l-[4px] border-l-purple-500",
      cardHoverBorder: "hover:border-purple-300 hover:shadow-md",
      idBadgeClass: "bg-purple-100/90 text-purple-900 border border-purple-300/80 font-mono font-bold",
      advanceButtonClass: "bg-purple-600 hover:bg-purple-700 text-white shadow-xs",
      emptyCard: "border-purple-200/80 bg-purple-50/40 text-purple-800",
      emptyIcon: "text-purple-500",
    },
  },
  {
    status: "FINISHED",
    title: "Finalizados",
    description: "Pedidos concluídos e entregues com sucesso.",
    icon: CheckCircle2Icon,
    theme: {
      headerBg: "bg-gradient-to-br from-emerald-50 to-emerald-100/60",
      headerBorder: "border-emerald-200",
      headerBorderTop: "border-t-[4px] border-t-emerald-500",
      headerTitle: "text-emerald-950",
      iconColor: "text-emerald-600",
      badgeClass: "bg-emerald-600 text-white font-bold shadow-xs",
      dotClass: "bg-emerald-500 ring-2 ring-emerald-200",
      columnBg: "bg-emerald-50/20",
      columnBorder: "border-emerald-200/60",
      cardBorderLeft: "border-l-[4px] border-l-emerald-500",
      cardHoverBorder: "hover:border-emerald-300 hover:shadow-md",
      idBadgeClass: "bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 font-mono font-bold",
      advanceButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
      emptyCard: "border-emerald-200/80 bg-emerald-50/40 text-emerald-800",
      emptyIcon: "text-emerald-500",
    },
  },
  {
    status: "CANCELLED",
    title: "Cancelados",
    description: "Pedidos interrompidos ou cancelados.",
    icon: XCircleIcon,
    theme: {
      headerBg: "bg-gradient-to-br from-rose-50 to-rose-100/60",
      headerBorder: "border-rose-200",
      headerBorderTop: "border-t-[4px] border-t-rose-500",
      headerTitle: "text-rose-950",
      iconColor: "text-rose-600",
      badgeClass: "bg-rose-600 text-white font-bold shadow-xs",
      dotClass: "bg-rose-500 ring-2 ring-rose-200",
      columnBg: "bg-rose-50/20",
      columnBorder: "border-rose-200/60",
      cardBorderLeft: "border-l-[4px] border-l-rose-500",
      cardHoverBorder: "hover:border-rose-300 hover:shadow-md",
      idBadgeClass: "bg-rose-100/90 text-rose-900 border border-rose-300/80 font-mono font-bold",
      advanceButtonClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
      emptyCard: "border-rose-200/80 bg-rose-50/40 text-rose-800",
      emptyIcon: "text-rose-500",
    },
  },
];

const VIEW_STATUSES: Record<ActiveView, OrderStatus[]> = {
  PRODUCAO: ["PENDING", "IN_PREPARATION", "READY_FOR_PICKUP"],
  LOGISTICA: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"],
  HISTORICO: ["FINISHED", "CANCELLED"],
  GERAL: [
    "PENDING",
    "IN_PREPARATION",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "FINISHED",
    "CANCELLED",
  ],
};

const getPaymentLabel = (paymentMethod: PedidoRecebimento["paymentMethod"]) => {
  if (paymentMethod === "DINHEIRO") return "Dinheiro";
  if (paymentMethod === "CARTAO_PRESENCIAL") return "Cartão presencial";
  if (paymentMethod === "PIX") return "Pix";
  if (paymentMethod === "VALE_ALIMENTACAO") return "Vale Alimentação";
  if (paymentMethod === "VALE_REFEICAO") return "Vale Refeição";
  if (paymentMethod === "FIADO") return "Fiado";
  if (paymentMethod === "INFINITEPAY") return "InfinitePay";
  return "Mercado Pago";
};

const getPaymentMethodVariant = (
  paymentMethod: PedidoRecebimento["paymentMethod"],
  paymentStatus: PedidoRecebimento["paymentStatus"],
) => {
  if (paymentMethod === "DINHEIRO") return "warning" as const;
  if (paymentMethod === "CARTAO_PRESENCIAL") return "danger" as const;
  if (paymentMethod === "PIX") return paymentStatus === "PAID" ? ("success" as const) : ("secondary" as const);
  return paymentStatus === "PAID" ? ("success" as const) : ("secondary" as const);
};

const getPaymentStatusLabel = (
  paymentStatus: PedidoRecebimento["paymentStatus"],
) => {
  if (paymentStatus === "PAID") return "Pago";
  if (paymentStatus === "FAILED") return "Falhou";
  if (paymentStatus === "REFUNDED") return "Estornado";
  if (paymentStatus === "CANCELLED") return "Cancelado";
  return "Pendente";
};

const getPaymentStatusVariant = (
  paymentStatus: PedidoRecebimento["paymentStatus"],
) => {
  if (paymentStatus === "PAID") return "success" as const;
  if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
    return "danger" as const;
  }

  return "secondary" as const;
};


const getConsumptionLabel = (
  consumptionMethod: PedidoRecebimento["consumptionMethod"],
) => {
  if (consumptionMethod === "DINE_IN") return "No salão";
  if (consumptionMethod === "DELIVERY") return "Entrega";
  return "Para levar";
};

const formatDateTime = (value: Date | string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
};

const getOrderReferenceDate = (order: PedidoRecebimento) => {
  return new Date(order.scheduledFor ?? order.createdAt).getTime();
};

const formatCurrency = (value: number | null) => {
  if (value === null) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getNextStatus = (order: PedidoRecebimento): OrderStatus | null => {
  if (order.status === "PENDING") return "IN_PREPARATION";
  if (order.status === "IN_PREPARATION") return "READY_FOR_PICKUP";

  if (order.status === "READY_FOR_PICKUP") {
    return order.consumptionMethod === "DELIVERY"
      ? "OUT_FOR_DELIVERY"
      : "FINISHED";
  }

  if (order.status === "OUT_FOR_DELIVERY") {
    return "FINISHED";
  }

  return null;
};

const getPreviousStatus = (order: PedidoRecebimento): OrderStatus | null => {
  if (order.status === "IN_PREPARATION") return "PENDING";
  if (order.status === "READY_FOR_PICKUP") return "IN_PREPARATION";
  if (order.status === "OUT_FOR_DELIVERY") return "READY_FOR_PICKUP";

  if (order.status === "FINISHED") {
    return order.consumptionMethod === "DELIVERY"
      ? "OUT_FOR_DELIVERY"
      : "READY_FOR_PICKUP";
  }

  return null;
};

const getNextStatusLabel = (order: PedidoRecebimento): string => {
  if (order.status === "PENDING") return "Iniciar preparo";
  if (order.status === "IN_PREPARATION") return "Marcar pronto";
  if (order.status === "READY_FOR_PICKUP") {
    return order.consumptionMethod === "DELIVERY"
      ? "Despachar"
      : "Concluir pedido";
  }
  if (order.status === "OUT_FOR_DELIVERY") return "Concluir entrega";
  return "Avançar";
};

const isSameCalendarDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

type DateFilterType = "ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "CUSTOM";

const PainelPedidos = ({ slug, initialOrders }: PainelPedidosProps) => {
  const { currentThemeConfig } = useTheme();
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const [orders, setOrders] = useState(initialOrders);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loadingOrderIds, setLoadingOrderIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("PRODUCAO");
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  // Filtro de data
  const [dateFilter, setDateFilter] = useState<DateFilterType>("ALL");
  const [customDate, setCustomDate] = useState<string>("");

  const scrollBoard = (offset: number) => {
    if (boardContainerRef.current) {
      boardContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const [orderToDispatch, setOrderToDispatch] =
    useState<PedidoRecebimento | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [isDispatching, setIsDispatching] = useState(false);

  // Auto-impressão de pedidos ao receber
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [autoPrintMode, setAutoPrintMode] = useState<"DELIVERY" | "PRODUCTION" | "BOTH">("DELIVERY");

  // Refs para evitar problemas de stale closure em callbacks assíncronos e WebSocket
  const autoPrintEnabledRef = useRef(autoPrintEnabled);
  const autoPrintModeRef = useRef(autoPrintMode);
  const knownOrderIdsRef = useRef<Set<number>>(
    new Set(initialOrders.map((o) => o.id))
  );

  useEffect(() => {
    autoPrintEnabledRef.current = autoPrintEnabled;
  }, [autoPrintEnabled]);

  useEffect(() => {
    autoPrintModeRef.current = autoPrintMode;
  }, [autoPrintMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAutoPrint = localStorage.getItem("eey_autoprint_enabled");
      if (savedAutoPrint !== null) {
        const isEnabled = savedAutoPrint === "true";
        setAutoPrintEnabled(isEnabled);
        autoPrintEnabledRef.current = isEnabled;
      }
      const savedMode = localStorage.getItem("eey_autoprint_mode");
      if (savedMode) {
        const mode = savedMode as "DELIVERY" | "PRODUCTION" | "BOTH";
        setAutoPrintMode(mode);
        autoPrintModeRef.current = mode;
      }
    }
  }, []);

  const handleToggleAutoPrint = (enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    autoPrintEnabledRef.current = enabled;
    localStorage.setItem("eey_autoprint_enabled", String(enabled));
    toast.info(enabled ? "Auto-impressão de novos pedidos ativada!" : "Auto-impressão desativada.");
  };

  const handleChangeAutoPrintMode = (mode: "DELIVERY" | "PRODUCTION" | "BOTH") => {
    setAutoPrintMode(mode);
    autoPrintModeRef.current = mode;
    localStorage.setItem("eey_autoprint_mode", mode);
    toast.success(`Via de impressão definida: ${mode === "DELIVERY" ? "Entrega" : mode === "PRODUCTION" ? "Cozinha" : "Ambas as Vias"}`);
  };

  const websocketUrl = (() => {
    const raw = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
    if (!raw) return "http://localhost:4000";
    if (raw.includes("websocket.eeytech.com") && !raw.includes("fswdonalds")) {
      return raw.replace("websocket.eeytech.com", "websocket.fswdonalds.eeytech.com");
    }
    return raw;
  })();

  const syncOrderById = async (orderId: number) => {
    try {
      const response = await fetch(`/api/pedidos/${String(orderId)}`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const order = (await response.json()) as PedidoRecebimento;

      const isNewOrder = !knownOrderIdsRef.current.has(order.id);
      if (isNewOrder) {
        knownOrderIdsRef.current.add(order.id);

        try {
          soundNotifier.playNewOrder();
        } catch { /* ignore */ }

        if (autoPrintEnabledRef.current) {
          setTimeout(() => {
            handlePrint(order, autoPrintModeRef.current);
          }, 400);
        }
      }

      setOrders((currentOrders) => {
        const exists = currentOrders.some((currentOrder) => currentOrder.id === order.id);
        if (!exists) {
          return [order, ...currentOrders];
        }
        return currentOrders.map((currentOrder) =>
          currentOrder.id === order.id ? order : currentOrder,
        );
      });
    } catch (err) {
      console.error("[PainelPedidos] Falha ao sincronizar pedido:", err);
    }
  };

  // Sincronização geral de fallback (se o socket oscilar ou desconectar)
  const syncAllOrders = async () => {
    try {
      const response = await fetch(`/api/pedidos?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as PedidoRecebimento[];
      if (!Array.isArray(data)) return;

      let hasNewOrder = false;
      for (const order of data) {
        if (!knownOrderIdsRef.current.has(order.id)) {
          knownOrderIdsRef.current.add(order.id);
          hasNewOrder = true;
          if (autoPrintEnabledRef.current) {
            handlePrint(order, autoPrintModeRef.current);
          }
        }
      }

      if (hasNewOrder) {
        try {
          soundNotifier.playNewOrder();
        } catch { /* ignore */ }
      }

      setOrders(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const socket = io(websocketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 2,
      reconnectionDelay: 10000,
      timeout: 5000,
    });

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit("JOIN_RESTAURANT_ROOM", slug);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleNewOrder = async (payload: NovoPedidoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      await syncOrderById(payload.orderId);
    };

    const handleOrderUpdated = async (payload: PedidoAtualizadoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      await syncOrderById(payload.orderId);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);
    socket.on("NEW_ORDER", handleNewOrder);
    socket.on("ORDER_UPDATED", handleOrderUpdated);

    getCouriersAction(slug).then(setCouriers);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.off("ORDER_UPDATED", handleOrderUpdated);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, websocketUrl]);

  // Polling automático de segurança para conexão instável
  useEffect(() => {
    const interval = setInterval(() => {
      if (!socketConnected) {
        void syncAllOrders();
      }
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketConnected, slug]);

  const handleOrderPatch = async (
    orderId: number,
    payload: {
      status?: OrderStatus;
      paymentStatus?: PedidoRecebimento["paymentStatus"];
    },
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (
      payload.status === "OUT_FOR_DELIVERY" &&
      order?.consumptionMethod === "DELIVERY"
    ) {
      setOrderToDispatch(order);
      return;
    }

    try {
      setLoadingOrderIds((currentOrderIds) => [...currentOrderIds, orderId]);

      const response = await fetch(`/api/pedidos/${String(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) return;

      const updatedOrder = (await response.json()) as PedidoRecebimento;

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder,
        ),
      );
    } finally {
      setLoadingOrderIds((currentOrderIds) =>
        currentOrderIds.filter((currentOrderId) => currentOrderId !== orderId),
      );
    }
  };

  const handleDispatch = async () => {
    if (!orderToDispatch || !selectedCourierId) return;

    try {
      setIsDispatching(true);
      const result = await dispatchOrderAction(
        orderToDispatch.id,
        selectedCourierId,
      );

      if (result) {
        await syncOrderById(orderToDispatch.id);
        setOrderToDispatch(null);
        setSelectedCourierId("");
      }
    } finally {
      setIsDispatching(false);
    }
  };

  const toggleOrderExpanded = (orderId: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const renderReceiptSection = (order: PedidoRecebimento, isProduction: boolean) => {
    const optionCounts = (item: (typeof order.orderProducts)[number]) => {
      const counts = new Map<string, { name: string; count: number }>();
      if (item.orderProductOptions) {
        for (const opt of item.orderProductOptions) {
          const key = opt.productOptionId || opt.nameSnapshot;
          const existing = counts.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            counts.set(key, { name: opt.nameSnapshot, count: 1 });
          }
        }
      }
      return Array.from(counts.values())
        .map(
          (opt) =>
            `<div style="font-size: 10px; margin-left: 6px; color: #222;">• ${opt.count > 1 ? `${opt.count}x ` : ""}${opt.name}</div>`,
        )
        .join("");
    };

    return `
      <div class="receipt-section">
        <div class="text-center mb-4">
          <h1 class="text-lg font-bold uppercase">${order.restaurant.name}</h1>
          ${!isProduction ? `<p style="font-size: 10px;">CNPJ: 00.000.000/0001-00</p>` : ""}
          <div class="border-t my-2"></div>
          <h2 class="font-bold">${isProduction ? "CUPOM DE PRODUÇÃO" : "CUPOM DE ENTREGA"}</h2>
          <p class="text-xl font-bold">PEDIDO #${order.id}</p>
        </div>

        ${
          !isProduction
            ? `
          <div class="mb-4">
            <p><span class="font-bold">CLIENTE:</span> ${order.customerName}</p>
            <p><span class="font-bold">TEL:</span> ${order.customerPhone}</p>
            <p><span class="font-bold">DATA:</span> ${formatDateTime(order.createdAt)}</p>
            <p><span class="font-bold">MÉTODO:</span> ${
              order.consumptionMethod === "DELIVERY"
                ? "ENTREGA"
                : order.consumptionMethod === "DINE_IN"
                  ? "SALÃO"
                  : "PARA LEVAR"
            }</p>
            ${
              order.consumptionMethod === "DELIVERY" && order.deliveryAddress
                ? `<p><span class="font-bold">ENDEREÇO:</span> ${order.deliveryAddress}</p>`
                : ""
            }
            ${order.notes ? `<p class="italic"><span class="font-bold">OBS:</span> ${order.notes}</p>` : ""}
          </div>
        `
            : ""
        }

        ${
          isProduction && order.notes
            ? `
          <div class="mb-4" style="border: 1px solid black; padding: 4px;">
            <p class="font-bold">OBSERVAÇÕES DO PEDIDO:</p>
            <p>${order.notes}</p>
          </div>
        `
            : ""
        }

        <div class="border-t my-2"></div>

        <div class="mb-4">
          <div class="flex justify-between font-bold">
            <span>ITEM</span>
            <span>QTD</span>
          </div>
          ${order.orderProducts
            .map(
              (item) => `
            <div class="flex justify-between" style="margin-top: 4px;">
              <span class="font-bold">${item.productNameSnapshot || item.product.name}</span>
              <span>${item.quantity}x</span>
            </div>
            ${optionCounts(item)}
            ${item.notes ? `<div style="font-size: 10px; font-style: italic; margin-left: 6px; margin-bottom: 2px;">- Obs: ${item.notes}</div>` : ""}
          `,
            )
            .join("")}
        </div>

        ${
          !isProduction
            ? `
          <div class="border-t my-2"></div>
          <div style="gap: 4px; display: flex; flex-direction: column;">
            <div class="flex justify-between">
              <span>SUBTOTAL</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${
              order.deliveryFee > 0
                ? `
              <div class="flex justify-between">
                <span>TAXA ENTREGA</span>
                <span>${formatCurrency(order.deliveryFee)}</span>
              </div>
            `
                : ""
            }
            ${
              order.discountAmount > 0
                ? `
              <div class="flex justify-between">
                <span>DESCONTO</span>
                <span>-${formatCurrency(order.discountAmount)}</span>
              </div>
            `
                : ""
            }
            <div class="flex justify-between font-bold text-lg" style="padding-top: 4px;">
              <span>TOTAL</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          <div class="border-t my-2"></div>

          <div class="mb-4">
            ${
              order.marketplaceType
                ? `<p><span class="font-bold">CANAL:</span> ${order.marketplaceType === "KEETA" ? "KEETA BRASIL" : order.marketplaceType} ${order.marketplaceOrderId ? `(#${order.marketplaceOrderId})` : ""}</p>`
                : ""
            }
            <p><span class="font-bold">PAGAMENTO:</span> ${
              order.paymentMethod === "DINHEIRO"
                ? "DINHEIRO"
                : order.paymentMethod === "CARTAO_PRESENCIAL"
                  ? "CARTÃO (PRESENCIAL)"
                  : order.paymentMethod === "PIX"
                    ? "PIX"
                    : "ONLINE"
            }</p>
            <p><span class="font-bold">STATUS:</span> ${order.paymentStatus === "PAID" ? "PAGO" : "PENDENTE"}</p>
            ${
              order.paymentMethod === "DINHEIRO" && order.changeFor
                ? `
              <p class="font-bold">TROCO PARA: ${formatCurrency(order.changeFor)}</p>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        <div class="text-center h-20" style="margin-top: 20px; font-size: 10px;">
          <p>Obrigado pela preferência!</p>
          <p>www.eeyfood.com.br</p>
        </div>
      </div>
    `;
  };

  const handlePrint = (
    order: PedidoRecebimento,
    type: "PRODUCTION" | "DELIVERY" | "BOTH",
  ) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const contentHtml =
        type === "PRODUCTION"
          ? renderReceiptSection(order, true)
          : type === "DELIVERY"
            ? renderReceiptSection(order, false)
            : `
              ${renderReceiptSection(order, true)}
              <div style="page-break-after: always; break-after: page; border-top: 2px dashed black; margin: 24px 0; padding-top: 8px; text-align: center; font-size: 10px; font-weight: bold;">
                ✂ - - - - - - CORTE AQUI - - - - - - ✂
              </div>
              ${renderReceiptSection(order, false)}
            `;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Impressão Pedido #${order.id}</title>
            <style>
              @page { margin: 0; size: 80mm auto; }
              body {
                margin: 0;
                padding: 4mm;
                width: 72mm;
                font-family: monospace;
                font-size: 12px;
                line-height: 1.2;
                color: black;
              }
              @media print {
                .receipt-section {
                  page-break-inside: avoid;
                }
              }
              .text-center { text-align: center; }
              .text-xl { font-size: 18px; }
              .text-lg { font-size: 16px; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .border-t { border-top: 1px dashed black; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .italic { font-style: italic; }
              .h-20 { height: 60px; }
            </style>
          </head>
          <body>
            ${contentHtml}
          </body>
        </html>
      `;

      const doc = iframe.contentWindow?.document ?? iframe.contentDocument;
      if (!doc) {
        if (iframe.parentNode) document.body.removeChild(iframe);
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        setTimeout(() => {
          try {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          } catch {
            // ignore
          }
        }, 1500);
      };

      iframe.contentWindow?.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 60000);

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error("[Auto-Print] Erro ao disparar impressão:", err);
          cleanup();
        }
      }, 350);
    } catch (err) {
      console.error("[Auto-Print] Falha geral ao imprimir:", err);
    }
  };

  const handleTestPrint = () => {
    const targetOrder = orders[0];
    if (targetOrder) {
      handlePrint(targetOrder, autoPrintModeRef.current);
      toast.success("Disparando impressão de teste!");
    } else {
      toast.info("Nenhum pedido na lista para testar impressão.");
    }
  };


  const [searchQuery, setSearchQuery] = useState("");

  const orderMatchesDate = (orderCreatedAt: Date | string) => {
    if (dateFilter === "ALL") return true;

    const orderDate = new Date(orderCreatedAt);
    const now = new Date();

    if (dateFilter === "TODAY") {
      return isSameCalendarDay(orderDate, now);
    }

    if (dateFilter === "YESTERDAY") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return isSameCalendarDay(orderDate, yesterday);
    }

    if (dateFilter === "LAST_7_DAYS") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return orderDate >= sevenDaysAgo;
    }

    if (dateFilter === "CUSTOM" && customDate) {
      const [y, m, d] = customDate.split("-").map(Number);
      return (
        orderDate.getFullYear() === y &&
        orderDate.getMonth() === m - 1 &&
        orderDate.getDate() === d
      );
    }

    return true;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!orderMatchesDate(order.createdAt)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          String(order.id).includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          (order.customerPhone && order.customerPhone.includes(q)) ||
          (order.deliveryAddress &&
            order.deliveryAddress.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [orders, dateFilter, customDate, searchQuery]);

  const countToday = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => isSameCalendarDay(new Date(o.createdAt), now)).length;
  }, [orders]);

  const countYesterday = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return orders.filter((o) => isSameCalendarDay(new Date(o.createdAt), yesterday)).length;
  }, [orders]);

  const countLast7Days = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return orders.filter((o) => new Date(o.createdAt) >= sevenDaysAgo).length;
  }, [orders]);

  const isDateFiltered = dateFilter !== "ALL";

  const getDateFilterLabel = () => {
    if (dateFilter === "TODAY") return `Hoje (${countToday})`;
    if (dateFilter === "YESTERDAY") return `Ontem (${countYesterday})`;
    if (dateFilter === "LAST_7_DAYS") return `Últimos 7 dias (${countLast7Days})`;
    if (dateFilter === "CUSTOM" && customDate) {
      const [y, m, d] = customDate.split("-");
      return `${d}/${m}/${y}`;
    }
    return "Todas as datas";
  };

  const countProducao = filteredOrders.filter((o) =>
    VIEW_STATUSES.PRODUCAO.includes(o.status),
  ).length;
  const countLogistica = filteredOrders.filter((o) =>
    VIEW_STATUSES.LOGISTICA.includes(o.status),
  ).length;
  const countHistorico = filteredOrders.filter((o) =>
    VIEW_STATUSES.HISTORICO.includes(o.status),
  ).length;
  const countGeral = filteredOrders.length;

  const activeStatuses = VIEW_STATUSES[activeView];
  const activeColumns = KANBAN_COLUMNS.filter((col) =>
    activeStatuses.includes(col.status),
  );

  const isGeral = activeView === "GERAL";

  return (
    <div className="space-y-4">
      <Dialog
        open={!!orderToDispatch}
        onOpenChange={(open) => !open && setOrderToDispatch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Despachar Pedido #{orderToDispatch?.id}</DialogTitle>
            <DialogDescription>
              Selecione o motoboy que ficará responsável pela entrega para{" "}
              {orderToDispatch?.customerName}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select
              value={selectedCourierId}
              onValueChange={setSelectedCourierId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motoboy" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((courier) => (
                  <SelectItem key={courier.id} value={courier.id}>
                    {courier.name} ({courier.vehicleType ?? "MOTO"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrderToDispatch(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={!selectedCourierId || isDispatching}
              onClick={handleDispatch}
            >
              {isDispatching && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Despacho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <section className="space-y-4">
        <Card className="border-white/80 bg-white/85">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="font-display text-xl">
                Fluxo de pedidos
              </CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Acompanhe o status de cada pedido e avance conforme a produção.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Botão de Configuração de Auto-Impressão seguindo o Theme */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 gap-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs",
                      !autoPrintEnabled &&
                        "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                    style={
                      autoPrintEnabled
                        ? {
                            color: currentThemeConfig.hex,
                            borderColor: `${currentThemeConfig.hex}60`,
                            backgroundColor: `${currentThemeConfig.hex}15`,
                          }
                        : undefined
                    }
                  >
                    <PrinterIcon
                      size={14}
                      style={
                        autoPrintEnabled
                          ? { color: currentThemeConfig.hex }
                          : undefined
                      }
                      className={!autoPrintEnabled ? "text-slate-400" : ""}
                    />
                    <span>
                      {autoPrintEnabled ? "Auto-Print Ativo" : "Auto-Print"}
                    </span>
                    <ChevronDownIcon size={12} className="opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 space-y-2">
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="text-xs font-semibold text-slate-800">
                      Imprimir Novos Pedidos
                    </span>
                    <Switch
                      checked={autoPrintEnabled}
                      onCheckedChange={handleToggleAutoPrint}
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <div className="space-y-1">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Via Padrão
                    </p>
                    <DropdownMenuItem
                      onClick={() => handleChangeAutoPrintMode("DELIVERY")}
                      className={cn(
                        "text-xs justify-between cursor-pointer",
                        autoPrintMode === "DELIVERY" && "font-bold text-slate-900 bg-slate-50",
                      )}
                    >
                      <span>Via Entrega / Cliente</span>
                      {autoPrintMode === "DELIVERY" && (
                        <span style={{ color: currentThemeConfig.hex }}>✓</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleChangeAutoPrintMode("PRODUCTION")}
                      className={cn(
                        "text-xs justify-between cursor-pointer",
                        autoPrintMode === "PRODUCTION" && "font-bold text-slate-900 bg-slate-50",
                      )}
                    >
                      <span>Via Cozinha / Produção</span>
                      {autoPrintMode === "PRODUCTION" && (
                        <span style={{ color: currentThemeConfig.hex }}>✓</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleChangeAutoPrintMode("BOTH")}
                      className={cn(
                        "text-xs justify-between cursor-pointer",
                        autoPrintMode === "BOTH" && "font-bold text-slate-900 bg-slate-50",
                      )}
                    >
                      <span>Ambas (Cozinha + Entrega)</span>
                      {autoPrintMode === "BOTH" && (
                        <span style={{ color: currentThemeConfig.hex }}>✓</span>
                      )}
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleTestPrint}
                    className="text-xs cursor-pointer font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <PrinterIcon size={13} className="text-slate-500" />
                    <span>Testar Impressão</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status badge de sincronização seguindo o Theme */}
              {socketConnected ? (
                <span
                  className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border transition-all shadow-xs select-none"
                  style={{
                    color: currentThemeConfig.hex,
                    borderColor: `${currentThemeConfig.hex}40`,
                    backgroundColor: `${currentThemeConfig.hex}15`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: currentThemeConfig.hex }}
                  />
                  <span>Canal sincronizado</span>
                </span>
              ) : (
                <Badge
                  variant="danger"
                  className="h-8 gap-1.5 px-3 rounded-lg text-xs font-semibold shadow-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Reconectando</span>
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <Tabs
              value={activeView}
              onValueChange={(v) => setActiveView(v as ActiveView)}
              className="w-auto"
            >
              <TabsList className="h-10 p-1 bg-slate-100/90 rounded-xl">
                <TabsTrigger
                  value="PRODUCAO"
                  className="group text-xs sm:text-sm gap-1.5 rounded-lg px-2.5 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all"
                >
                  <span>Operação ativa</span>
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
                    {countProducao}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="LOGISTICA"
                  className="group text-xs sm:text-sm gap-1.5 rounded-lg px-2.5 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all"
                >
                  <span>Logística</span>
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
                    {countLogistica}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="HISTORICO"
                  className="group text-xs sm:text-sm gap-1.5 rounded-lg px-2.5 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all"
                >
                  <span>Histórico</span>
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
                    {countHistorico}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="GERAL"
                  className="group text-xs sm:text-sm gap-1.5 rounded-lg px-2.5 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all"
                >
                  <span>Visão geral</span>
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
                    {countGeral}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            {/* Filtro de Data */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs",
                    !isDateFiltered &&
                      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  style={
                    isDateFiltered
                      ? {
                          color: currentThemeConfig.hex,
                          borderColor: `${currentThemeConfig.hex}60`,
                          backgroundColor: `${currentThemeConfig.hex}15`,
                        }
                      : undefined
                  }
                >
                  <CalendarIcon
                    size={14}
                    style={
                      isDateFiltered
                        ? { color: currentThemeConfig.hex }
                        : undefined
                    }
                    className={!isDateFiltered ? "text-slate-500" : ""}
                  />
                  <span>{getDateFilterLabel()}</span>
                  <ChevronDownIcon size={12} className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 space-y-1.5">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Filtrar por período
                </div>
                <DropdownMenuItem
                  onClick={() => {
                    setDateFilter("TODAY");
                    setCustomDate("");
                  }}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-2",
                    dateFilter === "TODAY" && "font-bold bg-slate-100/80 text-slate-900",
                  )}
                >
                  <span>Hoje</span>
                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-slate-200/80 font-bold text-slate-700">
                    {countToday}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDateFilter("YESTERDAY");
                    setCustomDate("");
                  }}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-2",
                    dateFilter === "YESTERDAY" && "font-bold bg-slate-100/80 text-slate-900",
                  )}
                >
                  <span>Ontem</span>
                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-slate-200/80 font-bold text-slate-700">
                    {countYesterday}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDateFilter("LAST_7_DAYS");
                    setCustomDate("");
                  }}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-2",
                    dateFilter === "LAST_7_DAYS" && "font-bold bg-slate-100/80 text-slate-900",
                  )}
                >
                  <span>Últimos 7 dias</span>
                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-slate-200/80 font-bold text-slate-700">
                    {countLast7Days}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDateFilter("ALL");
                    setCustomDate("");
                  }}
                  className={cn(
                    "flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-2",
                    dateFilter === "ALL" && "font-bold bg-slate-100/80 text-slate-900",
                  )}
                >
                  <span>Todas as datas</span>
                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-slate-200/80 font-bold text-slate-700">
                    {orders.length}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="p-1 space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-600 block">
                    Data específica:
                  </label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomDate(val);
                      if (val) {
                        setDateFilter("CUSTOM");
                      } else {
                        setDateFilter("ALL");
                      }
                    }}
                    className="h-8 text-xs rounded-lg border-slate-200 bg-white"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {isDateFiltered && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  setDateFilter("ALL");
                  setCustomDate("");
                }}
                title="Limpar filtro de data"
              >
                <XIcon size={14} />
              </Button>
            )}

            {/* Barra de busca */}
            <div className="relative w-full sm:w-60">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar #id, cliente, endereço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white pl-8 pr-8 text-xs placeholder:text-slate-400 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Banner de navegação e auxílio visual quando em Visão Geral */}
        {isGeral && (
          <div className="flex items-center justify-between text-xs text-slate-600 bg-white/95 border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-xs">
            <span className="flex items-center gap-2 font-medium">
              <span
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentThemeConfig.hex }}
              />
              <span>
                Visão geral completa (6 etapas) • Role horizontalmente ou use os botões para navegar
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 gap-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs"
                onClick={() => scrollBoard(-360)}
                title="Rolar para a esquerda"
              >
                <ChevronLeftIcon size={13} />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 gap-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs"
                onClick={() => scrollBoard(360)}
                title="Rolar para a direita"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRightIcon size={13} />
              </Button>
            </div>
          </div>
        )}

        {/* Container horizontal com scrollbar estilizada e responsiva */}
        <div
          ref={boardContainerRef}
          className={cn(
            "w-full max-w-full overflow-x-auto pb-4 pt-1",
            isGeral && "scroll-smooth",
            "[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9]",
          )}
        >
          <div
            className={cn(
              isGeral
                ? "flex gap-4 min-w-max pb-1"
                : cn(
                    "grid gap-4",
                    activeColumns.length === 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                  ),
            )}
          >
            {activeColumns.map((column) => {
              const ColumnIcon = column.icon;
              const ordersByColumn = filteredOrders
                .filter((order) => order.status === column.status)
                .sort(
                  (left, right) =>
                    getOrderReferenceDate(left) - getOrderReferenceDate(right),
                );

              return (
                <div
                  key={column.status}
                  className={cn(
                    "flex h-full flex-col gap-3 rounded-2xl p-2.5 transition-colors border",
                    isGeral
                      ? "w-[330px] min-w-[330px] shrink-0"
                      : "w-full min-w-0",
                    column.theme.columnBg,
                    column.theme.columnBorder,
                  )}
                >
                  <Card
                    className={cn(
                      "overflow-hidden shadow-xs border transition-all",
                      column.theme.headerBorderTop,
                      column.theme.headerBorder,
                      column.theme.headerBg,
                    )}
                  >
                    <CardHeader className="space-y-0.5 py-2.5 px-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full shrink-0",
                              column.theme.dotClass,
                            )}
                          />
                          <CardTitle
                            className={cn(
                              "text-sm font-bold tracking-tight truncate",
                              column.theme.headerTitle,
                            )}
                          >
                            {column.title}
                          </CardTitle>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold transition-transform",
                            column.theme.badgeClass,
                          )}
                        >
                          {String(ordersByColumn.length)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                        {column.description}
                      </p>
                    </CardHeader>
                  </Card>

                  {ordersByColumn.length === 0 ? (
                    <Card
                      className={cn(
                        "border-dashed bg-white/70 shadow-none",
                        column.theme.emptyCard,
                      )}
                    >
                      <CardContent className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 p-4 text-center">
                        <ColumnIcon className={cn("opacity-70", column.theme.emptyIcon)} size={22} />
                        <p className="text-xs font-semibold text-slate-700">
                          {searchQuery || isDateFiltered ? "Nenhum pedido encontrado" : "Nenhum pedido nesta etapa"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {searchQuery || isDateFiltered ? "Tente alterar a busca ou o período selecionado" : column.description}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    ordersByColumn.map((order) => {
                      const nextStatus = getNextStatus(order);
                      const previousStatus = getPreviousStatus(order);
                      const isOfflinePayment =
                        order.paymentMethod === "DINHEIRO" ||
                        order.paymentMethod === "CARTAO_PRESENCIAL" ||
                        order.paymentMethod === "PIX";
                      const isLoading = loadingOrderIds.includes(order.id);
                      const isExpanded = expandedOrders.has(order.id);

                      return (
                        <Card
                          key={order.id}
                          className={cn(
                            "border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:shadow-md rounded-xl w-full min-w-0 overflow-hidden",
                            column.theme.cardBorderLeft,
                            column.theme.cardHoverBorder,
                          )}
                        >
                          <div className="p-3.5 space-y-2.5">
                            {/* Linha 1: ID, Marketplace, Impressão e Horário */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span
                                  className={cn(
                                    "rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tracking-tight shadow-2xs shrink-0",
                                    column.theme.idBadgeClass,
                                  )}
                                >
                                  #{String(order.id)}
                                </span>

                                {order.marketplaceType && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-2xs shrink-0",
                                      order.marketplaceType === "IFOOD" && "bg-red-500 text-white shadow-2xs",
                                      order.marketplaceType === "RAPPI" && "bg-orange-500 text-white shadow-2xs",
                                      order.marketplaceType === "KEETA" && "bg-amber-400 text-slate-950 font-extrabold shadow-2xs",
                                      order.marketplaceType === "NINETY_NINE_FOOD" && "bg-yellow-400 text-slate-950 shadow-2xs",
                                    )}
                                  >
                                    {order.marketplaceType === "KEETA" ? "Keeta" : order.marketplaceType === "IFOOD" ? "iFood" : order.marketplaceType === "RAPPI" ? "Rappi" : "99Food"}
                                  </span>
                                )}

                                {/* Ações de Impressão compactas e agrupadas */}
                                <div className="flex items-center rounded-md border border-slate-200/70 bg-slate-50/80 p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePrint(order, "PRODUCTION")}
                                    className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
                                    title="Imprimir Cozinha"
                                  >
                                    <PrinterIcon size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePrint(order, "DELIVERY")}
                                    className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
                                    title="Imprimir Cupom"
                                  >
                                    <ReceiptTextIcon size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Horário de criação */}
                              <span className="text-[11px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
                                <ClockIcon size={11} className="text-slate-400" />
                                {formatDateTime(order.createdAt)}
                              </span>
                            </div>

                            {/* Linha 2: Nome do cliente e Método de consumo */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="min-w-0 flex-1 font-bold text-sm text-slate-900 tracking-tight truncate">
                                  {order.customerName}
                                </h3>
                                <span
                                    className={cn(
                                      "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold border",
                                      order.consumptionMethod === "DELIVERY"
                                        ? "bg-sky-50 text-sky-700 border-sky-200/70"
                                        : order.consumptionMethod === "DINE_IN"
                                          ? "bg-purple-50 text-purple-700 border-purple-200/70"
                                          : "bg-slate-100 text-slate-700 border-slate-200/70",
                                    )}
                                  >
                                    {order.consumptionMethod === "DELIVERY"
                                      ? "Entrega"
                                      : order.consumptionMethod === "DINE_IN"
                                        ? "Salão"
                                        : "Para levar"}
                                  </span>
                              </div>

                              {/* Telefone do cliente se houver */}
                              {order.customerPhone && (
                                <p className="text-[11px] text-slate-500 font-mono">
                                  {order.customerPhone}
                                </p>
                              )}

                              {/* Endereço de entrega se houver */}
                              {order.consumptionMethod === "DELIVERY" && order.deliveryAddress && (
                                <p className="flex items-center gap-1 text-[11px] text-slate-600 line-clamp-1 break-words">
                                  <MapPinIcon size={11} className="shrink-0 text-slate-400" />
                                  <span className="truncate">{order.deliveryAddress}</span>
                                </p>
                              )}

                              {/* Entregador atribuído se houver */}
                              {order.courier && (
                                <p className="flex items-center gap-1 text-[11px] text-cyan-800 font-medium bg-cyan-50 border border-cyan-200/60 rounded px-1.5 py-0.5 w-fit">
                                  <BikeIcon size={11} />
                                  <span>Entregador: {order.courier.name}</span>
                                </p>
                              )}
                            </div>

                            {/* Faixa Financeira & Pagamento Unificada */}
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50/90 border border-slate-100 px-2.5 py-1.5 text-xs">
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className="text-[11px] font-medium text-slate-400 shrink-0">Total:</span>
                                <span className="text-sm font-bold text-slate-900 font-mono shrink-0">
                                  {formatCurrency(order.total)}
                                </span>
                                {order.paymentMethod === "DINHEIRO" && order.changeFor ? (
                                  <span className="text-[10px] text-amber-700 font-medium truncate">
                                    (Troco p/ {formatCurrency(order.changeFor)})
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-medium text-slate-600">
                                  {getPaymentLabel(order.paymentMethod)}
                                </span>
                                {isOfflinePayment && order.paymentStatus !== "PAID" ? (
                                  <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleOrderPatch(order.id, {
                                        paymentStatus: "PAID",
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border border-amber-300 bg-amber-100/90 text-amber-900 hover:bg-amber-200 transition-colors shadow-2xs cursor-pointer"
                                    title="Clique para confirmar recebimento do pagamento"
                                  >
                                    <CreditCardIcon size={10} className="shrink-0 text-amber-800" />
                                    <span>Confirmar pgto</span>
                                  </button>
                                ) : (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border",
                                      order.paymentStatus === "PAID"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                        : order.paymentStatus === "FAILED" || order.paymentStatus === "CANCELLED"
                                          ? "bg-rose-50 text-rose-700 border-rose-200/80"
                                          : "bg-amber-50 text-amber-700 border-amber-200/80",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        order.paymentStatus === "PAID"
                                          ? "bg-emerald-500"
                                          : order.paymentStatus === "FAILED" || order.paymentStatus === "CANCELLED"
                                            ? "bg-rose-500"
                                            : "bg-amber-500 animate-pulse",
                                      )}
                                    />
                                    {order.paymentStatus === "PAID" ? "Pago" : order.paymentStatus === "FAILED" ? "Falhou" : "Pendente"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Observação Geral do Pedido */}
                            {order.notes && (
                              <div className="rounded-lg bg-amber-50/70 border border-amber-200/60 p-2 text-xs text-amber-900 space-y-0.5">
                                <p className="font-bold text-[10px] uppercase tracking-wider text-amber-800">
                                  Observação do cliente:
                                </p>
                                <p className="text-[11px] italic leading-tight text-amber-950/90 break-words">
                                  {order.notes}
                                </p>
                              </div>
                            )}

                            {/* Seção retrátil de itens */}
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => toggleOrderExpanded(order.id)}
                                className="flex w-full items-center justify-between py-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>Itens do pedido</span>
                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 border border-slate-200/60">
                                    {order.orderProducts.length}
                                  </span>
                                </span>
                                <ChevronDownIcon
                                  size={14}
                                  className={cn(
                                    "text-slate-400 transition-transform duration-200",
                                    isExpanded ? "rotate-180" : "",
                                  )}
                                />
                              </button>

                              {isExpanded && (
                                <div className="space-y-1.5 pt-1">
                                  {order.orderProducts.map((orderProduct) => (
                                    <div
                                      key={orderProduct.id}
                                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-xs"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-900 leading-snug break-words">
                                          {orderProduct.productNameSnapshot || orderProduct.product.name}
                                        </p>

                                        {/* Opções selecionadas */}
                                        {orderProduct.orderProductOptions && orderProduct.orderProductOptions.length > 0 && (
                                          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-600">
                                            {(() => {
                                              const counts = new Map<string, { name: string; count: number }>();
                                              for (const opt of orderProduct.orderProductOptions) {
                                                const key = opt.productOptionId || opt.nameSnapshot;
                                                const existing = counts.get(key);
                                                if (existing) {
                                                  existing.count += 1;
                                                } else {
                                                  counts.set(key, { name: opt.nameSnapshot, count: 1 });
                                                }
                                              }

                                              return Array.from(counts.entries()).map(([key, item]) => (
                                                <p key={key} className="break-words leading-tight text-slate-500">
                                                  • {item.count > 1 ? `${item.count}x ` : ""}{item.name}
                                                </p>
                                              ));
                                            })()}
                                          </div>
                                        )}

                                        {orderProduct.notes && (
                                          <p className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] italic text-amber-800 border border-amber-200/60 break-words">
                                            Obs: {orderProduct.notes}
                                          </p>
                                        )}
                                      </div>
                                      <span className="ml-1.5 shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-800 border border-slate-200 shadow-2xs">
                                        {String(orderProduct.quantity)}×
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Rodapé de Ações: Proporcional e Compacto (sem botões esticados) */}
                            {(previousStatus || nextStatus || !["FINISHED", "CANCELLED"].includes(order.status)) && (
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                {/* Lado Esquerdo: Ação de Voltar etapa */}
                                <div>
                                  {previousStatus && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7.5 px-2.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium gap-1 transition-colors"
                                      disabled={isLoading}
                                      onClick={() =>
                                        handleOrderPatch(order.id, {
                                          status: previousStatus,
                                        })
                                      }
                                      title="Retornar etapa anterior"
                                    >
                                      <ArrowLeftIcon size={12} className="shrink-0" />
                                      <span>Voltar</span>
                                    </Button>
                                  )}
                                </div>

                                {/* Lado Direito: Ações compactas alinhadas (Cancelar e Avançar) */}
                                <div className="flex items-center gap-1.5 ml-auto">
                                  {!["FINISHED", "CANCELLED"].includes(order.status) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7.5 w-7.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                      disabled={isLoading}
                                      onClick={() =>
                                        handleOrderPatch(order.id, {
                                          status: "CANCELLED",
                                        })
                                      }
                                      title="Cancelar pedido"
                                    >
                                      <XCircleIcon size={14} />
                                    </Button>
                                  )}

                                  {nextStatus && (
                                    <Button
                                      size="sm"
                                      className={cn(
                                        "h-7.5 px-3.5 rounded-lg text-xs font-semibold shadow-xs transition-all gap-1.5 shrink-0",
                                        column.theme.advanceButtonClass,
                                      )}
                                      disabled={isLoading}
                                      onClick={() =>
                                        handleOrderPatch(order.id, {
                                          status: nextStatus,
                                        })
                                      }
                                    >
                                      {isLoading ? (
                                        <Loader2Icon className="animate-spin shrink-0" size={12} />
                                      ) : (
                                        <>
                                          <span>{getNextStatusLabel(order)}</span>
                                          <ArrowRightIcon size={12} className="shrink-0" />
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PainelPedidos;
