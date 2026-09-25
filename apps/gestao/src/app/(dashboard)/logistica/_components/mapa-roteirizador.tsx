"use client";

import "leaflet/dist/leaflet.css";

import type { Courier, Restaurant } from "@fsw/db";
import L from "leaflet";
import {
  AlertCircleIcon,
  BikeIcon,
  CheckCircle2Icon,
  CompassIcon,
  FilterXIcon,
  LayersIcon,
  Loader2Icon,
  MapPinIcon,
  NavigationIcon,
  RefreshCwIcon,
  RouteIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
  StoreIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { toast } from "sonner";

import {
  atualizarLocalizacaoRestauranteAction,
  buscarPedidosParaRoteirizadorAction,
  despacharLoteAction,
  getCouriersAction,
} from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const calcDistKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface PedidoRoteirizador {
  id: number;
  customerName: string;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  total: number;
  hasPizza?: boolean;
}

interface MapaRoteirizadorProps {
  slug: string;
  restaurant: Restaurant;
}

const BRAZIL_CENTER: [number, number] = [-15.7801, -47.9292];

const createPinIcon = (fill: string, label?: string) =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="${fill}" stroke="white" stroke-width="1.8"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
        ${
          label
            ? `<span style="position: absolute; top: 4px; font-size: 10px; font-weight: bold; color: ${fill};">${label}</span>`
            : ""
        }
      </div>`,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
  });

const RESTAURANT_ICON = createPinIcon("#f97316");
const COURIER_ICON = createPinIcon("#0284c7");
const ORDER_ICON = createPinIcon("#6366f1");
const ORDER_SELECTED_ICON = createPinIcon("#10b981");

const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0)) || 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

export function MapaRoteirizador({ slug, restaurant }: MapaRoteirizadorProps) {
  const [orders, setOrders] = useState<PedidoRoteirizador[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PIZZA" | "NO_GPS">("ALL");

  // Store Location Dialog State
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [storeAddress, setStoreAddress] = useState(restaurant.address ?? "");
  const [storeLat, setStoreLat] = useState<string>(
    restaurant.latitude != null ? String(restaurant.latitude) : "",
  );
  const [storeLng, setStoreLng] = useState<string>(
    restaurant.longitude != null ? String(restaurant.longitude) : "",
  );
  const [isGeocodingStore, setIsGeocodingStore] = useState(false);

  // Active Coordinates for Map Center
  const currentStoreLat = storeLat ? parseFloat(storeLat) : restaurant.latitude;
  const currentStoreLng = storeLng ? parseFloat(storeLng) : restaurant.longitude;

  const center: [number, number] =
    currentStoreLat && currentStoreLng
      ? [currentStoreLat, currentStoreLng]
      : BRAZIL_CENTER;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedCouriers] = await Promise.all([
        buscarPedidosParaRoteirizadorAction(slug),
        getCouriersAction(slug),
      ]);
      setOrders(fetchedOrders);
      setCouriers(fetchedCouriers);
    } catch (err) {
      toast.error("Erro ao carregar pedidos para o roteirizador.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesId = String(order.id).includes(q);
        const matchesAddress = order.deliveryAddress?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesId && !matchesAddress) return false;
      }

      if (activeFilter === "PIZZA" && !order.hasPizza) return false;
      if (
        activeFilter === "NO_GPS" &&
        order.deliveryLatitude != null &&
        order.deliveryLongitude != null
      ) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, activeFilter]);

  // Metrics
  const totalOrders = orders.length;
  const ordersWithGps = orders.filter(
    (o) => o.deliveryLatitude != null && o.deliveryLongitude != null,
  ).length;
  const availableCouriers = couriers.filter((c) => c.isAvailable && c.isActive).length;
  const hasStoreGps = currentStoreLat != null && currentStoreLng != null;

  const toggleOrder = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  // Route Optimization (Nearest Neighbor TSP)
  const optimizeRoute = () => {
    if (!currentStoreLat || !currentStoreLng) {
      toast.error(
        "Cadastre as coordenadas da loja antes de otimizar a rota!",
        {
          action: {
            label: "Configurar",
            onClick: () => setIsLocationDialogOpen(true),
          },
        },
      );
      return;
    }

    const withCoords = orders.filter(
      (o): o is PedidoRoteirizador & { deliveryLatitude: number; deliveryLongitude: number } =>
        o.deliveryLatitude !== null && o.deliveryLongitude !== null,
    );

    if (withCoords.length === 0) {
      toast.info("Nenhum pedido com coordenadas GPS para otimizar.");
      return;
    }

    let restLat = currentStoreLat;
    let restLng = currentStoreLng;
    const remaining = [...withCoords];
    const sorted: typeof remaining = [];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      remaining.forEach((o, idx) => {
        const d = calcDistKm(restLat, restLng, o.deliveryLatitude, o.deliveryLongitude);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = idx;
        }
      });
      const nearest = remaining.splice(nearestIdx, 1)[0];
      sorted.push(nearest);
      restLat = nearest.deliveryLatitude;
      restLng = nearest.deliveryLongitude;
    }

    const noCoords = orders.filter(
      (o) => o.deliveryLatitude === null || o.deliveryLongitude === null,
    );
    setOrders([...sorted, ...noCoords]);
    setSelectedIds(new Set(sorted.map((o) => o.id)));
    toast.success("Rota otimizada! Pedidos reordenados sequencialmente da loja até o destino.");
  };

  const handleDispatch = () => {
    if (selectedIds.size === 0 || !selectedCourierId) return;
    startTransition(async () => {
      const count = selectedIds.size;
      const result = await despacharLoteAction(slug, [...selectedIds], selectedCourierId);
      if (result.success) {
        toast.success(`Lote de ${count} pedido(s) despachado com sucesso!`);
        setSelectedIds(new Set());
        setSelectedCourierId("");
        await loadData();
      } else {
        toast.error("Erro ao despachar pedidos.");
      }
    });
  };

  // Auto-geocode restaurant address
  const handleAutoGeocodeStore = async () => {
    if (!storeAddress.trim()) {
      toast.error("Informe o endereço completo do restaurante.");
      return;
    }

    setIsGeocodingStore(true);
    try {
      const res = await atualizarLocalizacaoRestauranteAction(slug, storeAddress);
      if (res.latitude && res.longitude) {
        setStoreLat(String(res.latitude));
        setStoreLng(String(res.longitude));
        toast.success("Coordenadas GPS encontradas e salvas com sucesso!");
        setIsLocationDialogOpen(false);
      } else {
        toast.warning(
          "Não conseguimos identificar as coordenadas exatas pelo endereço. Digite latitude/longitude manualmente.",
        );
      }
    } catch {
      toast.error("Erro ao buscar coordenadas.");
    } finally {
      setIsGeocodingStore(false);
    }
  };

  const handleSaveStoreLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = storeLat ? parseFloat(storeLat) : null;
    const lng = storeLng ? parseFloat(storeLng) : null;

    startTransition(async () => {
      try {
        await atualizarLocalizacaoRestauranteAction(slug, storeAddress, lat, lng);
        toast.success("Localização da loja atualizada com sucesso!");
        setIsLocationDialogOpen(false);
      } catch {
        toast.error("Erro ao salvar localização.");
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

  // Selected route path polyline (from store -> order 1 -> order 2...)
  const routePolylinePositions: [number, number][] = useMemo(() => {
    if (selectedIds.size === 0 || !currentStoreLat || !currentStoreLng) return [];

    const selectedOrdersWithCoords = orders.filter(
      (o): o is PedidoRoteirizador & { deliveryLatitude: number; deliveryLongitude: number } =>
        selectedIds.has(o.id) && o.deliveryLatitude !== null && o.deliveryLongitude !== null,
    );

    if (selectedOrdersWithCoords.length === 0) return [];

    return [
      [currentStoreLat, currentStoreLng],
      ...selectedOrdersWithCoords.map(
        (o) => [o.deliveryLatitude, o.deliveryLongitude] as [number, number],
      ),
    ];
  }, [orders, selectedIds, currentStoreLat, currentStoreLng]);

  return (
    <div className="space-y-6">
      {/* ── Page Header (Padrão Usuários) ───────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <RouteIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Roteirizador & Painel de Despacho
            </h1>
            <p className="text-sm text-slate-500">
              Agrupe pedidos prontos por proximidade geográfica, visualize mochilas de pizza e despache em lote.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsLocationDialogOpen(true)}
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <StoreIcon size={15} />
            <span>Configurar GPS da Loja</span>
          </Button>

          <Button
            onClick={loadData}
            variant="outline"
            disabled={isLoading}
            className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {isLoading ? (
              <Loader2Icon size={14} className="animate-spin text-slate-500" />
            ) : (
              <RefreshCwIcon size={14} className="text-slate-500" />
            )}
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards (Padrão 4 Colunas Usuários) ────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Pedidos Prontos
              </span>
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <NavigationIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalOrders}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Aguardando expedição
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                GPS Mapeado
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {ordersWithGps}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalOrders - ordersWithGps > 0
                ? `${totalOrders - ordersWithGps} sem localização exata`
                : "100% visíveis no mapa"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Motoboys Livres
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <BikeIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {availableCouriers}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Disponíveis para viagem
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Base Restaurante
              </span>
              <div
                className={`rounded-lg p-1.5 ${
                  hasStoreGps ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                <StoreIcon size={16} />
              </div>
            </div>
            <p
              className={`mt-2 font-display text-2xl font-bold ${
                hasStoreGps ? "text-teal-700" : "text-amber-700"
              }`}
            >
              {hasStoreGps ? "Conectado" : "Pendente"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasStoreGps ? "Ponto de partida ativo" : "Clique para configurar GPS"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Router Box (Mapa + Painel Lateral) ─────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col lg:h-[720px] lg:flex-row">
          {/* ── Painel Lateral de Pedidos ── */}
          <div className="flex w-full flex-col border-b border-slate-200/80 lg:w-96 lg:border-b-0 lg:border-r">
            {/* Header com Busca e Filtros */}
            <div className="space-y-2.5 border-b border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Fila de Despacho
                  </h3>
                  <p className="text-xs text-slate-500">
                    {filteredOrders.length} pedido(s) listado(s)
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={optimizeRoute}
                  disabled={isLoading || orders.length < 2}
                  className="h-8 gap-1.5 rounded-full border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  title="Otimizar Rota pelo vizinho mais próximo"
                >
                  <SparklesIcon size={13} className="text-amber-500" />
                  <span>Otimizar Rota</span>
                </Button>
              </div>

              {/* Search input */}
              <div className="relative">
                <SearchIcon
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  placeholder="Filtrar por nome, nº ou endereço..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-xl border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-900 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>

              {/* Filtros Rápidos (Pills) */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Todos ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("PIZZA")}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "PIZZA"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  🍕 Pizza ({orders.filter((o) => o.hasPizza).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("NO_GPS")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "NO_GPS"
                      ? "bg-rose-600 text-white"
                      : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  Sem GPS ({orders.filter((o) => o.deliveryLatitude == null).length})
                </button>
              </div>

              {/* Selecionar todos */}
              {filteredOrders.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === filteredOrders.length && filteredOrders.length > 0
                      }
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                    />
                    <span>Selecionar todos</span>
                  </label>
                  {selectedIds.size > 0 && (
                    <Badge className="bg-slate-900 text-white text-[10px]">
                      {selectedIds.size} selecionado(s)
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Lista de Pedidos */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2Icon size={24} className="animate-spin text-slate-600" />
                  <p className="text-xs">Buscando pedidos prontos...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
                  <MapPinIcon size={28} className="text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">
                    Nenhum pedido pronto no momento
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Os pedidos aparecerão aqui assim que forem finalizados na cozinha (KDS).
                  </p>
                </div>
              ) : (
                filteredOrders.map((order, idx) => {
                  const isSelected = selectedIds.has(order.id);
                  const hasCoords =
                    order.deliveryLatitude != null && order.deliveryLongitude != null;

                  // Distância da loja se houver coordenadas
                  let distKm: string | null = null;
                  if (hasCoords && currentStoreLat && currentStoreLng) {
                    const d = calcDistKm(
                      currentStoreLat,
                      currentStoreLng,
                      order.deliveryLatitude!,
                      order.deliveryLongitude!,
                    );
                    distKm = `${d.toFixed(1)} km da loja`;
                  }

                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrder(order.id)}
                      className={`flex cursor-pointer items-start gap-3 p-3.5 transition-colors ${
                        isSelected
                          ? "bg-emerald-50/70 border-l-4 border-l-emerald-600"
                          : "hover:bg-slate-50 border-l-4 border-l-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOrder(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-600"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-bold text-slate-900">
                            #{order.id} • {order.customerName}
                          </p>
                          <span className="shrink-0 text-xs font-bold text-slate-900">
                            {formatCurrency(order.total)}
                          </span>
                        </div>

                        <p className="line-clamp-2 text-[11px] text-slate-500">
                          {order.deliveryAddress ?? "Endereço não informado"}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {order.hasPizza && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              🍕 Mochila Redonda
                            </span>
                          )}

                          {distKm && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              <CompassIcon size={10} />
                              {distKm}
                            </span>
                          )}

                          {!hasCoords && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                              <AlertCircleIcon size={10} />
                              Sem GPS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer de Despacho em Lote */}
            <div className="border-t border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Vincular ao Motoboy / Entregador *
                </Label>
                <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-800">
                    <SelectValue placeholder="Selecione o motoboy para entrega" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    {couriers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Nenhum motoboy cadastrado.
                      </div>
                    ) : (
                      couriers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                c.isAvailable ? "bg-emerald-500" : "bg-rose-400"
                              }`}
                            />
                            <span className="font-semibold text-slate-900">{c.name}</span>
                            <span className="text-slate-400 text-xs">
                              ({c.vehicleType ?? "MOTO"} • {c.phone})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleDispatch}
                disabled={selectedIds.size === 0 || !selectedCourierId || isPending}
                className="h-10 w-full gap-2 rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2Icon size={15} className="animate-spin" />
                ) : (
                  <BikeIcon size={15} />
                )}
                <span>
                  Despachar{" "}
                  {selectedIds.size > 0
                    ? `${selectedIds.size} Pedido(s) Selecionado(s)`
                    : "Lote de Pedidos"}
                </span>
              </Button>
            </div>
          </div>

          {/* ── Mapa Interativo ── */}
          <div className="relative min-h-[450px] flex-1">
            <MapContainer
              center={center}
              zoom={13}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Rota desenhada com Polyline */}
              {routePolylinePositions.length > 1 && (
                <Polyline
                  positions={routePolylinePositions}
                  color="#10b981"
                  weight={3.5}
                  dashArray="6, 8"
                  opacity={0.85}
                />
              )}

              {/* Marcador do Restaurante */}
              {currentStoreLat && currentStoreLng && (
                <Marker
                  position={[currentStoreLat, currentStoreLng]}
                  icon={RESTAURANT_ICON}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-sm text-slate-900">{restaurant.name}</p>
                      <p className="text-xs text-slate-500">Ponto de Partida (Base)</p>
                      <p className="mt-1 text-[11px] text-slate-600">{storeAddress}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Marcadores dos Motoboys */}
              {couriersWithCoords.map((courier) => (
                <Marker
                  key={courier.id}
                  position={[courier.latitude, courier.longitude]}
                  icon={COURIER_ICON}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-sm text-slate-900">{courier.name}</p>
                      <p className="text-xs text-slate-500">
                        {courier.vehicleType ?? "MOTO"} • {courier.phone}
                      </p>
                      <span
                        className={`mt-1 inline-block text-xs font-semibold ${
                          courier.isAvailable ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {courier.isAvailable ? "Disponível para Viagem" : "Em trânsito / Ocupado"}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Marcadores dos Pedidos */}
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
                      <div className="p-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-sm text-slate-900">
                            #{order.id} {order.customerName}
                          </p>
                          <span className="font-bold text-xs text-emerald-700">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{order.deliveryAddress}</p>
                        {order.hasPizza && (
                          <div className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            🍕 Contém Pizza (Exige Mochila Redonda)
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant={isSelected ? "outline" : "default"}
                          onClick={() => toggleOrder(order.id)}
                          className="mt-2 h-7 w-full text-xs font-semibold"
                        >
                          {isSelected ? "Remover da Seleção" : "Selecionar para Entrega"}
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Legenda Flutuante (Card Estilo Usuários) */}
            <div className="absolute bottom-4 right-4 z-[1000] rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Legenda do Mapa
              </p>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-orange-500 shadow-sm" />
                  <span className="font-medium">Restaurante / Base</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-sky-600 shadow-sm" />
                  <span className="font-medium">Motoboy no GPS</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-indigo-500 shadow-sm" />
                  <span className="font-medium">Pedido Pronto</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="font-medium">Pedido Selecionado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Dialog Localização do Restaurante ────────────── */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <StoreIcon size={20} />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Configurar GPS da Loja
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina o endereço e as coordenadas de latitude/longitude para centralizar o mapa e permitir o cálculo de rotas inteligentes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStoreLocation} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="storeAddress" className="text-xs font-semibold text-slate-700">
                Endereço completo da loja *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="storeAddress"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000, Bela Vista, São Paulo - SP"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                  required
                />
                <Button
                  type="button"
                  onClick={handleAutoGeocodeStore}
                  disabled={isGeocodingStore}
                  className="h-10 shrink-0 gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {isGeocodingStore ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : (
                    <CompassIcon size={14} />
                  )}
                  <span>Buscar GPS</span>
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                O sistema usa OpenStreetMap para preencher automaticamente a latitude e longitude.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="storeLat" className="text-xs font-semibold text-slate-700">
                  Latitude (ex: -23.5505)
                </Label>
                <Input
                  id="storeLat"
                  value={storeLat}
                  onChange={(e) => setStoreLat(e.target.value)}
                  placeholder="-23.5505"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="storeLng" className="text-xs font-semibold text-slate-700">
                  Longitude (ex: -46.6333)
                </Label>
                <Input
                  id="storeLng"
                  value={storeLng}
                  onChange={(e) => setStoreLng(e.target.value)}
                  placeholder="-46.6333"
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLocationDialogOpen(false)}
                className="rounded-full text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-slate-900 px-6 font-semibold text-white hover:bg-slate-800"
              >
                {isPending && <Loader2Icon size={14} className="mr-2 animate-spin" />}
                Salvar Localização
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
