"use client";

import type { OrderStatus, PedidoRecebimento } from "@fsw/db";
import {
  CheckCircle2Icon,
  ChefHatIcon,
  Clock3Icon,
  UtensilsCrossedIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import { cn } from "@/lib/utils";

interface KdsPainelProps {
  slug: string;
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

const KDS_STATUSES: OrderStatus[] = ["PENDING", "IN_PREPARATION"];

const getConsumptionLabel = (
  method: PedidoRecebimento["consumptionMethod"],
) => {
  if (method === "DINE_IN") return "Salão";
  if (method === "DELIVERY") return "Entrega";
  return "Balcão";
};

const getConsumptionStyle = (
  method: PedidoRecebimento["consumptionMethod"],
) => {
  if (method === "DINE_IN")
    return "border-blue-500/40 bg-blue-500/15 text-blue-300";
  if (method === "DELIVERY")
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
};

const KdsPainel = ({ slug, initialOrders }: KdsPainelProps) => {
  const [orders, setOrders] = useState<PedidoRecebimento[]>(() =>
    initialOrders.filter((o) => KDS_STATUSES.includes(o.status as OrderStatus)),
  );
  const [socketConnected, setSocketConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loadingOrderIds, setLoadingOrderIds] = useState<number[]>([]);
  const [exitingOrderIds, setExitingOrderIds] = useState<Set<number>>(
    new Set(),
  );
  const audioCtxRef = useRef<AudioContext | null>(null);

  const websocketUrl =
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
  };

  const playBip = () => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // ignore audio errors
    }
  };

  const exitOrder = (orderId: number) => {
    setExitingOrderIds((prev) => new Set(prev).add(orderId));
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setExitingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, 500);
  };

  const syncOrderById = async (orderId: number, isNew = false) => {
    const response = await fetch(`/api/pedidos/${String(orderId)}`, {
      cache: "no-store",
    });
    if (!response.ok) return;

    const order = (await response.json()) as PedidoRecebimento;
    const isKds = KDS_STATUSES.includes(order.status as OrderStatus);

    if (isNew && isKds) playBip();

    setOrders((current) => {
      const exists = current.some((o) => o.id === order.id);

      if (!exists) {
        return isKds ? [order, ...current] : current;
      }

      if (!isKds) {
        exitOrder(order.id);
        return current;
      }

      return current.map((o) => (o.id === order.id ? order : o));
    });
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = io(websocketUrl, { transports: ["websocket"] });

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit("JOIN_RESTAURANT_ROOM", slug);
    };

    const handleDisconnect = () => setSocketConnected(false);

    const handleNewOrder = async (payload: NovoPedidoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      await syncOrderById(payload.orderId, true);
    };

    const handleOrderUpdated = async (payload: PedidoAtualizadoEvento) => {
      if (payload.restaurantSlug !== slug) return;
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

  const handleAdvance = async (order: PedidoRecebimento) => {
    initAudio();

    const nextStatus: OrderStatus =
      order.status === "PENDING"
        ? "IN_PREPARATION"
        : order.consumptionMethod === "DELIVERY"
          ? "OUT_FOR_DELIVERY"
          : "READY_FOR_PICKUP";

    try {
      setLoadingOrderIds((prev) => [...prev, order.id]);

      const response = await fetch(`/api/pedidos/${String(order.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) return;

      const updated = (await response.json()) as PedidoRecebimento;

      if (!KDS_STATUSES.includes(updated.status as OrderStatus)) {
        exitOrder(order.id);
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o)),
        );
      }
    } finally {
      setLoadingOrderIds((prev) => prev.filter((id) => id !== order.id));
    }
  };

  const getElapsedSeconds = (order: PedidoRecebimento) => {
    const ref = new Date(order.scheduledFor ?? order.createdAt).getTime();
    return Math.floor((now - ref) / 1000);
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getTimerClass = (elapsed: number) => {
    if (elapsed >= 25 * 60) return "animate-pulse font-bold text-red-400";
    if (elapsed >= 15 * 60) return "font-semibold text-yellow-400";
    return "text-slate-500";
  };

  const sorted = [...orders].sort(
    (a, b) =>
      new Date(a.scheduledFor ?? a.createdAt).getTime() -
      new Date(b.scheduledFor ?? b.createdAt).getTime(),
  );

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-xl bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <ChefHatIcon className="text-primary" size={20} />
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              KDS — Cozinha
            </h1>
            <p className="text-[10px] text-slate-500">
              Kitchen Display System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            <span className="font-medium text-slate-300">{orders.length}</span>{" "}
            pedido{orders.length !== 1 ? "s" : ""} ativo
            {orders.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1.5">
            {socketConnected ? (
              <WifiIcon size={13} className="text-emerald-400" />
            ) : (
              <WifiOffIcon size={13} className="text-rose-400" />
            )}
            <span
              className={cn(
                "text-xs",
                socketConnected ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {socketConnected ? "Sincronizado" : "Reconectando"}
            </span>
            <span
              className={cn(
                "h-2 w-2 animate-pulse rounded-full",
                socketConnected ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        {sorted.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <UtensilsCrossedIcon className="text-slate-800" size={52} />
            <p className="text-lg font-medium text-slate-600">
              Nenhum pedido em produção
            </p>
            <p className="text-sm text-slate-700">
              Aguardando novos pedidos...
            </p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {sorted.map((order) => {
              const elapsed = getElapsedSeconds(order);
              const isExiting = exitingOrderIds.has(order.id);
              const isLoading = loadingOrderIds.includes(order.id);
              const isPending = order.status === "PENDING";

              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex flex-col rounded-xl border bg-slate-900 transition-all duration-500",
                    isPending
                      ? "border-amber-500/30"
                      : "border-sky-500/30",
                    isExiting ? "scale-90 opacity-0" : "scale-100 opacity-100",
                  )}
                >
                  {/* Card header */}
                  <div
                    className={cn(
                      "rounded-t-xl px-4 py-3",
                      isPending ? "bg-amber-500/10" : "bg-sky-500/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "font-display text-2xl font-bold leading-none",
                            isPending ? "text-amber-300" : "text-sky-300",
                          )}
                        >
                          #{order.id}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-white/85">
                          {order.customerName}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                            getConsumptionStyle(order.consumptionMethod),
                          )}
                        >
                          {getConsumptionLabel(order.consumptionMethod)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                            isPending
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border-sky-500/40 bg-sky-500/15 text-sky-300",
                          )}
                        >
                          {isPending ? "Aguardando" : "Em produção"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex-1 space-y-1.5 px-4 py-3">
                    {order.orderProducts.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg bg-slate-800/70 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white/90">
                            {item.product.name}
                          </p>
                          {item.orderProductOptions.length > 0 && (
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {item.orderProductOptions
                                .map((o) => o.nameSnapshot)
                                .join(", ")}
                            </p>
                          )}
                          {item.notes && (
                            <p className="mt-0.5 text-[11px] italic text-amber-400/90">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-sm font-bold text-white">
                          {item.quantity}×
                        </span>
                      </div>
                    ))}

                    {order.notes && (
                      <div className="mt-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                          Obs. do pedido
                        </p>
                        <p className="text-xs italic text-amber-300/80">
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="rounded-b-xl border-t border-white/5 px-4 py-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock3Icon
                          size={13}
                          className={getTimerClass(elapsed)}
                        />
                        <span
                          className={cn(
                            "font-mono text-sm",
                            getTimerClass(elapsed),
                          )}
                        >
                          {formatElapsed(elapsed)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-600">
                        {order.orderProducts.length} item
                        {order.orderProducts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {isPending ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAdvance(order)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
                      >
                        <ChefHatIcon size={14} />
                        Preparar
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAdvance(order)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
                      >
                        <CheckCircle2Icon size={14} />
                        Pronto
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default KdsPainel;
