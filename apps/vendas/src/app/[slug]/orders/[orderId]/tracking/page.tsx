"use client";

import { Courier, Order, Restaurant } from "@fsw/db";
import { BikeIcon, ChevronLeftIcon, ClockIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getOrderTracking } from "../../actions/get-order-tracking";

// Importar o mapa dinamicamente para evitar erros de SSR com Leaflet
const OrderMap = dynamic(() => import("./components/order-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-muted-foreground">
      Carregando mapa...
    </div>
  ),
});

interface OrderTracking extends Order {
  restaurant: Restaurant;
  courier: Courier | null;
}

const TrackingPage = () => {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const data = await getOrderTracking(Number(orderId));
      if (data) setOrder(data as OrderTracking);
      setIsLoading(false);
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 10000); // Atualiza a cada 10 segundos
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando mapa...
      </div>
    );
  if (!order)
    return <div className="p-10 text-center">Pedido não encontrado.</div>;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-white px-4 py-4 shadow-sm">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href={`/${slug}/orders`}>
            <ChevronLeftIcon size={24} />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">Rastrear Pedido #{orderId}</h1>
          <p className="text-xs text-muted-foreground">
            {order.restaurant.name}
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <OrderMap order={order} />

        {/* Status Overlay */}
        <div className="absolute bottom-6 left-4 right-4 z-[1000]">
          <Card className="rounded-[32px] border-none shadow-2xl ring-1 ring-black/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">
                  {order.status === "OUT_FOR_DELIVERY"
                    ? "🚀 A caminho da sua casa!"
                    : "👨‍🍳 Preparando seu pedido..."}
                </CardTitle>
                <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                  AO VIVO
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <BikeIcon className="text-slate-600" size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Entregador
                  </p>
                  <p className="font-bold text-slate-900">
                    {order.courier?.name || "Aguardando entregador..."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClockIcon size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Previsão: 15-25 min
                  </span>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-blue-600 font-bold"
                  asChild
                >
                  <a href={`tel:${order.courier?.phone}`}>Ligar</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
