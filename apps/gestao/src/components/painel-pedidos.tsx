"use client";

import type { OrderStatus, PedidoRecebimento } from "@fsw/db";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeDollarSignIcon,
  Clock3Icon,
  CreditCardIcon,
  Loader2Icon,
  PackageCheckIcon,
  RadioIcon,
  ReceiptTextIcon,
  SmartphoneChargingIcon,
  UtensilsCrossedIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PainelPedidosProps {
  slug: string;
  restaurantName: string;
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

const getStatusLabel = (status: PedidoRecebimento["status"]) => {
  if (status === "IN_PREPARATION") return "Em produção";
  if (status === "READY_FOR_PICKUP") return "Pronto para retirada";
  if (status === "OUT_FOR_DELIVERY") return "Em entrega";
  if (status === "FINISHED") return "Finalizado";
  if (status === "CANCELLED") return "Cancelado";
  return "Solicitado";
};

const getStatusVariant = (status: PedidoRecebimento["status"]) => {
  if (status === "FINISHED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "READY_FOR_PICKUP") return "warning" as const;
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

const formatCurrency = (value: number | null) => {
  if (value === null) {
    return "R$ 0,00";
  }

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

const PainelPedidos = ({
  slug,
  restaurantName,
  initialOrders,
}: PainelPedidosProps) => {
  const [orders, setOrders] = useState(initialOrders);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loadingOrderIds, setLoadingOrderIds] = useState<number[]>([]);

  const websocketUrl =
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  const syncOrderById = async (orderId: number) => {
    const response = await fetch(`/api/pedidos/${String(orderId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

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
      if (payload.restaurantSlug !== slug) {
        return;
      }

      await syncOrderById(payload.orderId);
    };

    const handleOrderUpdated = async (payload: PedidoAtualizadoEvento) => {
      if (payload.restaurantSlug !== slug) {
        return;
      }

      await syncOrderById(payload.orderId);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("NEW_ORDER", handleNewOrder);
    socket.on("ORDER_UPDATED", handleOrderUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.off("ORDER_UPDATED", handleOrderUpdated);
      socket.disconnect();
    };
  }, [slug, websocketUrl]);

  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const paidOrders = orders.filter(
    (order) => order.paymentStatus === "PAID",
  ).length;
  const activeOrders = orders.filter((order) =>
    ["PENDING", "IN_PREPARATION", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(
      order.status,
    ),
  ).length;

  const handleOrderPatch = async (
    orderId: number,
    payload: {
      status?: OrderStatus;
      paymentStatus?: PedidoRecebimento["paymentStatus"];
    },
  ) => {
    try {
      setLoadingOrderIds((currentOrderIds) => [...currentOrderIds, orderId]);

      const response = await fetch(`/api/pedidos/${String(orderId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return;
      }

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

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="bg-slate-950 text-white">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-white/10 text-white">
                Gestão operacional
              </Badge>
              <CardTitle className="font-display text-3xl">
                {restaurantName}
              </CardTitle>
              <CardDescription className="text-slate-300">
                Acompanhe a fila de produção, retirada e entrega em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <RadioIcon size={16} />
                  <span>Tempo real</span>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-emerald-400" : "bg-rose-400"}`}
                />
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Sala do restaurante
                </p>
                <p className="mt-2 font-mono text-sm text-slate-100">{slug}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Solicitados</p>
                  <p className="font-display text-3xl font-semibold">
                    {pendingOrders}
                  </p>
                </div>
                <Clock3Icon className="text-primary" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Pagos</p>
                  <p className="font-display text-3xl font-semibold">
                    {paidOrders}
                  </p>
                </div>
                <BadgeDollarSignIcon className="text-primary" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Em operação</p>
                  <p className="font-display text-3xl font-semibold">
                    {activeOrders}
                  </p>
                </div>
                <UtensilsCrossedIcon className="text-primary" />
              </CardContent>
            </Card>
          </div>
        </aside>

        <section className="space-y-4">
          <Card className="border-white/80 bg-white/85">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="font-display text-3xl">
                  Fluxo de pedidos
                </CardTitle>
                <CardDescription>
                  Arraste depois, opere agora por clique: cada coluna representa uma
                  etapa do processo.
                </CardDescription>
              </div>
              <Badge
                variant={socketConnected ? "success" : "danger"}
                className="w-fit"
              >
                {socketConnected ? "Canal sincronizado" : "Reconectando"}
              </Badge>
            </CardHeader>
          </Card>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1600px] grid-cols-6 gap-4">
              {KANBAN_COLUMNS.map((column) => {
                const ordersByColumn = orders
                  .filter((order) => order.status === column.status)
                  .sort((left, right) => right.id - left.id);

                return (
                  <div key={column.status} className="flex h-full flex-col gap-4">
                    <Card className="border-white/80 bg-slate-50/90">
                      <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-xl">{column.title}</CardTitle>
                          <Badge variant="secondary">{String(ordersByColumn.length)}</Badge>
                        </div>
                        <CardDescription>{column.description}</CardDescription>
                      </CardHeader>
                    </Card>

                    {ordersByColumn.length === 0 ? (
                      <Card className="border-dashed bg-white/60">
                        <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
                          <PackageCheckIcon className="text-slate-400" size={28} />
                          <p className="font-medium text-slate-900">
                            Nenhum pedido nesta etapa
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Novos pedidos aparecerão aqui automaticamente.
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

                        return (
                          <Card
                            key={order.id}
                            className="border-white/70 bg-white/95 backdrop-blur"
                          >
                            <CardHeader className="space-y-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    Pedido #{String(order.id)}
                                  </p>
                                  <CardTitle className="font-display text-2xl">
                                    {order.customerName}
                                  </CardTitle>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={getPaymentMethodVariant(
                                      order.paymentMethod,
                                      order.paymentStatus,
                                    )}
                                  >
                                    {getPaymentLabel(order.paymentMethod)}
                                  </Badge>
                                  <Badge variant={getStatusVariant(order.status)}>
                                    {getStatusLabel(order.status)}
                                  </Badge>
                                  <Badge
                                    variant={getPaymentStatusVariant(
                                      order.paymentStatus,
                                    )}
                                  >
                                    {getPaymentStatusLabel(order.paymentStatus)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid gap-3 rounded-[24px] bg-secondary/55 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    Criado às
                                  </p>
                                  <p className="font-semibold">
                                    {formatDateTime(order.createdAt)}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    Consumo
                                  </p>
                                  <p className="font-semibold">
                                    {getConsumptionLabel(order.consumptionMethod)}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    Total
                                  </p>
                                  <p className="font-semibold">
                                    {formatCurrency(order.total)}
                                  </p>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-5">
                              <div className="space-y-3">
                                {order.orderProducts.map((orderProduct) => (
                                  <div
                                    key={orderProduct.id}
                                    className="flex items-center justify-between rounded-2xl border bg-background/70 px-4 py-3"
                                  >
                                    <div>
                                      <p className="font-medium">
                                        {orderProduct.product.name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Quantidade: {String(orderProduct.quantity)}
                                      </p>
                                    </div>
                                    <ReceiptTextIcon
                                      className="text-primary"
                                      size={18}
                                    />
                                  </div>
                                ))}
                              </div>

                              {order.paymentMethod === "DINHEIRO" &&
                              order.changeFor ? (
                                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                                  <div className="flex items-center gap-2 text-amber-900">
                                    <BadgeDollarSignIcon size={18} />
                                    <p className="font-medium">
                                      Troco para {formatCurrency(order.changeFor)}
                                    </p>
                                  </div>
                                </div>
                              ) : null}

                              <div className="space-y-3 rounded-[24px] border bg-slate-50 p-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {order.paymentMethod === "MERCADO_PAGO" ? (
                                    <SmartphoneChargingIcon size={16} />
                                  ) : (
                                    <CreditCardIcon size={16} />
                                  )}
                                  {isOfflinePayment
                                    ? "Pagamento presencial aguardando baixa"
                                    : "Pagamento online acompanhado por webhook"}
                                </div>

                                <div className="grid gap-2">
                                  {isOfflinePayment &&
                                  order.paymentStatus !== "PAID" ? (
                                    <Button
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
                                          size={16}
                                        />
                                      ) : null}
                                      Confirmar pagamento
                                    </Button>
                                  ) : null}

                                  <div className="flex flex-wrap gap-2">
                                    {previousStatus ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isLoading}
                                        onClick={() =>
                                          handleOrderPatch(order.id, {
                                            status: previousStatus,
                                          })
                                        }
                                      >
                                        <ArrowLeftIcon size={14} />
                                        Voltar
                                      </Button>
                                    ) : null}

                                    {nextStatus ? (
                                      <Button
                                        size="sm"
                                        disabled={isLoading}
                                        onClick={() =>
                                          handleOrderPatch(order.id, {
                                            status: nextStatus,
                                          })
                                        }
                                      >
                                        <ArrowRightIcon size={14} />
                                        Avançar
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
                                        <XCircleIcon size={14} />
                                        Cancelar
                                      </Button>
                                    ) : null}
                                  </div>
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
    </main>
  );
};

export default PainelPedidos;
