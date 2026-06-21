"use client";

import type { Courier } from "@fsw/db";
import {
  AlertTriangleIcon,
  BikeIcon,
  CameraIcon,
  CheckCircle2Icon,
  Loader2Icon,
  MapPinIcon,
  NavigationIcon,
  PackageIcon,
  PhoneIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface OrderItem {
  id: number;
  customerName: string;
  deliveryAddress: string | null;
  total: number;
  status: string;
  courierId: string | null;
  hasPizza?: boolean;
}

interface EntregadorPortalProps {
  slug: string;
  courier: Courier | null;
  initialOrders: OrderItem[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function EntregadorPortal({ slug, courier: initialCourier, initialOrders }: EntregadorPortalProps) {
  const [courier, setCourier] = useState<Courier | null>(initialCourier);
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [isAvailable, setIsAvailable] = useState(initialCourier?.isAvailable ?? false);
  const [isTracking, setIsTracking] = useState(false);
  const [deliveryTarget, setDeliveryTarget] = useState<OrderItem | null>(null);
  const [proofCapturing, setProofCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courierId, setCourierId] = useState(initialCourier?.id ?? "");
  const [loginId, setLoginId] = useState("");
  const watchIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const apiBase = `/api/entregador/${courierId}`;

  const refreshOrders = useCallback(async () => {
    if (!courierId) return;
    try {
      const res = await fetch(apiBase, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { orders: OrderItem[] };
        setOrders(data.orders);
      }
    } catch { /* non-critical */ }
  }, [courierId, apiBase]);

  useEffect(() => {
    if (!courierId) return;
    const interval = setInterval(() => void refreshOrders(), 30000);
    return () => clearInterval(interval);
  }, [courierId, refreshOrders]);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation || !courierId) return;
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void fetch(apiBase, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_location",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            restaurantSlug: slug,
          }),
        }).catch(() => null);
      },
      (err) => {
        console.error("GPS error:", err);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 },
    );
  }, [courierId, apiBase, slug]);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => () => stopGpsTracking(), [stopGpsTracking]);

  const handleLogin = async () => {
    if (!loginId.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/entregador/${loginId.trim()}`, { cache: "no-store" });
      if (!res.ok) {
        toast.error("Entregador não encontrado. Verifique o código.");
        return;
      }
      const data = (await res.json()) as { courier: Courier; orders: OrderItem[] };
      setCourier(data.courier);
      setCourierId(data.courier.id);
      setIsAvailable(data.courier.isAvailable);
      setOrders(data.orders);
      window.history.replaceState({}, "", `?id=${data.courier.id}`);
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    if (next) startGpsTracking(); else stopGpsTracking();
    await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_availability", isAvailable: next }),
    }).catch(() => null);
    toast.success(next ? "Você está disponível para entregas!" : "Você está indisponível.");
  };

  const handleClaimOrder = async (order: OrderItem) => {
    setIsLoading(true);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_order", orderId: order.id }),
      });
      if (res.ok) {
        setDeliveryTarget(order);
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        toast.success(`Entrega do pedido #${order.id} assumida!`);
        if (!isTracking) startGpsTracking();
      }
    } catch {
      toast.error("Erro ao assumir entrega.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliverProof = () => {
    setProofCapturing(true);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !deliveryTarget) {
      setProofCapturing(false);
      return;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch { /* optional */ }

        const res = await fetch(apiBase, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deliver_order",
            orderId: deliveryTarget.id,
            proofUrl: base64,
            latitude: lat,
            longitude: lng,
          }),
        });

        if (res.ok) {
          toast.success(`Pedido #${deliveryTarget.id} entregue! Comprovante registrado.`);
          setDeliveryTarget(null);
          stopGpsTracking();
        } else {
          toast.error("Erro ao registrar comprovante.");
        }
        setIsLoading(false);
        setProofCapturing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao processar foto.");
      setIsLoading(false);
      setProofCapturing(false);
    }
  };

  if (!courier) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BikeIcon size={48} className="text-primary" />
          <h1 className="text-2xl font-bold">Portal do Entregador</h1>
          <p className="text-sm text-muted-foreground">Informe seu código de acesso para entrar.</p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="Código do entregador (ID)"
            className="h-12 w-full rounded-xl border border-input bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
          />
          <button
            onClick={() => void handleLogin()}
            disabled={isLoading || !loginId.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isLoading ? <Loader2Icon size={18} className="animate-spin" /> : <NavigationIcon size={18} />}
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BikeIcon size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{courier.name}</p>
              <p className="text-xs text-muted-foreground">{courier.vehicleType ?? "Moto"}</p>
            </div>
          </div>

          <button
            onClick={() => void handleToggleAvailability()}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isAvailable
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {isAvailable ? "Disponível" : "Indisponível"}
          </button>
        </div>

        {isTracking && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            GPS ativo — rastreando sua localização
          </div>
        )}
      </header>

      <main className="flex-1 space-y-4 p-4">
        {/* Entrega em andamento */}
        {deliveryTarget && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <PackageIcon size={18} className="text-blue-600" />
              <p className="font-semibold text-blue-800">Entrega em andamento</p>
            </div>
            <p className="text-sm font-medium">#{deliveryTarget.id} — {deliveryTarget.customerName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{deliveryTarget.deliveryAddress}</p>
            <p className="mt-1 text-sm font-semibold text-blue-700">{formatCurrency(deliveryTarget.total)}</p>

            {deliveryTarget.hasPizza && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <AlertTriangleIcon size={16} className="mt-0.5 shrink-0 text-orange-600" />
                <p className="text-xs font-semibold text-orange-800">
                  Atenção: Este pedido contém Pizza! Utilize a mochila térmica redonda.
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(deliveryTarget.deliveryAddress ?? "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-medium"
              >
                <MapPinIcon size={14} />
                Ver no mapa
              </a>
              <button
                onClick={handleDeliverProof}
                disabled={isLoading || proofCapturing}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2Icon size={14} className="animate-spin" />
                ) : (
                  <CameraIcon size={14} />
                )}
                Confirmar entrega
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void handleFileSelected(e)}
            />
          </div>
        )}

        {/* Lista de pedidos disponíveis */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Pedidos para entrega</h2>
            <button
              onClick={() => void refreshOrders()}
              className="text-xs text-muted-foreground underline"
            >
              Atualizar
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white py-12">
              <CheckCircle2Icon size={36} className="text-slate-200" />
              <p className="text-sm text-muted-foreground">Nenhum pedido disponível no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm">#{order.id} — {order.customerName}</p>
                        {order.hasPizza && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                            🍕
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPinIcon size={11} />
                        <span className="truncate">{order.deliveryAddress ?? "Endereço não informado"}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-primary">{formatCurrency(order.total)}</p>
                    </div>

                    <button
                      onClick={() => void handleClaimOrder(order)}
                      disabled={isLoading || deliveryTarget !== null}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {isLoading ? <Loader2Icon size={12} className="animate-spin" /> : <BikeIcon size={12} />}
                      Assumir
                    </button>
                  </div>

                  {order.hasPizza && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-orange-50 px-2 py-1.5">
                      <AlertTriangleIcon size={12} className="text-orange-500" />
                      <p className="text-[11px] font-medium text-orange-700">
                        Contém Pizza — use mochila térmica redonda
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contato */}
        {courier.phone && (
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <PhoneIcon size={16} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Suporte: <strong>{courier.phone}</strong></p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
