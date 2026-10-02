"use client";

import type { Courier, OrderStatus, PedidoRecebimento } from "@fsw/db";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeDollarSignIcon,
  BikeIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  ChevronDownIcon,
  ClockIcon,
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
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

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
  return "Mercado Pago";
};

const getPaymentMethodVariant = (
  paymentMethod: PedidoRecebimento["paymentMethod"],
  paymentStatus: PedidoRecebimento["paymentStatus"],
) => {
  if (paymentMethod === "DINHEIRO") return "warning" as const;
  if (paymentMethod === "CARTAO_PRESENCIAL") return "danger" as const;
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

  if (order.status === "IN_PREPARATION") {
    return order.consumptionMethod === "DELIVERY"
      ? "OUT_FOR_DELIVERY"
      : "READY_FOR_PICKUP";
  }

  if (
    order.status === "READY_FOR_PICKUP" ||
    order.status === "OUT_FOR_DELIVERY"
  ) {
    return "FINISHED";
  }

  return null;
};

const getPreviousStatus = (order: PedidoRecebimento): OrderStatus | null => {
  if (order.status === "IN_PREPARATION") return "PENDING";
  if (
    order.status === "READY_FOR_PICKUP" ||
    order.status === "OUT_FOR_DELIVERY"
  ) {
    return "IN_PREPARATION";
  }

  if (order.status === "FINISHED") {
    return order.consumptionMethod === "DELIVERY"
      ? "OUT_FOR_DELIVERY"
      : "READY_FOR_PICKUP";
  }

  return null;
};

const getNextStatusLabel = (order: PedidoRecebimento): string => {
  if (order.status === "PENDING") return "Iniciar preparo";
  if (order.status === "IN_PREPARATION") {
    return order.consumptionMethod === "DELIVERY"
      ? "Despachar"
      : "Marcar pronto";
  }
  if (order.status === "READY_FOR_PICKUP") return "Concluir pedido";
  if (order.status === "OUT_FOR_DELIVERY") return "Concluir entrega";
  return "Avançar";
};

