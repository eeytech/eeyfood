"use client";

import "leaflet/dist/leaflet.css";

import type { Courier, Restaurant } from "@fsw/db";
import L from "leaflet";
import {
  AlertCircleIcon,
  BikeIcon,
  CompassIcon,
  IceCreamBowlIcon,
  LayersIcon,
  Loader2Icon,
  MapPinIcon,
  MapPinOffIcon,
  PizzaIcon,
  RefreshCwIcon,
  SaladIcon,
  SearchIcon,
  SparklesIcon,
  StoreIcon,
  WineIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { io } from "socket.io-client";
import { toast } from "sonner";

import {
  atualizarLocalizacaoPedidoAction,
  atualizarLocalizacaoRestauranteAction,
  buscarPedidosParaRoteirizadorAction,
  despacharLoteAction,
  getCouriersAction,
} from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  hasAcai?: boolean;
  hasBar?: boolean;
  hasColdKitchen?: boolean;
  sectors?: string[];
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
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "PIZZA" | "ACAI" | "BAR" | "COLD" | "NO_GPS"
  >("ALL");

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

  // Order GPS Dialog State
  const [editingOrder, setEditingOrder] = useState<PedidoRoteirizador | null>(null);
  const [orderAddressInput, setOrderAddressInput] = useState("");
  const [isLocatingOrderGps, setIsLocatingOrderGps] = useState(false);

  const handleOpenOrderGpsDialog = (order: PedidoRoteirizador, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrder(order);
    setOrderAddressInput(order.deliveryAddress || "");
  };

  const handleSaveOrderGps = async () => {
    if (!editingOrder || !orderAddressInput.trim()) return;
    setIsLocatingOrderGps(true);
    try {
      const res = await atualizarLocalizacaoPedidoAction(slug, editingOrder.id, orderAddressInput.trim());
      if (res.latitude && res.longitude) {
        toast.success(`GPS do pedido #${editingOrder.id} localizado e salvo com sucesso!`);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === editingOrder.id
              ? {
                  ...o,
                  deliveryAddress: orderAddressInput.trim(),
                  deliveryLatitude: res.latitude ?? null,
                  deliveryLongitude: res.longitude ?? null,
                }
              : o,
          ),
        );
        setEditingOrder(null);
      } else {
        toast.warning(
          "Não conseguimos identificar as coordenadas exatas por esse endereço. Tente adicionar o CEP (ex: CEP: 00000-000) e a cidade.",
        );
      }
    } catch {
      toast.error("Erro ao buscar GPS do pedido.");
    } finally {
      setIsLocatingOrderGps(false);
    }
  };

  // Sincroniza estado com dados atualizados do restaurante
  useEffect(() => {
    if (restaurant.address) setStoreAddress(restaurant.address);
    if (restaurant.latitude != null) setStoreLat(String(restaurant.latitude));
    if (restaurant.longitude != null) setStoreLng(String(restaurant.longitude));
  }, [restaurant.address, restaurant.latitude, restaurant.longitude]);

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
    } catch {
      toast.error("Erro ao carregar pedidos para o roteirizador.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Conexão em tempo real via WebSocket para movimentação dos motoboys
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
    let websocketUrl = raw || "http://localhost:4000";
    if (raw && raw.includes("websocket.eeytech.com") && !raw.includes("fswdonalds")) {
      websocketUrl = raw.replace("websocket.eeytech.com", "websocket.fswdonalds.eeytech.com");
    }

    const socket = io(websocketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("JOIN_RESTAURANT_ROOM", slug);
    });

    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", () => setSocketConnected(false));

    socket.on(
      "COURIER_LOCATION_UPDATE",
      (data: {
        courierId: string;
        restaurantSlug: string;
        latitude: number;
        longitude: number;
        sentAt?: string;
      }) => {
        if (data.restaurantSlug !== slug) return;

        setCouriers((prev) => {
          const exists = prev.some((c) => c.id === data.courierId);
          if (!exists) {
            void loadData();
            return prev;
          }
          return prev.map((c) => {
            if (c.id === data.courierId) {
              return {
                ...c,
                latitude: data.latitude,
                longitude: data.longitude,
              };
            }
            return c;
          });
        });
      },
    );

    socket.on("NEW_ORDER", (data: { restaurantSlug: string }) => {
      if (data.restaurantSlug === slug) void loadData();
    });

    socket.on("ORDER_UPDATED", (data: { restaurantSlug: string }) => {
      if (data.restaurantSlug === slug) void loadData();
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("COURIER_LOCATION_UPDATE");
      socket.off("NEW_ORDER");
      socket.off("ORDER_UPDATED");
      socket.disconnect();
    };
  }, [slug, loadData]);

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
      if (activeFilter === "ACAI" && !order.hasAcai) return false;
      if (activeFilter === "BAR" && !order.hasBar) return false;
      if (activeFilter === "COLD" && !order.hasColdKitchen) return false;
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
        const latFixed = Number(res.latitude).toFixed(6);
        const lngFixed = Number(res.longitude).toFixed(6);
        setStoreLat(latFixed);
        setStoreLng(lngFixed);
        toast.success(`Coordenadas GPS encontradas e salvas com sucesso! (${latFixed}, ${lngFixed})`);
        setIsLocationDialogOpen(false);
      } else {
        toast.warning(
          "Não conseguimos identificar as coordenadas exatas pelo endereço. Você pode usar o botão 'Usar GPS deste dispositivo' ou digitar latitude/longitude manualmente.",
        );
      }
    } catch {
      toast.error("Erro ao buscar coordenadas.");
    } finally {
      setIsGeocodingStore(false);
    }
  };

  // Captura localização atual do dispositivo pelo navegador
  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocalização não é suportada pelo seu navegador.");
      return;
    }
    toast.info("Obtendo GPS do dispositivo...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setStoreLat(lat);
        setStoreLng(lng);
        toast.success(`GPS obtido: (${lat}, ${lng})! Clique em Salvar Localização para confirmar.`);
      },
      (err) => {
        console.error("Erro ao obter GPS do navegador:", err);
        toast.error("Não foi possível acessar a localização do dispositivo. Verifique as permissões de GPS no navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
      {/* ── Sub Header ───────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
              Roteirizador e Painel de Despacho
            </h2>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                socketConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
              title={
                socketConnected
                  ? "Canal de tempo real ativo — a localização dos motoboys é atualizada ao vivo no mapa"
                  : "Conectando ao canal em tempo real..."
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  socketConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>{socketConnected ? "GPS em Tempo Real Ativo" : "Reconectando..."}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Agrupe pedidos prontos por proximidade geográfica, acompanhe entregadores no mapa e despache em lote.
          </p>
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
                  <SparklesIcon size={13} className="text-primary" />
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
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "ALL"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <LayersIcon
                    size={12}
                    className={activeFilter === "ALL" ? "text-primary-foreground" : "text-primary"}
                  />
                  <span>Todos ({orders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("PIZZA")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "PIZZA"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <PizzaIcon
                    size={12}
                    className={activeFilter === "PIZZA" ? "text-primary-foreground" : "text-primary"}
                  />
                  <span>Pizza ({orders.filter((o) => o.hasPizza).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("ACAI")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "ACAI"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <IceCreamBowlIcon
                    size={12}
                    className={activeFilter === "ACAI" ? "text-primary-foreground" : "text-primary"}
                  />
                  <span>Açaí ({orders.filter((o) => o.hasAcai).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("BAR")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "BAR"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <WineIcon
                    size={12}
                    className={activeFilter === "BAR" ? "text-primary-foreground" : "text-primary"}
                  />
                  <span>Bar/Copa ({orders.filter((o) => o.hasBar).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("COLD")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "COLD"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <SaladIcon
                    size={12}
                    className={activeFilter === "COLD" ? "text-primary-foreground" : "text-primary"}
                  />
                  <span>Coz. Fria ({orders.filter((o) => o.hasColdKitchen).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("NO_GPS")}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    activeFilter === "NO_GPS"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <MapPinOffIcon
                    size={12}
                    className={activeFilter === "NO_GPS" ? "text-primary-foreground" : "text-primary"}
                  />
                  <span>Sem GPS ({orders.filter((o) => o.deliveryLatitude == null).length})</span>
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
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-primary"
                    />
                    <span>Selecionar todos</span>
                  </label>
                  {selectedIds.size > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
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
                filteredOrders.map((order) => {
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
                          ? "bg-primary/5 border-l-4 border-l-primary"
                          : "hover:bg-slate-50 border-l-4 border-l-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOrder(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 accent-primary"
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

                          {order.hasAcai && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                              🍨 Açaí / Bag Térmica
                            </span>
                          )}

                          {order.hasBar && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                              🍹 Copa / Bar
                            </span>
                          )}

                          {order.hasColdKitchen && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              🥗 Cozinha Fria
                            </span>
                          )}

                          {distKm && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              <CompassIcon size={10} />
                              {distKm}
                            </span>
                          )}

                          {!hasCoords && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenOrderGpsDialog(order, e)}
                              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Clique para localizar ou corrigir o endereço e ativar o GPS deste pedido"
                            >
                              <AlertCircleIcon size={10} />
                              Sem GPS • Localizar
                            </button>
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
                  Vincular ao Motoboy / Entregador
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
                      couriers.map((c) => {
                        const hasGps = c.latitude !== null && c.longitude !== null;
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  hasGps
                                    ? "bg-sky-500 animate-pulse"
                                    : c.isAvailable
                                      ? "bg-emerald-500"
                                      : "bg-slate-300"
                                }`}
                              />
                              <span className="font-semibold text-slate-900">{c.name}</span>
                              <span className="text-slate-400 text-xs">
                                ({c.vehicleType ?? "MOTO"} • {hasGps ? "GPS Ativo" : "Sem GPS"} • {c.phone})
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleDispatch}
                disabled={selectedIds.size === 0 || !selectedCourierId || isPending}
                className="h-10 w-full gap-2 rounded-full bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all"
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
          <div className="relative min-h-[450px] flex-1 isolate z-0">
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
                          <span className="font-bold text-xs text-primary">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{order.deliveryAddress}</p>
                        {order.hasPizza && (
                          <div className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            🍕 Contém Pizza (Exige Mochila Redonda)
                          </div>
                        )}
                        {order.hasAcai && (
                          <div className="mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                            🍨 Contém Açaí / Gelados (Bag Térmica)
                          </div>
                        )}
                        {order.hasBar && (
                          <div className="mt-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                            🍹 Bebidas (Copa / Bar)
                          </div>
                        )}
                        {order.hasColdKitchen && (
                          <div className="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                            🥗 Cozinha Fria / Saladas
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
                  <span className="font-medium">
                    Motoboy no GPS ({couriersWithCoords.length})
                  </span>
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
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg z-[9999]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <StoreIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Configurar GPS da Loja
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Defina o endereço e as coordenadas de latitude/longitude para centralizar o mapa e permitir o cálculo de rotas inteligentes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveStoreLocation} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="storeAddress" className="text-xs font-semibold text-slate-700">
                Endereço completo da loja
              </Label>
              <div className="flex gap-2">
                <Input
                  id="storeAddress"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000, Bela Vista, São Paulo - SP"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                  required
                />
                <Button
                  type="button"
                  onClick={handleAutoGeocodeStore}
                  disabled={isGeocodingStore}
                  className="h-10 shrink-0 gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                  {isGeocodingStore ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : (
                    <CompassIcon size={14} />
                  )}
                  <span>Buscar GPS</span>
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                O sistema busca no OpenStreetMap, Photon e BrasilAPI para identificar automaticamente a latitude e longitude.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Coordenadas geográficas</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  className="h-7 gap-1.5 rounded-lg border-slate-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <MapPinIcon size={12} className="text-primary" />
                  <span>Usar GPS deste dispositivo</span>
                </Button>
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
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
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
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLocationDialogOpen(false)}
                className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending && <Loader2Icon size={14} className="mr-1.5 animate-spin" />}
                Salvar Localização
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ── Dialog Localização do Pedido ────────────── */}
      <Dialog
        open={Boolean(editingOrder)}
        onOpenChange={(open) => {
          if (!open) setEditingOrder(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md z-[9999]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <MapPinIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Localizar GPS do Pedido #{editingOrder?.id}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cliente: <span className="font-semibold text-slate-700">{editingOrder?.customerName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Endereço de Entrega</Label>
              <Input
                value={orderAddressInput}
                onChange={(e) => setOrderAddressInput(e.target.value)}
                placeholder="Rua, número, bairro, cidade - CEP: 00000-000"
                className="h-10 rounded-xl text-xs bg-slate-50"
              />
              <p className="text-[11px] text-slate-400">
                Dica: adicione o CEP (ex: CEP: 00000-000) e a cidade para obter as coordenadas com precisão e exibir o pino no mapa.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingOrder(null)}
              className="h-9 rounded-full text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveOrderGps}
              disabled={isLocatingOrderGps || !orderAddressInput.trim()}
              className="h-9 rounded-full bg-primary text-xs font-semibold text-primary-foreground gap-1.5"
            >
              {isLocatingOrderGps ? (
                <Loader2Icon size={14} className="animate-spin" />
              ) : (
                <SearchIcon size={14} />
              )}
              <span>Localizar no Mapa</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
