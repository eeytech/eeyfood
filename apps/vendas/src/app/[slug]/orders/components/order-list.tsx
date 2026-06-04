"use client";

import { ChevronLeftIcon, ScrollTextIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/helpers/format-currency";
import type { OrderComItens, OrderStatus } from "@/lib/db";

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
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
      return;
    }
    router.back();
  };

  return (
    <div className={`space-y-6 ${isSidePanel ? "py-4" : "p-6"}`}>
      {!isSidePanel && (
        <>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full"
            onClick={handleBackClick}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="flex items-center gap-3">
            <ScrollTextIcon />
            <h2 className="text-lg font-semibold">Meus Pedidos</h2>
          </div>
        </>
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
          <p className="text-lg font-medium text-slate-950">
            Nenhum pedido encontrado
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Voce ainda nao realizou pedidos com este numero.
          </p>
        </div>
      ) : (
        orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="space-y-4 p-5">
              <div
                className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${getStatusClassName(order.status)}`}
              >
                {getStatusLabel(order.status)}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative h-5 w-5">
                  <Image
                    src={order.restaurant.avatarImageUrl}
                    alt={order.restaurant.name}
                    className="rounded-sm"
                    fill
                  />
                </div>
                <p className="text-sm font-semibold">{order.restaurant.name}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                {order.orderProducts.map((orderProduct) => (
                  <div key={orderProduct.id} className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs font-semibold text-white">
                      {orderProduct.quantity}
                    </div>
                    <p className="text-sm">{orderProduct.product.name}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Pedido criado em {formatDateTime(order.createdAt)}</p>
                <p>
                  {order.scheduledFor
                    ? `Agendado para ${formatDateTime(order.scheduledFor)}`
                    : "Atendimento o quanto antes"}
                </p>
              </div>
              <Separator />
              <p className="text-sm font-medium">
                {formatCurrency(order.total)}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default OrderList;
