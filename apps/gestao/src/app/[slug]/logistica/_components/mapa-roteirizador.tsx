"use client";

import "leaflet/dist/leaflet.css";

import type { Courier, Restaurant } from "@fsw/db";
import L from "leaflet";
import { BikeIcon, Loader2Icon, MapPinIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { toast } from "sonner";

import {
  buscarPedidosParaRoteirizadorAction,
  despacharLoteAction,
  getCouriersAction,
} from "@/app/[slug]/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PedidoRoteirizador {
  id: number;
  customerName: string;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  total: number;
}

interface MapaRoteirizadorProps {
  slug: string;
  restaurant: Restaurant;
}

const BRAZIL_CENTER: [number, number] = [-15.7801, -47.9292];

const createPinIcon = (fill: string) =>
  L.divIcon({
    html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="${fill}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>`,
    className: "",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34],
  });

const RESTAURANT_ICON = createPinIcon("#f97316");
const COURIER_ICON = createPinIcon("#3b82f6");
const ORDER_ICON = createPinIcon("#8b5cf6");
const ORDER_SELECTED_ICON = createPinIcon("#22c55e");

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function MapaRoteirizador({ slug, restaurant }: MapaRoteirizadorProps) {
  const [orders, setOrders] = useState<PedidoRoteirizador[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const center: [number, number] =
    restaurant.latitude && restaurant.longitude
      ? [restaurant.latitude, restaurant.longitude]
      : BRAZIL_CENTER;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedCouriers] = await Promise.all([
        buscarPedidosParaRoteirizadorAction(slug),
        getCouriersAction(slug),
      ]);
      setOrders(fetchedOrders);
      setCouriers(fetchedCouriers);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const toggleOrder = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === orders.length && orders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleDispatch = () => {
    if (selectedIds.size === 0 || !selectedCourierId) return;
    startTransition(async () => {
      const count = selectedIds.size;
      const result = await despacharLoteAction(slug, [...selectedIds], selectedCourierId);
      if (result.success) {
        toast.success(`${count} pedido(s) despachado(s) com sucesso!`);
        setSelectedIds(new Set());
        setSelectedCourierId("");
        await loadData();
      }
    });
  };

  const ordersWithCoords = orders.filter(
    (o): o is PedidoRoteirizador & { deliveryLatitude: number; deliveryLongitude: number } =>
      o.deliveryLatitude !== null && o.deliveryLongitude !== null,
  );

  const couriersWithCoords = couriers.filter(
    (c): c is Courier & { latitude: number; longitude: number } =>
      c.latitude !== null && c.longitude !== null,
  );

  return (
    <div className="flex h-[640px] gap-3 overflow-hidden rounded-lg border bg-white/90 shadow-sm">
      {/* ── Painel lateral ── */}
      <div className="flex w-80 flex-shrink-0 flex-col border-r">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Pedidos prontos</p>
            <p className="text-xs text-muted-foreground">
              {orders.length} aguardando despacho
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={loadData}
            disabled={isLoading}
            title="Atualizar"
          >
            {isLoading ? (
              <Loader2Icon size={14} className="animate-spin" />
            ) : (
              <RefreshCwIcon size={14} />
            )}
          </Button>
        </div>

        {/* Selecionar todos */}
        {orders.length > 0 && (
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedIds.size === orders.length && orders.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-primary"
            />
            <label
              htmlFor="select-all"
              className="cursor-pointer text-xs text-muted-foreground"
            >
              Selecionar todos
            </label>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {selectedIds.size} selecionado(s)
              </Badge>
            )}
          </div>
        )}

        {/* Lista de pedidos */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2Icon className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <MapPinIcon size={32} className="text-slate-200" />
              <p className="text-sm text-muted-foreground">
                Nenhum pedido com localização pronto para entrega.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {orders.map((order) => {
                const hasCoords =
                  order.deliveryLatitude !== null && order.deliveryLongitude !== null;
                const isSelected = selectedIds.has(order.id);
                return (
                  <li
                    key={order.id}
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                      isSelected ? "bg-green-50/60" : ""
                    }`}
                    onClick={() => toggleOrder(order.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOrder(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-medium">
                          #{order.id} {order.customerName}
                        </p>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {order.deliveryAddress ?? "Endereço não informado"}
                      </p>
                      {!hasCoords && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          Sem coordenadas
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Controles de despacho */}
        <div className="space-y-2 border-t bg-slate-50/80 p-4">
          <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione um motoboy" />
            </SelectTrigger>
            <SelectContent>
              {couriers.map((courier) => (
                <SelectItem key={courier.id} value={courier.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        courier.isAvailable ? "bg-emerald-500" : "bg-rose-400"
                      }`}
                    />
                    {courier.name} ({courier.vehicleType ?? "MOTO"})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="w-full gap-2"
            size="sm"
            disabled={selectedIds.size === 0 || !selectedCourierId || isPending}
            onClick={handleDispatch}
          >
            {isPending ? (
              <Loader2Icon size={14} className="animate-spin" />
            ) : (
              <BikeIcon size={14} />
            )}
            Despachar {selectedIds.size > 0 ? `${selectedIds.size} pedido(s)` : "lote"}
          </Button>
        </div>
      </div>

      {/* ── Mapa ── */}
      <div className="relative flex-1">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marcador do restaurante */}
          {restaurant.latitude && restaurant.longitude && (
            <Marker
              position={[restaurant.latitude, restaurant.longitude]}
              icon={RESTAURANT_ICON}
            >
              <Popup>
                <p className="font-semibold text-sm">{restaurant.name}</p>
                <p className="text-xs text-gray-500">Restaurante</p>
              </Popup>
            </Marker>
          )}

          {/* Marcadores dos motoboys com localização */}
          {couriersWithCoords.map((courier) => (
            <Marker
              key={courier.id}
              position={[courier.latitude, courier.longitude]}
              icon={COURIER_ICON}
            >
              <Popup>
                <p className="font-semibold text-sm">{courier.name}</p>
                <p className="text-xs text-gray-500">{courier.vehicleType ?? "MOTO"}</p>
                <span
                  className={`mt-1 inline-block text-xs font-medium ${
                    courier.isAvailable ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {courier.isAvailable ? "Disponível" : "Indisponível"}
                </span>
              </Popup>
            </Marker>
          ))}

          {/* Marcadores dos pedidos */}
          {ordersWithCoords.map((order) => {
            const isSelected = selectedIds.has(order.id);
            return (
              <Marker
                key={order.id}
                position={[order.deliveryLatitude, order.deliveryLongitude]}
                icon={isSelected ? ORDER_SELECTED_ICON : ORDER_ICON}
                eventHandlers={{ click: () => toggleOrder(order.id) }}
              >
                <Popup>
                  <p className="font-semibold text-sm">
                    #{order.id} {order.customerName}
                  </p>
                  <p className="text-xs text-gray-500">{order.deliveryAddress}</p>
                  <p className="mt-1 text-xs font-semibold">{formatCurrency(order.total)}</p>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legenda */}
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border bg-white/95 px-3 py-2 shadow-md">
          <p className="mb-1.5 text-xs font-semibold text-slate-700">Legenda</p>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-white bg-orange-500 shadow-sm" />
              Restaurante
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-white bg-blue-500 shadow-sm" />
              Motoboy
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-white bg-purple-500 shadow-sm" />
              Pedido pronto
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-white bg-green-500 shadow-sm" />
              Selecionado
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
