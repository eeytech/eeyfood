"use client";

import type { OrderStatus, PedidoRecebimento } from "@fsw/db";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import { cn } from "@/lib/utils";

interface SenhaPainelProps {
  slug: string;
  restaurantName: string;
  initialOrders: PedidoRecebimento[];
}

interface PedidoAtualizadoEvento {
  orderId: number;
  restaurantSlug: string;
  status?: string;
  sentAt: string;
}

interface NovoPedidoEvento {
  orderId: number;
  restaurantSlug: string;
  sentAt: string;
}

const PREPARING_STATUSES: OrderStatus[] = ["PENDING", "IN_PREPARATION"];
const READY_STATUS: OrderStatus = "READY_FOR_PICKUP";

const playChime = (ctx: AudioContext) => {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.9);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.9);
  });
};

const SenhaPainel = ({ slug, restaurantName, initialOrders }: SenhaPainelProps) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [newlyReadyIds, setNewlyReadyIds] = useState<Set<number>>(new Set());

  const filterOrders = (orders: PedidoRecebimento[]) => ({
    preparing: orders.filter(
      (o) =>
        PREPARING_STATUSES.includes(o.status as OrderStatus) &&
        o.consumptionMethod !== "DELIVERY",
    ),
    ready: orders.filter(
      (o) => o.status === READY_STATUS && o.consumptionMethod !== "DELIVERY",
    ),
  });

  const [{ preparing, ready }, setColumns] = useState(() =>
    filterOrders(initialOrders),
  );
  const [allOrders, setAllOrders] = useState<PedidoRecebimento[]>(initialOrders);

  const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://localhost:4000";

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
  };

  const syncOrder = async (orderId: number, wasReady = false) => {
    const response = await fetch(`/api/pedidos/${String(orderId)}`, { cache: "no-store" });
    if (!response.ok) return;

    const order = (await response.json()) as PedidoRecebimento;

    setAllOrders((current) => {
      const exists = current.some((o) => o.id === order.id);
      const isActive =
        PREPARING_STATUSES.includes(order.status as OrderStatus) ||
        order.status === READY_STATUS;
      const updated = exists
        ? current.map((o) => (o.id === order.id ? order : o))
        : isActive
          ? [order, ...current]
          : current;
      const filtered = updated.filter(
        (o) =>
          PREPARING_STATUSES.includes(o.status as OrderStatus) ||
          o.status === READY_STATUS,
      );
      setColumns(filterOrders(filtered));
      return filtered;
    });

    if (!wasReady && order.status === READY_STATUS) {
      if (audioCtxRef.current) {
        playChime(audioCtxRef.current);
      }
      setNewlyReadyIds((prev) => new Set(prev).add(order.id));
      setTimeout(() => {
        setNewlyReadyIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }, 4000);
    }
  };

  useEffect(() => {
    const socket = io(websocketUrl, { transports: ["websocket"] });

    socket.on("connect", () => socket.emit("JOIN_RESTAURANT_ROOM", slug));

    socket.on("NEW_ORDER", (payload: NovoPedidoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      void syncOrder(payload.orderId);
    });

    socket.on("ORDER_UPDATED", (payload: PedidoAtualizadoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      const wasReady = allOrders.find((o) => o.id === payload.orderId)?.status === READY_STATUS;
      void syncOrder(payload.orderId, wasReady);
    });

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, websocketUrl]);

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-950 text-white"
      onClick={initAudio}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-8 py-4">
        <h1 className="text-xl font-bold tracking-tight text-white">
          {restaurantName}
        </h1>
        <p className="text-sm font-medium text-slate-400">Painel de Senhas</p>
      </header>

      {/* Columns */}
      <div className="grid flex-1 grid-cols-2 divide-x divide-white/10">
        {/* Em Preparação */}
        <section className="flex flex-col p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <h2 className="text-base font-semibold uppercase tracking-widest text-amber-400">
              Em Preparação
            </h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {preparing.length === 0 && (
              <p className="text-sm text-slate-600">Nenhum pedido em preparo</p>
            )}
            {preparing.map((order) => (
              <div
                key={order.id}
                className="flex h-20 w-28 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10"
              >
                <span className="text-3xl font-bold text-amber-300">
                  #{order.id}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Prontos */}
        <section className="flex flex-col bg-emerald-950/20 p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
            <h2 className="text-base font-semibold uppercase tracking-widest text-emerald-400">
              Pronto — Retire Aqui
            </h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {ready.length === 0 && (
              <p className="text-sm text-slate-600">Nenhum pedido pronto</p>
            )}
            {ready.map((order) => {
              const isNew = newlyReadyIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex h-28 w-36 flex-col items-center justify-center rounded-xl border transition-all",
                    isNew
                      ? "animate-pulse border-emerald-400 bg-emerald-400/20 shadow-[0_0_24px_4px_rgba(52,211,153,0.35)]"
                      : "border-emerald-500/40 bg-emerald-500/15",
                  )}
                >
                  <span
                    className={cn(
                      "text-4xl font-black",
                      isNew ? "text-emerald-200" : "text-emerald-300",
                    )}
                  >
                    #{order.id}
                  </span>
                  {isNew && (
                    <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                      Retire!
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer instruction */}
      <footer className="border-t border-white/5 bg-slate-900/60 px-8 py-3 text-center">
        <p className="text-xs text-slate-600">
          Toque na tela uma vez para ativar o som de chamada
        </p>
      </footer>
    </div>
  );
};

export default SenhaPainel;
