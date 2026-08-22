"use client";

import type { Courier, OrderStatus, PedidoRecebimento } from "@fsw/db";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeDollarSignIcon,
  BikeIcon,
  ChevronDownIcon,
  Clock3Icon,
  Loader2Icon,
  PackageCheckIcon,
  PrinterIcon,
  ReceiptTextIcon,
  UtensilsCrossedIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const KANBAN_COLUMNS: Array<{
  status: OrderStatus;
  title: string;
  description: string;
}> = [
  {
    status: "PENDING",
    title: "Solicitados",
    description: "Pedidos recém-criados aguardando triagem.",
  },
  {
    status: "IN_PREPARATION",
    title: "Em produção",
    description: "Pedidos em preparo na cozinha ou no balcão.",
  },
  {
    status: "READY_FOR_PICKUP",
    title: "Prontos",
    description: "Pedidos finalizados e aguardando retirada.",
  },
  {
    status: "OUT_FOR_DELIVERY",
    title: "Em entrega",
    description: "Pedidos que já saíram para entrega.",
  },
  {
    status: "FINISHED",
    title: "Finalizados",
    description: "Pedidos concluídos com sucesso.",
  },
  {
    status: "CANCELLED",
    title: "Cancelados",
    description: "Pedidos interrompidos ou estornados.",
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

  const websocketUrl =
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  const syncOrderById = async (orderId: number) => {
    const response = await fetch(`/api/pedidos/${String(orderId)}`, {
      cache: "no-store",
    });

    if (!response.ok) return;

    const order = (await response.json()) as PedidoRecebimento;

    setOrders((currentOrders) => {
      if (!currentOrders.some((currentOrder) => currentOrder.id === order.id)) {
        return [order, ...currentOrders];
      }

      return currentOrders.map((currentOrder) =>
        currentOrder.id === order.id ? order : currentOrder,
      );
    });
  };

  useEffect(() => {
    const socket = io(websocketUrl, {
      transports: ["websocket"],
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
    socket.on("NEW_ORDER", handleNewOrder);
    socket.on("ORDER_UPDATED", handleOrderUpdated);
    socket.on("CALL_WAITER", handleCallWaiter);

    getCouriersAction(slug).then(setCouriers);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.off("ORDER_UPDATED", handleOrderUpdated);
      socket.off("CALL_WAITER", handleCallWaiter);
      socket.disconnect();
    };
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
                (item) => `
              <div class="flex justify-between">
                <span>${item.product.name}</span>
                <span>${item.quantity}x</span>
              </div>
              ${item.notes ? `<div style="font-size: 10px; font-style: italic; margin-bottom: 4px;">- Obs: ${item.notes}</div>` : ""}
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

  const pendingOrdersCount = orders.filter(
    (order) => order.status === "PENDING",
  ).length;
  const paidOrdersCount = orders.filter(
    (order) => order.paymentStatus === "PAID",
  ).length;
  const activeOrdersCount = orders.filter((order) =>
    ["PENDING", "IN_PREPARATION", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(
      order.status,
    ),
  ).length;

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

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Solicitados
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold">
                {pendingOrdersCount}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Clock3Icon className="text-primary" size={16} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pagos
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold">
                {paidOrdersCount}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <BadgeDollarSignIcon className="text-emerald-600" size={16} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Em operação
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold">
                {activeOrdersCount}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
              <UtensilsCrossedIcon className="text-blue-600" size={16} />
            </div>
          </CardContent>
        </Card>
      </div>

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
            <div className="flex items-center gap-3">
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

        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as ActiveView)}
        >
          <TabsList>
            <TabsTrigger value="PRODUCAO">Operação ativa</TabsTrigger>
            <TabsTrigger value="LOGISTICA">Logística</TabsTrigger>
            <TabsTrigger value="HISTORICO">Histórico</TabsTrigger>
            <TabsTrigger value="GERAL">Visão geral</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={isGeral ? "overflow-x-auto pb-2" : ""}>
          <div
            className={cn(
              "grid gap-4",
              isGeral
                ? "min-w-[1600px] grid-cols-6"
                : activeColumns.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-3",
            )}
          >
            {activeColumns.map((column) => {
              const ordersByColumn = orders
                .filter((order) => order.status === column.status)
                .sort(
                  (left, right) =>
                    getOrderReferenceDate(left) - getOrderReferenceDate(right),
                );

              return (
                <div key={column.status} className="flex h-full flex-col gap-3">
                  <Card className="border-white/80 bg-slate-50/90">
                    <CardHeader className="space-y-1 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">
                          {column.title}
                        </CardTitle>
                        <Badge variant="secondary">
                          {String(ordersByColumn.length)}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>

                  {ordersByColumn.length === 0 ? (
                    <Card className="border-dashed bg-white/60">
                      <CardContent className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-4 text-center">
                        <PackageCheckIcon className="text-slate-400" size={18} />
                        <p className="text-sm font-medium text-slate-900">
                          Nenhum pedido aqui
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
                          className="border-white/70 bg-white/95 backdrop-blur"
                        >
                          <CardHeader className="space-y-2 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    #{String(order.id)}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() =>
                                      handlePrint(order, "PRODUCTION")
                                    }
                                    title="Imprimir Cozinha"
                                  >
                                    <PrinterIcon size={11} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() =>
                                      handlePrint(order, "DELIVERY")
                                    }
                                    title="Imprimir Cupom Cliente"
                                  >
                                    <ReceiptTextIcon size={11} />
                                  </Button>
                                </div>
                                <p className="truncate font-display text-sm font-semibold">
                                  {order.customerName}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-1">
                                <Badge
                                  variant={getPaymentMethodVariant(
                                    order.paymentMethod,
                                    order.paymentStatus,
                                  )}
                                  className="text-xs"
                                >
                                  {getPaymentLabel(order.paymentMethod)}
                                </Badge>
                                <Badge
                                  variant={getPaymentStatusVariant(
                                    order.paymentStatus,
                                  )}
                                  className="text-xs"
                                >
                                  {getPaymentStatusLabel(order.paymentStatus)}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-secondary/55 px-3 py-2 text-xs">
                              <span className="text-muted-foreground">
                                {formatDateTime(order.createdAt)}
                              </span>
                              <span className="font-medium">
                                {getConsumptionLabel(order.consumptionMethod)}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(order.total)}
                              </span>
                              {order.courier && (
                                <span className="flex items-center gap-1 font-medium">
                                  <BikeIcon size={12} />
                                  {order.courier.name}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleOrderExpanded(order.id)}
                              className="flex w-full items-center justify-between text-xs text-muted-foreground transition hover:text-slate-700"
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
                              <div className="space-y-1 pt-1">
                                {order.orderProducts.map((orderProduct) => (
                                  <div
                                    key={orderProduct.id}
                                    className="flex items-center justify-between rounded-lg border bg-background/70 px-3 py-1.5"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {orderProduct.product.name}
                                      </p>
                                      {orderProduct.notes && (
                                        <p className="text-xs italic text-amber-600/80">
                                          {orderProduct.notes}
                                        </p>
                                      )}
                                    </div>
                                    <span className="ml-3 shrink-0 text-xs font-semibold text-muted-foreground">
                                      {String(orderProduct.quantity)}×
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardHeader>

                          <CardContent className="space-y-2 pt-0">
                            {order.paymentMethod === "DINHEIRO" &&
                            order.changeFor ? (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                <div className="flex items-center gap-1.5 text-amber-900">
                                  <BadgeDollarSignIcon size={13} />
                                  <p className="text-xs font-medium">
                                    Troco para{" "}
                                    {formatCurrency(order.changeFor)}
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            <div className="space-y-1.5 rounded-xl border bg-slate-50 p-2">
                              {isOfflinePayment &&
                              order.paymentStatus !== "PAID" ? (
                                <Button
                                  size="sm"
                                  className="w-full"
                                  disabled={isLoading}
                                  onClick={() =>
                                    handleOrderPatch(order.id, {
                                      paymentStatus: "PAID",
                                    })
                                  }
                                >
                                  {isLoading ? (
                                    <Loader2Icon
                                      className="animate-spin"
                                      size={14}
                                    />
                                  ) : null}
                                  Confirmar pagamento
                                </Button>
                              ) : null}

                              <div className="flex flex-wrap gap-1.5">
                                {previousStatus ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleOrderPatch(order.id, {
                                        status: previousStatus,
                                      })
                                    }
                                  >
                                    <ArrowLeftIcon size={13} />
                                    Voltar
                                  </Button>
                                ) : null}

                                {nextStatus ? (
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleOrderPatch(order.id, {
                                        status: nextStatus,
                                      })
                                    }
                                  >
                                    <ArrowRightIcon size={13} />
                                    {nextStatus === "OUT_FOR_DELIVERY"
                                      ? "Despachar"
                                      : "Avançar"}
                                  </Button>
                                ) : null}

                                {!["FINISHED", "CANCELLED"].includes(
                                  order.status,
                                ) ? (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleOrderPatch(order.id, {
                                        status: "CANCELLED",
                                      })
                                    }
                                  >
                                    <XCircleIcon size={13} />
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