const PainelPedidos = ({ slug, initialOrders }: PainelPedidosProps) => {
  const [orders, setOrders] = useState(initialOrders);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loadingOrderIds, setLoadingOrderIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("PRODUCAO");
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const [orderToDispatch, setOrderToDispatch] =
    useState<PedidoRecebimento | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [isDispatching, setIsDispatching] = useState(false);

  // Auto-impressão de pedidos ao receber
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [autoPrintMode, setAutoPrintMode] = useState<"DELIVERY" | "PRODUCTION" | "BOTH">("DELIVERY");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAutoPrint = localStorage.getItem("eey_autoprint_enabled");
      if (savedAutoPrint !== null) {
        setAutoPrintEnabled(savedAutoPrint === "true");
      }
      const savedMode = localStorage.getItem("eey_autoprint_mode");
      if (savedMode) {
        setAutoPrintMode(savedMode as "DELIVERY" | "PRODUCTION" | "BOTH");
      }
    }
  }, []);

  const handleToggleAutoPrint = (enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    localStorage.setItem("eey_autoprint_enabled", String(enabled));
    toast.info(enabled ? "Auto-impressão de novos pedidos ativada!" : "Auto-impressão desativada.");
  };

  const handleChangeAutoPrintMode = (mode: "DELIVERY" | "PRODUCTION" | "BOTH") => {
    setAutoPrintMode(mode);
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
    const response = await fetch(`/api/pedidos/${String(orderId)}`, {
      cache: "no-store",
    });

    if (!response.ok) return;

    const order = (await response.json()) as PedidoRecebimento;

    setOrders((currentOrders) => {
      if (!currentOrders.some((currentOrder) => currentOrder.id === order.id)) {
        // Novo pedido detectado em tempo real
        try {
          new Audio("/sounds/bell.mp3").play().catch(() => null);
        } catch { /* ignore */ }

        if (autoPrintEnabled) {
          setTimeout(() => {
            if (autoPrintMode === "BOTH") {
              handlePrint(order, "PRODUCTION");
              setTimeout(() => handlePrint(order, "DELIVERY"), 600);
            } else {
              handlePrint(order, autoPrintMode);
            }
          }, 400);
        }

        return [order, ...currentOrders];
      }

      return currentOrders.map((currentOrder) =>
        currentOrder.id === order.id ? order : currentOrder,
      );
    });
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

    const handleCallWaiter = (payload: { restaurantSlug: string; tableId: string; tableName: string }) => {
      if (payload.restaurantSlug !== slug) return;
      try { new Audio("/sounds/bell.mp3").play().catch(() => null); } catch { /* ignore */ }
      toast.warning(`Mesa ${payload.tableName} solicitando atendimento!`, {
        duration: 10000,
        icon: "🔔",
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);
    socket.on("NEW_ORDER", handleNewOrder);
    socket.on("ORDER_UPDATED", handleOrderUpdated);
    socket.on("CALL_WAITER", handleCallWaiter);

    getCouriersAction(slug).then(setCouriers);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.off("ORDER_UPDATED", handleOrderUpdated);
      socket.off("CALL_WAITER", handleCallWaiter);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, websocketUrl]);

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

  const handlePrint = (
    order: PedidoRecebimento,
    type: "PRODUCTION" | "DELIVERY",
  ) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);

    const isProduction = type === "PRODUCTION";

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
            .h-20 { height: 80px; }
          </style>
        </head>
        <body>
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
                (item) => {
                  const optionCounts = new Map<string, { name: string; count: number }>();
                  if (item.orderProductOptions) {
                    for (const opt of item.orderProductOptions) {
                      const key = opt.productOptionId || opt.nameSnapshot;
                      const existing = optionCounts.get(key);
                      if (existing) {
                        existing.count += 1;
                      } else {
                        optionCounts.set(key, { name: opt.nameSnapshot, count: 1 });
                      }
                    }
                  }
                  const optionsHtml = Array.from(optionCounts.values())
                    .map(
                      (opt) =>
                        `<div style="font-size: 10px; margin-left: 6px; color: #222;">• ${opt.count > 1 ? `${opt.count}x ` : ""}${opt.name}</div>`,
                    )
                    .join("");

                  return `
              <div class="flex justify-between" style="margin-top: 4px;">
                <span class="font-bold">${item.productNameSnapshot || item.product.name}</span>
                <span>${item.quantity}x</span>
              </div>
              ${optionsHtml}
              ${item.notes ? `<div style="font-size: 10px; font-style: italic; margin-left: 6px; margin-bottom: 2px;">- Obs: ${item.notes}</div>` : ""}
            `;
                },
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
              <p><span class="font-bold">PAGAMENTO:</span> ${
                order.paymentMethod === "DINHEIRO"
                  ? "DINHEIRO"
                  : order.paymentMethod === "CARTAO_PRESENCIAL"
                    ? "CARTÃO (PRESENCIAL)"
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
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document ?? iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };


  const countProducao = orders.filter((o) =>
    VIEW_STATUSES.PRODUCAO.includes(o.status),
  ).length;
  const countLogistica = orders.filter((o) =>
    VIEW_STATUSES.LOGISTICA.includes(o.status),
  ).length;
  const countHistorico = orders.filter((o) =>
    VIEW_STATUSES.HISTORICO.includes(o.status),
  ).length;
  const countGeral = orders.length;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (order) =>
        String(order.id).includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (order.customerPhone && order.customerPhone.includes(q)) ||
        (order.deliveryAddress &&
          order.deliveryAddress.toLowerCase().includes(q)),
    );
  }, [orders, searchQuery]);

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
              {/* Botão de Configuração de Auto-Impressão */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 gap-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs",
                      autoPrintEnabled
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <PrinterIcon
                      size={14}
                      className={autoPrintEnabled ? "text-emerald-600" : "text-slate-400"}
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
                      {autoPrintMode === "DELIVERY" && <span className="text-emerald-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleChangeAutoPrintMode("PRODUCTION")}
                      className={cn(
                        "text-xs justify-between cursor-pointer",
                        autoPrintMode === "PRODUCTION" && "font-bold text-slate-900 bg-slate-50",
                      )}
                    >
                      <span>Via Cozinha / Produção</span>
                      {autoPrintMode === "PRODUCTION" && <span className="text-emerald-600">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleChangeAutoPrintMode("BOTH")}
                      className={cn(
                        "text-xs justify-between cursor-pointer",
                        autoPrintMode === "BOTH" && "font-bold text-slate-900 bg-slate-50",
                      )}
                    >
                      <span>Ambas (Cozinha + Entrega)</span>
                      {autoPrintMode === "BOTH" && <span className="text-emerald-600">✓</span>}
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge
                variant={socketConnected ? "success" : "danger"}
                className="w-fit"
              >
                {socketConnected ? "Canal sincronizado" : "Reconectando"}
              </Badge>
              <span
                className={cn(
                  "h-3 w-3 animate-pulse rounded-full",
                  socketConnected ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
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

          <div className="relative w-full sm:w-64">
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

        <div className={isGeral ? "overflow-x-auto pb-4" : ""}>
          <div
            className={cn(
              "grid gap-4",
              isGeral
                ? "min-w-[1600px] grid-cols-6"
                : activeColumns.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
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
                          {searchQuery ? "Nenhum pedido filtrado" : "Nenhum pedido nesta etapa"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {searchQuery ? "Tente outro termo de busca" : column.description}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    ordersByColumn.map((order) => {
                      const nextStatus = getNextStatus(order);
                      const previousStatus = getPreviousStatus(order);
                      const isOfflinePayment =
                        order.paymentMethod === "DINHEIRO" ||
                        order.paymentMethod === "CARTAO_PRESENCIAL";
                      const isLoading = loadingOrderIds.includes(order.id);
                      const isExpanded = expandedOrders.has(order.id);

                      return (
                        <Card
                          key={order.id}
                          className={cn(
                            "border border-slate-200/90 bg-white/95 shadow-xs transition-all duration-200 hover:shadow-md",
                            column.theme.cardBorderLeft,
                            column.theme.cardHoverBorder,
                          )}
                        >
                          <CardHeader className="space-y-2.5 p-3.5 pb-2">
                            {/* Linha 1: ID, Impressão e Status de Pagamento */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-1">
                                <span
                                  className={cn(
                                    "rounded-md px-2 py-0.5 font-mono text-[11px] font-bold shadow-2xs",
                                    column.theme.idBadgeClass,
                                  )}
                                >
                                  #{String(order.id)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                  onClick={() =>
                                    handlePrint(order, "PRODUCTION")
                                  }
                                  title="Imprimir Cozinha"
                                >
                                  <PrinterIcon size={12} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                  onClick={() =>
                                    handlePrint(order, "DELIVERY")
                                  }
                                  title="Imprimir Cupom"
                                >
                                  <ReceiptTextIcon size={12} />
                                </Button>
                              </div>

                              <Badge
                                variant={getPaymentStatusVariant(
                                  order.paymentStatus,
                                )}
                                className="px-2 py-0.5 text-[10px] font-bold"
                              >
                                {getPaymentStatusLabel(order.paymentStatus)}
                              </Badge>
                            </div>

                            {/* Linha 2: Nome do cliente e Método de consumo */}
                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <p className="min-w-0 flex-1 font-display text-sm font-bold text-slate-900 leading-snug break-words">
                                {order.customerName}
                              </p>
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                {getConsumptionLabel(order.consumptionMethod)}
                              </span>
                            </div>

                            {/* Prévia do endereço para entregas */}
                            {order.consumptionMethod === "DELIVERY" && order.deliveryAddress && (
                              <p className="flex items-center gap-1 text-[11px] text-slate-600 line-clamp-1 break-words">
                                <MapPinIcon size={11} className="shrink-0 text-slate-400" />
                                <span className="truncate">{order.deliveryAddress}</span>
                              </p>
                            )}

                            {/* Linha 3: Metadados (Horário, Total, Método e Entregador) */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                <ClockIcon size={10} className="text-slate-400" />
                                {formatDateTime(order.createdAt)}
                              </span>

                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-900">
                                {formatCurrency(order.total)}
                              </span>

                              <Badge
                                variant={getPaymentMethodVariant(
                                  order.paymentMethod,
                                  order.paymentStatus,
                                )}
                                className="px-2 py-0.5 text-[10px]"
                              >
                                {getPaymentLabel(order.paymentMethod)}
                              </Badge>

                              {order.courier && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-cyan-200/80 bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-800">
                                  <BikeIcon size={11} />
                                  <span className="truncate max-w-[90px]">{order.courier.name}</span>
                                </span>
                              )}
                            </div>

                            {/* Seção retrátil de itens */}
                            <button
                              type="button"
                              onClick={() => toggleOrderExpanded(order.id)}
                              className="flex w-full items-center justify-between pt-1 text-xs font-medium text-slate-500 transition hover:text-slate-800"
                            >
                              <span>
                                Ver itens ({order.orderProducts.length})
                              </span>
                              <ChevronDownIcon
                                size={14}
                                className={cn(
                                  "transition-transform duration-200",
                                  isExpanded ? "rotate-180" : "",
                                )}
                              />
                            </button>

                            {isExpanded && (
                              <div className="space-y-1.5 pt-1">
                                {order.orderProducts.map((orderProduct) => (
                                  <div
                                    key={orderProduct.id}
                                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2 text-xs"
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
                                              <p key={key} className="break-words leading-tight">
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
                                    <span className="ml-1.5 shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-800 border border-slate-200">
                                      {String(orderProduct.quantity)}×
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardHeader>

                          <CardContent className="space-y-2 p-3.5 pt-0">
                            {order.paymentMethod === "DINHEIRO" &&
                            order.changeFor ? (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                                <div className="flex items-center gap-1.5 text-amber-900">
                                  <BadgeDollarSignIcon size={13} className="shrink-0" />
                                  <p className="text-xs font-semibold">
                                    Troco para {formatCurrency(order.changeFor)}
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
                              {isOfflinePayment &&
                              order.paymentStatus !== "PAID" ? (
                                <Button
                                  size="sm"
                                  className="h-8 w-full text-xs font-semibold"
                                  disabled={isLoading}
                                  onClick={() =>
                                    handleOrderPatch(order.id, {
                                      paymentStatus: "PAID",
                                    })
                                  }
                                >
                                  {isLoading ? (
                                    <Loader2Icon
                                      className="mr-1.5 animate-spin"
                                      size={12}
                                    />
                                  ) : null}
                                  Confirmar pagamento
                                </Button>
                              ) : null}

                              <div className="flex items-center gap-1.5">
                                {previousStatus ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 flex-1 text-xs px-2 font-medium"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleOrderPatch(order.id, {
                                        status: previousStatus,
                                      })
                                    }
                                  >
                                    <ArrowLeftIcon size={12} className="mr-1 shrink-0" />
                                    <span>Voltar</span>
                                  </Button>
                                ) : null}

                                {nextStatus ? (
                                  <Button
                                    size="sm"
                                    className={cn(
                                      "h-8 flex-1 text-xs px-2 font-semibold shadow-xs transition-all",
                                      column.theme.advanceButtonClass,
                                    )}
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleOrderPatch(order.id, {
                                        status: nextStatus,
                                      })
                                    }
                                  >
                                    <ArrowRightIcon size={12} className="mr-1 shrink-0" />
                                    <span>{getNextStatusLabel(order)}</span>
                                  </Button>
                                ) : null}

                                {!["FINISHED", "CANCELLED"].includes(
                                  order.status,
                                ) ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleOrderPatch(order.id, {
                                        status: "CANCELLED",
                                      })
                                    }
                                    title="Cancelar pedido"
                                  >
                                    <XCircleIcon size={15} />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </CardContent>
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
