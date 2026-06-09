"use client";

import { ChevronLeftIcon, MapPinIcon,ScrollTextIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams,useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/helpers/format-currency";
import type { OrderComItens, OrderStatus } from "@/lib/db";

import { RatingDialog } from "./rating-dialog";

interface OrderListProps {
  orders: OrderComItens[];
  isSidePanel?: boolean;
  onBackClick?: () => void;
}

const getStatusLabel = (status: OrderStatus) => {
  if (status === "FINISHED") return "Finalizado";
  if (status === "CANCELLED") return "Cancelado";
  if (status === "OUT_FOR_DELIVERY") return "Em entrega";
  if (status === "READY_FOR_PICKUP") return "Pronto para retirada";
  if (status === "IN_PREPARATION") return "Em produção";
  if (status === "PENDING") return "Pendente";
  return "";
};

const getStatusClassName = (status: OrderStatus) => {
  if (status === "FINISHED") {
    return "bg-emerald-500 text-white";
  }

  if (status === "CANCELLED") {
    return "bg-rose-500 text-white";
  }

  if (status === "READY_FOR_PICKUP" || status === "OUT_FOR_DELIVERY") {
    return "bg-amber-500 text-white";
  }

  return "bg-gray-200 text-gray-700";
};

const formatDateTime = (value: Date | string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
};

const OrderList = ({ orders, isSidePanel, onBackClick }: OrderListProps) => {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
      return;
    }
    router.back();
  };

  return (
    <div
      className={`mx-auto w-full space-y-6 ${isSidePanel ? "py-4" : "max-w-4xl p-6"}`}
    >
      {!isSidePanel && (
        <div className="flex flex-col gap-6">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-sm"
            onClick={handleBackClick}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="flex items-center gap-3">
            <ScrollTextIcon className="text-primary" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Meus Pedidos
            </h2>
          </div>
        </div>
      )}
      {isSidePanel && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full -ml-2"
          onClick={handleBackClick}
        >
          <ChevronLeftIcon size={16} />
          Trocar celular
        </Button>
      )}
      {orders.length === 0 ? (
        <div className="rounded-[32px] border border-dashed bg-slate-50 px-6 py-12 text-center">
          <p className="text-xl font-medium text-slate-950">
            Nenhum pedido encontrado
          </p>
          <p className="mt-2 text-muted-foreground">
            Voce ainda nao realizou pedidos com este numero.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="overflow-hidden rounded-[24px] border-slate-200 shadow-sm transition hover:shadow-md"
            >
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl border">
                      <Image
                        src={order.restaurant.avatarImageUrl}
                        alt={order.restaurant.name}
                        className="object-cover"
                        fill
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {order.restaurant.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Realizado em {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </div>
                </div>

                <Separator className="bg-slate-100" />

                <div className="space-y-3">
                  {order.orderProducts.map((orderProduct) => (
                    <div
                      key={orderProduct.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {orderProduct.quantity}
                        </div>
                        <p className="text-sm text-slate-700">
                          {orderProduct.product.name}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(
                          orderProduct.product.price * orderProduct.quantity,
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator className="bg-slate-100" />

                {(order.status === "OUT_FOR_DELIVERY" || order.status === "IN_PREPARATION") && (
                  <Button
                    className="w-full rounded-2xl bg-blue-600 font-bold shadow-md shadow-blue-100"
                    asChild
                  >
                    <Link href={`/${slug}/orders/${order.id}/tracking`}>
                      <MapPinIcon className="mr-2 h-4 w-4" />
                      Rastrear Entrega
                    </Link>
                  </Button>
                )}

                {order.status === "FINISHED" && (
                  <RatingDialog
                    orderId={order.id}
                    restaurantId={order.restaurantId}
                    restaurantName={order.restaurant.name}
                    customerName={order.customerName}
                    slug={slug}
                  />
                )}

                <div className="flex items-center justify-between bg-slate-50/50 -mx-6 -mb-6 p-6">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Total pago</p>
                    <p className="text-lg font-bold text-slate-950">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Agendamento</p>
                    <p className="text-sm font-medium text-slate-700">
                      {order.scheduledFor
                        ? formatDateTime(order.scheduledFor)
                        : "Imediato"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderList;
