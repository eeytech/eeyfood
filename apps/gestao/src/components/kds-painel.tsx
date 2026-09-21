"use client";

import type { OrderStatus, PedidoRecebimento, ProductionSector } from "@fsw/db";
import {
  CheckCircle2Icon,
  ChefHatIcon,
  Clock3Icon,
  HelpCircleIcon,
  LogOutIcon,
  PackageCheckIcon,
  UtensilsCrossedIcon,
  Volume2Icon,
  VolumeXIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

interface KdsPainelProps {
  slug: string;
  initialOrders: PedidoRecebimento[];
  sectors: ProductionSector[];
  initialSectorId?: string;
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

interface ItemAtualizadoEvento {
  orderId: number;
  itemId: string;
  restaurantSlug: string;
  itemStatus: string;
  sentAt: string;
}

const KDS_STATUSES: OrderStatus[] = ["PENDING", "IN_PREPARATION"];
const EXPEDICAO_ID = "expedicao";

const getConsumptionLabel = (method: PedidoRecebimento["consumptionMethod"]) => {
  if (method === "DINE_IN") return "Salão";
  if (method === "DELIVERY") return "Entrega";
  return "Balcão";
};

const getConsumptionStyle = (method: PedidoRecebimento["consumptionMethod"]) => {
  if (method === "DINE_IN") return "border-blue-500/40 bg-blue-500/15 text-blue-300";
  if (method === "DELIVERY") return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
};

const KdsPainel = ({ slug, initialOrders, sectors, initialSectorId }: KdsPainelProps) => {
  const router = useRouter();
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(
    initialSectorId ?? null,
  );
  const [orders, setOrders] = useState<PedidoRecebimento[]>(() =>
    initialOrders.filter((o) => KDS_STATUSES.includes(o.status as OrderStatus)),
  );
  const [socketConnected, setSocketConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loadingOrderIds, setLoadingOrderIds] = useState<number[]>([]);
  const [loadingItemIds, setLoadingItemIds] = useState<string[]>([]);
  const [exitingOrderIds, setExitingOrderIds] = useState<Set<number>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lastSyncOk, setLastSyncOk] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);

  const websocketUrl = (() => {
    const raw = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
    if (!raw) return "http://localhost:4000";
    if (raw.includes("websocket.eeytech.com") && !raw.includes("fswdonalds")) {
      return raw.replace("websocket.eeytech.com", "websocket.fswdonalds.eeytech.com");
    }
    return raw;
  })();

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
  };

  const playBip = () => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      // Alerta sonoro duplo nítido para cozinha (880Hz -> 1174Hz)
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const t = ctx.currentTime;
      playTone(880, t, 0.16);
      playTone(1174, t + 0.20, 0.28);
    } catch {
      // ignore audio errors
    }
  };

  const changeSector = (sectorId: string | null) => {
    setSelectedSectorId(sectorId);
    const url = sectorId ? `/kds?setor=${sectorId}` : "/kds";
    router.replace(url, { scroll: false });
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
    const response = await fetch(`/api/pedidos/${String(orderId)}`, { cache: "no-store" });
    if (!response.ok) return;

    const order = (await response.json()) as PedidoRecebimento;
    const isKds = KDS_STATUSES.includes(order.status as OrderStatus);

    if (isNew && isKds) playBip();

    setOrders((current) => {
      const exists = current.some((o) => o.id === order.id);
      if (!exists) return isKds ? [order, ...current] : current;
      if (!isKds) { exitOrder(order.id); return current; }
      return current.map((o) => (o.id === order.id ? order : o));
    });
  };

  useEffect(() => {
    if (initialSectorId !== undefined) {
      setSelectedSectorId(initialSectorId ?? null);
    }
  }, [initialSectorId]);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Sincronização geral de fallback (usado se o WebSocket estiver desconectado)
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
        const kdsOrders = data.filter((o) => KDS_STATUSES.includes(o.status as OrderStatus));
        setOrders((current) => {
          const hasNew = kdsOrders.some(
            (incoming) =>
              incoming.status === "PENDING" &&
              !current.some((existing) => existing.id === incoming.id),
          );
          if (hasNew) {
            playBip();
          }
          return kdsOrders;
        });
      }
    } catch {
      setLastSyncOk(false);
    }
  };

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

    const handleNewOrder = async (payload: NovoPedidoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      await syncOrderById(payload.orderId, true);
    };

    const handleOrderUpdated = async (payload: PedidoAtualizadoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      await syncOrderById(payload.orderId);
    };

    const handleItemUpdated = (payload: ItemAtualizadoEvento) => {
      if (payload.restaurantSlug !== slug) return;
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== payload.orderId) return order;
          return {
            ...order,
            orderProducts: order.orderProducts.map((item) =>
              item.id === payload.itemId
                ? { ...item, itemStatus: payload.itemStatus as "PENDING" | "READY" }
                : item,
            ),
          };
        }),
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);
    socket.on("NEW_ORDER", handleNewOrder);
    socket.on("ORDER_UPDATED", handleOrderUpdated);
    socket.on("ITEM_UPDATED", handleItemUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.off("ORDER_UPDATED", handleOrderUpdated);
      socket.off("ITEM_UPDATED", handleItemUpdated);
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

  const handleAdvanceOrder = async (order: PedidoRecebimento) => {
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
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    } finally {
      setLoadingOrderIds((prev) => prev.filter((id) => id !== order.id));
    }
  };

  const handleToggleItem = async (
    orderId: number,
    itemId: string,
    currentStatus: string,
  ) => {
    initAudio();
    if (loadingItemIds.includes(itemId)) return;

    const nextStatus: "PENDING" | "READY" = currentStatus === "READY" ? "PENDING" : "READY";

    // 1. Atualização otimista imediata na UI
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          orderProducts: order.orderProducts.map((item) =>
            item.id === itemId
              ? { ...item, itemStatus: nextStatus }
              : item,
          ),
        };
      }),
    );

    try {
      setLoadingItemIds((prev) => [...prev, itemId]);
      const response = await fetch(`/api/pedidos/${String(orderId)}/itens/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemStatus: nextStatus }),
      });

      if (!response.ok) {
        // Reverte se a requisição falhar no servidor
        setOrders((current) =>
          current.map((order) => {
            if (order.id !== orderId) return order;
            return {
              ...order,
              orderProducts: order.orderProducts.map((item) =>
                item.id === itemId
                  ? { ...item, itemStatus: currentStatus as "PENDING" | "READY" }
                  : item,
              ),
            };
          }),
        );
      }
    } catch {
      // Reverte se houver erro de rede
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            orderProducts: order.orderProducts.map((item) =>
              item.id === itemId
                ? { ...item, itemStatus: currentStatus as "PENDING" | "READY" }
                : item,
            ),
          };
        }),
      );
    } finally {
      setLoadingItemIds((prev) => prev.filter((id) => id !== itemId));
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

  // Compute display orders/items based on selected sector
  const isExpedicao = selectedSectorId === EXPEDICAO_ID;

  const displayOrders = sorted
    .map((order) => {
      if (!selectedSectorId || isExpedicao) return order;
      const sectorItems = order.orderProducts.filter(
        (item) => item.productionSector?.id === selectedSectorId,
      );
      if (sectorItems.length === 0) return null;
      return { ...order, orderProducts: sectorItems };
    })
    .filter((o): o is PedidoRecebimento => o !== null);

  const allItemsReady = (order: PedidoRecebimento) => {
    const sectoredItems = orders
      .find((o) => o.id === order.id)
      ?.orderProducts.filter((item) => item.productionSector !== null);
    if (!sectoredItems || sectoredItems.length === 0) return true;
    return sectoredItems.every((item) => item.itemStatus === "READY");
  };

  const sectorLabel =
    selectedSectorId === null
      ? "Todos"
      : isExpedicao
        ? "Expedição"
        : (sectors.find((s) => s.id === selectedSectorId)?.name ?? "Setor");

  return (
    <div
      className="flex min-h-screen w-full flex-col overflow-hidden bg-slate-950 text-white select-none"
      onClick={initAudio}
    >
      {/* Header */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 bg-slate-900/80 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHatIcon className="text-primary" size={20} />
            <div>
              <h1 className="text-sm font-semibold leading-tight">
                KDS — {sectorLabel}
              </h1>
              <p className="text-[10px] text-slate-500">Kitchen Display System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">
              <span className="font-medium text-slate-300">{displayOrders.length}</span>{" "}
              pedido{displayOrders.length !== 1 ? "s" : ""} ativo
              {displayOrders.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5">
              {socketConnected || lastSyncOk ? (
                <WifiIcon size={13} className="text-emerald-400" />
              ) : (
                <WifiOffIcon size={13} className="text-rose-400" />
              )}
              <span
                className={cn(
                  "text-xs",
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
                {audioEnabled ? "Som Ativo" : "Ativar Som"}
              </span>
            </div>

            {/* Botão de Legenda */}
            <button
              type="button"
              title="Guia e legenda de cores, tempos e status do KDS"
              onClick={(e) => {
                e.stopPropagation();
                setLegendOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-sky-500/20 hover:text-sky-300 cursor-pointer"
            >
              <HelpCircleIcon size={13} className="text-sky-400" />
              <span className="hidden sm:inline">Legenda</span>
            </button>

            <button
              type="button"
              title="Desconectar do KDS da Cozinha"
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("Deseja desconectar e sair do painel KDS?")) {
                  await logoutAction();
                }
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-rose-500/50 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
            >
              <LogOutIcon size={13} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Sector tabs */}
        {sectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => changeSector(null)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedSectorId === null
                  ? "bg-primary text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
              )}
            >
              Todos
            </button>
            {sectors.map((sector) => (
              <button
                key={sector.id}
                type="button"
                onClick={() => changeSector(sector.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  selectedSectorId === sector.id
                    ? "text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                )}
                style={
                  selectedSectorId === sector.id
                    ? { backgroundColor: sector.color }
                    : undefined
                }
              >
                {sector.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => changeSector(EXPEDICAO_ID)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isExpedicao
                  ? "bg-violet-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
              )}
            >
              Expedição
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 p-4">
        {displayOrders.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <UtensilsCrossedIcon className="text-slate-800" size={52} />
            <p className="text-lg font-medium text-slate-600">
              Nenhum pedido em produção
            </p>
            <p className="text-sm text-slate-700">Aguardando novos pedidos...</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {displayOrders.map((order) => {
              const elapsed = getElapsedSeconds(order);
              const isExiting = exitingOrderIds.has(order.id);
              const isLoading = loadingOrderIds.includes(order.id);
              const isPending = order.status === "PENDING";
              const ready = allItemsReady(order);
              const isAllSectorItemsReady =
                selectedSectorId !== null &&
                !isExpedicao &&
                order.orderProducts.length > 0 &&
                order.orderProducts.every((i) => i.itemStatus === "READY");

              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex flex-col rounded-xl border bg-slate-900 transition-all duration-500",
                    isAllSectorItemsReady
                      ? "border-emerald-500/50 shadow-sm shadow-emerald-500/10"
                      : isPending
                        ? "border-amber-500/30"
                        : "border-sky-500/30",
                    isExiting ? "scale-90 opacity-0" : "scale-100 opacity-100",
                  )}
                >
                  {/* Brand banner for Dark Kitchen */}
                  {order.brandName && (
                    <div
                      className="flex items-center justify-center rounded-t-xl px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
                      style={{ backgroundColor: order.brandColor ?? "#6366f1" }}
                    >
                      {order.brandName}
                    </div>
                  )}

                  {/* Card header */}
                  <div
                    className={cn(
                      "px-4 py-3",
                      order.brandName ? "" : "rounded-t-xl",
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
                    {order.orderProducts.map((item) => {
                      const isItemLoading = loadingItemIds.includes(item.id);
                      const isItemReady = item.itemStatus === "READY";
                      const showItemToggle = selectedSectorId !== null && !isExpedicao;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start gap-3 rounded-lg px-3 py-2 transition-colors",
                            isItemReady
                              ? "bg-emerald-900/30 ring-1 ring-emerald-500/30"
                              : "bg-slate-800/70",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isItemReady ? "text-emerald-300 line-through" : "text-white/90",
                              )}
                            >
                              {item.productNameSnapshot || item.product.name}
                            </p>
                            {item.orderProductOptions.length > 0 && (
                              <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-slate-300">
                                {(() => {
                                  const counts = new Map<string, { name: string; count: number }>();
                                  for (const opt of item.orderProductOptions) {
                                    const key = opt.productOptionId || opt.nameSnapshot;
                                    const existing = counts.get(key);
                                    if (existing) existing.count += 1;
                                    else counts.set(key, { name: opt.nameSnapshot, count: 1 });
                                  }
                                  return Array.from(counts.entries()).map(([k, opt]) => (
                                    <span key={k}>• {opt.count > 1 ? `${opt.count}x ` : ""}{opt.name}</span>
                                  ));
                                })()}
                              </div>
                            )}
                            {item.notes && (
                              <p className="mt-0.5 text-[11px] italic text-amber-400/90">
                                {item.notes}
                              </p>
                            )}
                            {/* Sector badge in expedition mode */}
                            {isExpedicao && item.productionSector && (
                              <span
                                className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: `${item.productionSector.color}22`,
                                  color: item.productionSector.color,
                                  border: `1px solid ${item.productionSector.color}44`,
                                }}
                              >
                                {item.productionSector.name}
                                {isItemReady ? " ✓" : " ●"}
                              </span>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded bg-slate-700 px-2 py-0.5 text-sm font-bold text-white">
                              {item.quantity}×
                            </span>
                            {showItemToggle && (
                              <button
                                type="button"
                                disabled={isItemLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleToggleItem(order.id, item.id, item.itemStatus);
                                }}
                                className={cn(
                                  "mt-0.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer active:scale-95",
                                  isItemReady
                                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/35"
                                    : "bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600 hover:text-white",
                                )}
                              >
                                {isItemReady ? "Pronto ✓" : "Marcar"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {order.notes && (
                      <div className="mt-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                          Obs. do pedido
                        </p>
                        <p className="text-xs italic text-amber-300/80">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="rounded-b-xl border-t border-white/5 px-4 py-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock3Icon size={13} className={getTimerClass(elapsed)} />
                        <span
                          suppressHydrationWarning
                          className={cn("font-mono text-sm", getTimerClass(elapsed))}
                        >
                          {mounted ? formatElapsed(elapsed) : "--:--"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-600">
                        {order.orderProducts.length} item
                        {order.orderProducts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Expedition mode: advance only when all items ready */}
                    {isExpedicao ? (
                      <button
                        type="button"
                        disabled={isLoading || !ready}
                        onClick={() => handleAdvanceOrder(order)}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
                          ready
                            ? "bg-violet-500 text-white hover:bg-violet-400"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed",
                        )}
                      >
                        <PackageCheckIcon size={14} />
                        {ready ? "Pronto para Retirada" : "Aguardando itens..."}
                      </button>
                    ) : selectedSectorId !== null ? (
                      /* Sector mode: no order-level button (items are marked individually) */
                      (() => {
                        const readyCount = order.orderProducts.filter(
                          (i) => i.itemStatus === "READY",
                        ).length;
                        const totalCount = order.orderProducts.length;
                        const isSectorDone = totalCount > 0 && readyCount === totalCount;
                        return (
                          <div
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-1 text-xs font-medium transition-colors",
                              isSectorDone
                                ? "text-emerald-400 font-semibold"
                                : "text-slate-500",
                            )}
                          >
                            {isSectorDone && (
                              <CheckCircle2Icon size={13} className="text-emerald-400" />
                            )}
                            <span>
                              {readyCount}/{totalCount}{" "}
                              {readyCount === 1 && totalCount === 1
                                ? "item pronto"
                                : "itens prontos"}
                              {isSectorDone ? " ✓" : ""}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      /* All-sectors mode: original order-level advance */
                      isPending ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleAdvanceOrder(order)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
                        >
                          <ChefHatIcon size={14} />
                          Preparar
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleAdvanceOrder(order)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
                        >
                          <CheckCircle2Icon size={14} />
                          Pronto
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Legenda do KDS */}
      <Dialog open={legendOpen} onOpenChange={setLegendOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-slate-900 text-white sm:rounded-2xl max-h-[88vh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-3 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <ChefHatIcon size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Guia &amp; Legenda do KDS
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Referência rápida de tempos, cores, status e tipos de consumo no display da cozinha.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2 text-xs">
            {/* Seção 1: Alertas de Tempo de Espera (SLA) */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Clock3Icon size={15} className="text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  1. Alertas de Tempo Decorrido (SLA)
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock3Icon size={14} className="text-slate-500" />
                    <span className="font-mono text-sm font-semibold text-slate-400">
                      08:24
                    </span>
                  </div>
                  <p className="font-bold text-slate-200">Normal (&lt; 15 min)</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Preparo dentro do tempo esperado para a cozinha.
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock3Icon size={14} className="text-yellow-400" />
                    <span className="font-mono text-sm font-bold text-yellow-400">
                      18:40
                    </span>
                  </div>
                  <p className="font-bold text-yellow-300">Atenção (15 a 25 min)</p>
                  <p className="mt-1 text-[11px] text-yellow-200/80">
                    Espera moderada. Priorize a finalização dos itens.
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock3Icon size={14} className="text-red-400 animate-pulse" />
                    <span className="font-mono text-sm font-bold text-red-400 animate-pulse">
                      27:12
                    </span>
                  </div>
                  <p className="font-bold text-red-300">Crítico (&gt; 25 min)</p>
                  <p className="mt-1 text-[11px] text-red-200/80">
                    Tempo elevado! Risco iminente de reclamação de atraso.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 2: Ciclo de Vida e Bordas dos Pedidos */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <CheckCircle2Icon size={15} className="text-sky-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  2. Ciclo de Vida &amp; Bordas dos Pedidos
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      Aguardando
                    </span>
                    <span className="text-[10px] text-slate-400">PENDING</span>
                  </div>
                  <p className="font-semibold text-white">Borda Amarela</p>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Pedido recebido. Aguardando a equipe iniciar o preparo.
                  </p>
                </div>

                <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="rounded-full border border-sky-500/40 bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                      Em Produção
                    </span>
                    <span className="text-[10px] text-slate-400">IN_PREP</span>
                  </div>
                  <p className="font-semibold text-white">Borda Azul</p>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Cozinha trabalhando ativamente na preparação dos itens.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Setor Concluído ✓
                    </span>
                    <span className="text-[10px] text-emerald-400">PRONTO</span>
                  </div>
                  <p className="font-semibold text-white">Borda Verde</p>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Todos os itens da sua estação já foram marcados como prontos.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 3: Tipos de Consumo */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <UtensilsCrossedIcon size={15} className="text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  3. Tipos de Consumo (Tags no Cartão)
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-blue-500/40 bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-medium text-blue-300">
                      Salão
                    </span>
                    <span className="font-bold text-white text-xs">Mesa Local</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Servido na louça/bandeja diretamente para os garçons levarem à mesa.
                  </p>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      Balcão
                    </span>
                    <span className="font-bold text-white text-xs">Retirada</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cliente aguardando retirada. Embalado para entrega rápida ao balcão.
                  </p>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                      Entrega
                    </span>
                    <span className="font-bold text-white text-xs">Delivery</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Embalado termicamente e lacrado para despacho via motoboy.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 4: Multi-marcas (Dark Kitchen) */}
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <PackageCheckIcon size={15} className="text-violet-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    4. Dark Kitchen &amp; Multi-marcas Virtuais
                  </h2>
                </div>
                <div className="rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-600 text-white">
                  EXEMPLO DE MARCA
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Em cozinhas que preparam mais de uma marca virtual no mesmo espaço, a barra colorida superior identifica imediatamente de qual restaurante é aquele pedido, evitando enganos de embalagens, adesivos e itens.
              </p>
            </div>

            {/* Seção 5: Modos de Operação */}
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                5. Abas de Filtro &amp; Modos de Trabalho
              </h2>
              <div className="space-y-2 text-[11px] text-slate-300">
                <p>
                  <strong className="text-white">• Abas por Setor (ex: Cozinha Quente, Bar):</strong> Fixe o tablet da estação na sua aba. Aparecem apenas os itens do seu setor e você clica em <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">Marcar</span> / <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">Pronto ✓</span> individualmente em cada item com atualização instantânea.
                </p>
                <p>
                  <strong className="text-white">• Aba Expedição:</strong> Centraliza a conferência de todos os setores. Permite despachar o pedido inteiro para retirada assim que todas as estações concluírem seus itens.
                </p>
                <p>
                  <strong className="text-white">• Aba Todos:</strong> Visão panorâmica para a gerência ou cozinhas compactas com avanço direto em lote.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KdsPainel;
