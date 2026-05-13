"use client";

import type { PedidoRecebimento } from "@fsw/db";
import {
  BadgeDollarSignIcon,
  Clock3Icon,
  CreditCardIcon,
  Loader2Icon,
  RadioIcon,
  ReceiptTextIcon,
  SmartphoneChargingIcon,
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
import { Separator } from "@/components/ui/separator";

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

const getPaymentLabel = (paymentMethod: PedidoRecebimento["paymentMethod"]) => {
  if (paymentMethod === "DINHEIRO") return "Dinheiro";
  if (paymentMethod === "CARTAO_PRESENCIAL") return "Cartão presencial";
  return "Mercado Pago";
};

const getPaymentVariant = (
  paymentMethod: PedidoRecebimento["paymentMethod"],
  status: PedidoRecebimento["status"],
) => {
  if (paymentMethod === "DINHEIRO") return "warning" as const;
  if (paymentMethod === "CARTAO_PRESENCIAL") return "danger" as const;
  return status === "PAYMENT_CONFIRMED" ? ("success" as const) : ("secondary" as const);
};

const getStatusLabel = (status: PedidoRecebimento["status"]) => {
  if (status === "PAYMENT_CONFIRMED") return "Pagamento confirmado";
  if (status === "IN_PREPARATION") return "Em preparo";
  if (status === "FINISHED") return "Finalizado";
  if (status === "PAYMENT_FAILED") return "Pagamento falhou";
  return "Aguardando";
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

      const response = await fetch(`/api/pedidos/${String(payload.orderId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const order = (await response.json()) as PedidoRecebimento;

      setOrders((currentOrders) => {
        if (currentOrders.some((currentOrder) => currentOrder.id === order.id)) {
          return currentOrders;
        }

        return [order, ...currentOrders];
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("NEW_ORDER", handleNewOrder);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.disconnect();
    };
  }, [slug, websocketUrl]);

  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const confirmedOrders = orders.filter(
    (order) => order.status === "PAYMENT_CONFIRMED",
  ).length;
  const cashOrders = orders.filter(
    (order) => order.paymentMethod === "DINHEIRO",
  ).length;

  const handleConfirmPayment = async (orderId: number) => {
    try {
      setLoadingOrderIds((currentOrderIds) => [...currentOrderIds, orderId]);

      const response = await fetch(`/api/pedidos/${String(orderId)}`, {
        method: "PATCH",
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
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="bg-slate-950 text-white">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-white/10 text-white">
                Gestão ativa
              </Badge>
              <CardTitle className="font-display text-3xl">
                {restaurantName}
              </CardTitle>
              <CardDescription className="text-slate-300">
                Operação sincronizada com o salão, balcão e entrega.
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

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
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
                  <p className="text-sm text-muted-foreground">
                    Confirmados
                  </p>
                  <p className="font-display text-3xl font-semibold">
                    {confirmedOrders}
                  </p>
                </div>
                <SmartphoneChargingIcon className="text-primary" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Em dinheiro
                  </p>
                  <p className="font-display text-3xl font-semibold">
                    {cashOrders}
                  </p>
                </div>
                <BadgeDollarSignIcon className="text-primary" />
              </CardContent>
            </Card>
          </div>
        </aside>

        <section className="space-y-4">
          <Card className="border-white/80 bg-white/85">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="font-display text-3xl">
                  Recebimento de pedidos
                </CardTitle>
                <CardDescription>
                  Novos pedidos entram automaticamente nesta fila.
                </CardDescription>
              </div>
              <Badge
                variant={socketConnected ? "success" : "danger"}
                className="w-fit"
              >
                {socketConnected ? "Conectado" : "Reconectando"}
              </Badge>
            </CardHeader>
          </Card>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                <ReceiptTextIcon className="text-primary" size={32} />
                <p className="font-display text-2xl font-semibold">
                  Nenhum pedido na fila
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Assim que um novo pedido for criado no app de vendas, ele
                  aparecerá aqui automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {orders.map((order) => {
                const isOfflinePayment =
                  order.paymentMethod === "DINHEIRO" ||
                  order.paymentMethod === "CARTAO_PRESENCIAL";
                const isLoading = loadingOrderIds.includes(order.id);

                return (
                  <Card
                    key={order.id}
                    className="border-white/70 bg-white/90 backdrop-blur"
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
                          <Badge variant={getPaymentVariant(order.paymentMethod, order.status)}>
                            {getPaymentLabel(order.paymentMethod)}
                          </Badge>
                          <Badge
                            variant={
                              order.status === "PAYMENT_CONFIRMED"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-[24px] bg-secondary/55 p-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Criado às
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Consumo
                          </p>
                          <p className="mt-1 font-semibold">
                            {order.consumptionMethod === "DINE_IN"
                              ? "No salão"
                              : "Para levar"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Total
                          </p>
                          <p className="mt-1 font-semibold">
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <ReceiptTextIcon size={18} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.paymentMethod === "DINHEIRO" && order.changeFor ? (
                        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-center gap-2 text-amber-900">
                            <BadgeDollarSignIcon size={18} />
                            <p className="font-medium">
                              Troco para {formatCurrency(order.changeFor)}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <Separator />

                      <div className="flex flex-wrap items-center justify-between gap-3">
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

                        {isOfflinePayment && order.status !== "PAYMENT_CONFIRMED" ? (
                          <Button
                            onClick={() => handleConfirmPayment(order.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2Icon className="animate-spin" size={16} />
                            ) : null}
                            Dar baixa / Confirmar pagamento
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default PainelPedidos;
