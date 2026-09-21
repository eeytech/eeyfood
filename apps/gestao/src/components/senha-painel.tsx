"use client";

import type { OrderStatus, PedidoRecebimento } from "@fsw/db";
import {
  BellRingIcon,
  ChefHatIcon,
  Clock3Icon,
  LogOutIcon,
  SparklesIcon,
  UserIcon,
  Volume2Icon,
  VolumeXIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import { logoutAction } from "@/lib/auth/actions";
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

type DisplayMode = "NAME_AND_NUMBER" | "NAME" | "NUMBER";

const PREPARING_STATUSES: OrderStatus[] = ["PENDING", "IN_PREPARATION"];
const READY_STATUS: OrderStatus = "READY_FOR_PICKUP";

const playChime = (ctx: AudioContext) => {
  try {
    const notes = [523.25, 659.25, 783.99]; // Dó, Mi, Sol
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
  } catch {
    // áudio não permitido antes da primeira interação
  }
};

const SenhaPainel = ({ slug, restaurantName, initialOrders }: SenhaPainelProps) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [newlyReadyIds, setNewlyReadyIds] = useState<Set<number>>(new Set());
  const [socketConnected, setSocketConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("NAME_AND_NUMBER");

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
  const [lastSyncOk, setLastSyncOk] = useState(true);

  const websocketUrl = (() => {
    const raw = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
    if (!raw) return "http://localhost:4000";
    if (raw.includes("websocket.eeytech.com") && !raw.includes("fswdonalds")) {
      return raw.replace("websocket.eeytech.com", "websocket.fswdonalds.eeytech.com");
    }
    return raw;
  })();

  // Inicialização do áudio com interação
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
  };

  // Relógio digital em tempo real
  useEffect(() => {
    setMounted(true);
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Notificar quando um pedido fica pronto
  const triggerReadyAlert = (orderId: number) => {
    if (audioCtxRef.current) {
      playChime(audioCtxRef.current);
    }
    setNewlyReadyIds((prev) => new Set(prev).add(orderId));
    setTimeout(() => {
      setNewlyReadyIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, 6000);
  };

  const syncOrder = async (orderId: number, wasReady = false) => {
    const response = await fetch(`/api/pedidos/${String(orderId)}`, {
      cache: "no-store",
    });
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
      triggerReadyAlert(order.id);
    }
  };

  // Sincronização geral de pedidos (usado no polling de segurança)
  const syncAllOrders = async () => {
    try {
      const response = await fetch(`/api/pedidos?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setLastSyncOk(false);
        return;
      }
      const data = (await response.json()) as PedidoRecebimento[];
      if (Array.isArray(data)) {
        setLastSyncOk(true);
        // Detecta pedidos que recém ficaram prontos
        data.forEach((newOrder) => {
          if (newOrder.status === READY_STATUS) {
            const previous = allOrders.find((o) => o.id === newOrder.id);
            if (!previous || previous.status !== READY_STATUS) {
              triggerReadyAlert(newOrder.id);
            }
          }
        });

        setAllOrders(data);
        setColumns(filterOrders(data));
      }
    } catch {
      setLastSyncOk(false);
    }
  };

  // Conexão WebSockets com fallback para polling
  useEffect(() => {
    const socket = io(websocketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 2,
      reconnectionDelay: 10000,
      timeout: 5000,
    });

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit("JOIN_RESTAURANT_ROOM", slug);
    };

    const handleDisconnect = () => setSocketConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);

    socket.on("NEW_ORDER", (payload: NovoPedidoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      void syncOrder(payload.orderId);
    });

    socket.on("ORDER_UPDATED", (payload: PedidoAtualizadoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      const wasReady =
        allOrders.find((o) => o.id === payload.orderId)?.status === READY_STATUS;
      void syncOrder(payload.orderId, wasReady);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
      socket.off("NEW_ORDER");
      socket.off("ORDER_UPDATED");
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, websocketUrl]);

  // Polling automático de segurança se o socket estiver desconectado
  useEffect(() => {
    const interval = setInterval(() => {
      if (!socketConnected) {
        void syncAllOrders();
      }
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketConnected, slug]);

  const getDisplayName = (order: PedidoRecebimento) => {
    const raw = order.customerName?.trim();
    if (raw && raw.toLowerCase() !== "cliente") {
      return raw;
    }
    return `Pedido #${order.id}`;
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-950 text-white select-none"
      onClick={initAudio}
    >
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-900/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
            <BellRingIcon size={20} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white leading-tight">
              {restaurantName}
            </h1>
            <p className="text-xs text-slate-400">Painel de Senhas e Chamadas</p>
          </div>
        </div>

        {/* Display mode buttons */}
        <div className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-white/5 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDisplayMode("NAME_AND_NUMBER");
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              displayMode === "NAME_AND_NUMBER"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white",
            )}
          >
            Nome + Senha
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDisplayMode("NAME");
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              displayMode === "NAME"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white",
            )}
          >
            Apenas Nome
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDisplayMode("NUMBER");
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              displayMode === "NUMBER"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white",
            )}
          >
            Apenas Senha (#)
          </button>
        </div>

        {/* Status, Clock and Audio Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-3 py-1.5 border border-white/5 font-mono text-sm font-semibold text-slate-200">
            <Clock3Icon size={14} className="text-amber-400" />
            <span suppressHydrationWarning>{mounted && currentTime ? currentTime : "--:--:--"}</span>
          </div>

          <div
            title={
              socketConnected
                ? "Canal de tempo real via WebSockets conectado"
                : lastSyncOk
                  ? "Sincronização contínua em segundo plano ativa"
                  : "Sem conexão com o servidor. Tentando restabelecer..."
            }
            className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs"
          >
            {socketConnected || lastSyncOk ? (
              <WifiIcon size={13} className="text-emerald-400" />
            ) : (
              <WifiOffIcon size={13} className="text-rose-400" />
            )}
            <span
              className={cn(
                "font-medium",
                socketConnected || lastSyncOk ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {socketConnected || lastSyncOk ? "Sincronizado" : "Reconectando"}
            </span>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                socketConnected
                  ? "bg-emerald-500"
                  : lastSyncOk
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-rose-500 animate-pulse",
              )}
            />
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors",
              audioEnabled
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse",
            )}
            onClick={(e) => {
              e.stopPropagation();
              initAudio();
            }}
          >
            {audioEnabled ? <Volume2Icon size={14} /> : <VolumeXIcon size={14} />}
            <span className="hidden sm:inline">
              {audioEnabled ? "Áudio Ativo" : "Ativar Som"}
            </span>
          </div>

          <button
            type="button"
            title="Desconectar do painel da TV"
            onClick={async (e) => {
              e.stopPropagation();
              if (window.confirm("Deseja desconectar e sair desta TV?")) {
                await logoutAction();
              }
            }}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-rose-500/50 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
          >
            <LogOutIcon size={13} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Columns */}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {/* Em Preparação */}
        <section className="flex flex-col p-6 sm:p-8 bg-slate-950">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400/20">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <ChefHatIcon size={20} />
                Em Preparação
              </h2>
            </div>
            <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-300">
              {preparing.length} pedido{preparing.length !== 1 ? "s" : ""}
            </span>
          </div>

          {preparing.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-600">
              <ChefHatIcon size={48} className="opacity-20 mb-3" />
              <p className="text-base font-medium">Nenhum pedido em preparo</p>
              <p className="text-xs text-slate-700 mt-1">
                Novos pedidos aparecerão aqui automaticamente
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {preparing.map((order) => {
                const displayName = getDisplayName(order);
                const hasCustomerName =
                  order.customerName &&
                  order.customerName.trim().toLowerCase() !== "cliente";

                return (
                  <div
                    key={order.id}
                    className="flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 transition-all hover:border-amber-500/50"
                  >
                    {/* Identificação Principal */}
                    {displayMode === "NUMBER" ? (
                      <p className="font-display text-3xl sm:text-4xl font-black text-amber-300">
                        #{order.id}
                      </p>
                    ) : displayMode === "NAME" ? (
                      <p className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                        {displayName}
                      </p>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <p className="font-display text-lg sm:text-xl font-bold text-white leading-tight truncate">
                            {hasCustomerName ? order.customerName : `Pedido #${order.id}`}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                              #{order.id}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-amber-400/70">
                              {order.consumptionMethod === "DINE_IN"
                                ? "Salão"
                                : "Balcão"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Prontos */}
        <section className="flex flex-col bg-emerald-950/20 p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-emerald-500/20 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400/20">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <SparklesIcon size={20} />
                Pronto — Retire Aqui
              </h2>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-300">
              {ready.length} pronto{ready.length !== 1 ? "s" : ""}
            </span>
          </div>

          {ready.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-600">
              <SparklesIcon size={48} className="opacity-20 mb-3" />
              <p className="text-base font-medium">Nenhum pedido pronto no momento</p>
              <p className="text-xs text-slate-700 mt-1">
                Quando a cozinha finalizar um prato, ele chamará o cliente aqui
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ready.map((order) => {
                const isNew = newlyReadyIds.has(order.id);
                const displayName = getDisplayName(order);
                const hasCustomerName =
                  order.customerName &&
                  order.customerName.trim().toLowerCase() !== "cliente";

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300",
                      isNew
                        ? "animate-pulse border-emerald-400 bg-emerald-500/25 ring-2 ring-emerald-400 shadow-[0_0_35px_8px_rgba(52,211,153,0.4)] scale-[1.02]"
                        : "border-emerald-500/40 bg-emerald-500/15 hover:border-emerald-400/60",
                    )}
                  >
                    {/* Alerta de chamada */}
                    {isNew && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 animate-bounce">
                        <BellRingIcon size={14} />
                        Chamando agora!
                      </div>
                    )}

                    {/* Conteúdo Principal com base no modo */}
                    {displayMode === "NUMBER" ? (
                      <div className="text-center py-2">
                        <span className="font-display text-5xl sm:text-6xl font-black text-emerald-300 tracking-tight">
                          #{order.id}
                        </span>
                      </div>
                    ) : displayMode === "NAME" ? (
                      <div className="py-2">
                        <p className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight truncate">
                          {displayName}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight break-words">
                            {hasCustomerName ? order.customerName : `Pedido #${order.id}`}
                          </p>
                          <span className="shrink-0 rounded-full bg-emerald-400 px-3 py-1 font-mono text-base font-black text-slate-950 shadow-sm">
                            #{order.id}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tag de Retirada */}
                    <div className="mt-4 flex items-center justify-between border-t border-emerald-500/20 pt-3 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <UserIcon size={13} />
                        Retire no balcão
                      </span>
                      <span className="text-[11px] font-mono text-emerald-300/70">
                        {order.consumptionMethod === "DINE_IN" ? "Salão" : "Balcão"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Footer instruction */}
      <footer className="flex items-center justify-between border-t border-white/5 bg-slate-900/80 px-8 py-3 text-xs text-slate-500">
        <p>
          {audioEnabled
            ? "🔔 Alerta sonoro ativo para novos pedidos prontos"
            : "👆 Toque em qualquer lugar da tela para ativar o som de chamada"}
        </p>
        <p className="hidden sm:inline">Pressione F11 para tela cheia na TV</p>
      </footer>
    </div>
  );
};

export default SenhaPainel;
