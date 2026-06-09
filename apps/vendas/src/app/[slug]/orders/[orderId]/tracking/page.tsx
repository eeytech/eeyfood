"use client";

import { ChevronLeftIcon, MapPinIcon, BikeIcon, StoreIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/helpers/format-currency";

import { getOrderTracking } from "../../actions/get-order-tracking";

// Corrigir ícones do Leaflet que quebram no Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const restaurantIcon = L.divIcon({
  html: '<div class="bg-primary p-2 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>',
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const courierIcon = L.divIcon({
  html: '<div class="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg text-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>',
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = L.divIcon({
  html: '<div class="bg-emerald-600 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center);
  return null;
};

const TrackingPage = () => {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const data = await getOrderTracking(Number(orderId));
      if (data) setOrder(data);
      setIsLoading(false);
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 10000); // Atualiza a cada 10 segundos
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando mapa...</div>;
  if (!order) return <div className="p-10 text-center">Pedido não encontrado.</div>;

  const restaurantPos: [number, number] = [order.restaurant.latitude || -23.5505, order.restaurant.longitude || -46.6333];
  const courierPos: [number, number] | null = order.courier?.latitude ? [order.courier.latitude, order.courier.longitude] : null;
  const customerPos: [number, number] | null = order.deliveryLatitude ? [order.deliveryLatitude, order.deliveryLongitude] : null;

  const centerPos = courierPos || restaurantPos;

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
          <p className="text-xs text-muted-foreground">{order.restaurant.name}</p>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <MapContainer center={centerPos} zoom={15} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          <Marker position={restaurantPos} icon={restaurantIcon}>
            <Popup>Restaurante: {order.restaurant.name}</Popup>
          </Marker>

          {customerPos && (
            <Marker position={customerPos} icon={customerIcon}>
              <Popup>Sua Localização</Popup>
            </Marker>
          )}

          {courierPos && (
            <Marker position={courierPos} icon={courierIcon}>
              <Popup>Entregador: {order.courier.name}</Popup>
            </Marker>
          )}

          <ChangeView center={centerPos} />
        </MapContainer>

        {/* Status Overlay */}
        <div className="absolute bottom-6 left-4 right-4 z-[1000]">
          <Card className="rounded-[32px] border-none shadow-2xl ring-1 ring-black/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">
                  {order.status === "OUT_FOR_DELIVERY" ? "🚀 A caminho da sua casa!" : "👨‍🍳 Preparando seu pedido..."}
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
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Entregador</p>
                  <p className="font-bold text-slate-900">{order.courier?.name || "Aguardando entregador..."}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClockIcon size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Previsão: 15-25 min</span>
                </div>
                <Button size="sm" className="rounded-full bg-blue-600 font-bold" asChild>
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
