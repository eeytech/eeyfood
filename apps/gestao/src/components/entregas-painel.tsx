"use client";

import type { Courier, OrderStatus, PedidoRecebimento } from "@fsw/db";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BadgeDollarSignIcon,
  BikeIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MapPinIcon,
  MessageCircleIcon,
  PackageCheckIcon,
  PhoneIcon,
  PrinterIcon,
  RefreshCwIcon,
  SearchIcon,
  TruckIcon,
  UsersIcon,
  Volume2Icon,
  VolumeXIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

import { dispatchOrderAction, getCouriersAction } from "@/app/(dashboard)/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface EntregasPainelProps {
  slug: string;
  restaurantName: string;
  initialOrders: PedidoRecebimento[];
  initialCouriers: Courier[];
}

type TabFiltro = "TODOS" | "PRONTOS" | "EM_ROTA" | "COZINHA" | "CONCLUIDOS";

export default function EntregasPainel({
  slug,
  restaurantName,
  initialOrders,
  initialCouriers,
}: EntregasPainelProps) {
  const [orders, setOrders] = useState<PedidoRecebimento[]>(initialOrders);
  const [couriers, setCouriers] = useState<Courier[]>(initialCouriers);
  const [socketConnected, setSocketConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [loadingOrderIds, setLoadingOrderIds] = useState<number[]>([]);

  // Filtros
  const [activeTab, setActiveTab] = useState<TabFiltro>("PRONTOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<string>("ALL");

  // Modal de Despacho
  const [orderToDispatch, setOrderToDispatch] = useState<PedidoRecebimento | null>(null);
  const [dispatchCourierId, setDispatchCourierId] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);

  // Itens expandidos
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const audioCtxRef = useRef<AudioContext | null>(null);

  const enableAudio = () => {
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
    toast.success("Alertas sonoros ativados");
  };

  const playBip = () => {
    if (!audioEnabled || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  };

  // Somente pedidos de entrega (DELIVERY)
  const deliveryOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.consumptionMethod === "DELIVERY" ||
        (order.deliveryAddress && order.deliveryAddress.trim().length > 0),
    );
  }, [orders]);

  // Contadores de métricas
  const prontosParaColeta = useMemo(
    () => deliveryOrders.filter((o) => o.status === "READY_FOR_PICKUP"),
    [deliveryOrders],
  );
  const emRotaDeEntrega = useMemo(
    () => deliveryOrders.filter((o) => o.status === "OUT_FOR_DELIVERY"),
    [deliveryOrders],
  );
  const entreguesHoje = useMemo(
    () => deliveryOrders.filter((o) => o.status === "FINISHED"),
    [deliveryOrders],
  );
  const emPreparo = useMemo(
    () => deliveryOrders.filter((o) => ["PENDING", "IN_PREPARATION"].includes(o.status)),
    [deliveryOrders],
  );
  const motoboysAtivos = useMemo(
    () => couriers.filter((c) => c.isActive),
    [couriers],
  );

  // Filtragem de pedidos
  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter((order) => {
      // Filtro por aba
      if (activeTab === "PRONTOS" && order.status !== "READY_FOR_PICKUP") return false;
      if (activeTab === "EM_ROTA" && order.status !== "OUT_FOR_DELIVERY") return false;
      if (activeTab === "COZINHA" && !["PENDING", "IN_PREPARATION"].includes(order.status))
        return false;
      if (activeTab === "CONCLUIDOS" && !["FINISHED", "CANCELLED"].includes(order.status))
        return false;

      // Filtro por entregador
      if (selectedCourierFilter === "UNASSIGNED") {
        if (order.courierId) return false;
      } else if (selectedCourierFilter !== "ALL") {
        if (order.courierId !== selectedCourierFilter) return false;
      }

      // Filtro por busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = String(order.id).includes(q);
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone?.includes(q) ?? false;
        const matchesAddress = order.deliveryAddress?.toLowerCase().includes(q) ?? false;
        const matchesCourier = order.courier?.name.toLowerCase().includes(q) ?? false;

        if (
          !matchesId &&
          !matchesName &&
          !matchesPhone &&
          !matchesAddress &&
          !matchesCourier
        ) {
          return false;
        }
      }

      return true;
    });
  }, [deliveryOrders, activeTab, selectedCourierFilter, searchQuery]);

  // Sincronização via WebSocket
  const syncOrderById = async (orderId: number) => {
    try {
      const response = await fetch(`/api/pedidos/${String(orderId)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const updatedOrder = (await response.json()) as PedidoRecebimento;
      setOrders((prev) =>
        prev.some((o) => o.id === updatedOrder.id)
          ? prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          : [updatedOrder, ...prev],
      );
    } catch {
      // ignore
    }
  };

  const reloadAllOrders = async () => {
    try {
      const response = await fetch(`/api/pedidos?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as PedidoRecebimento[];
      setOrders(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const websocketUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001";
    const socket = io(websocketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join-restaurant", slug);
    });

    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", () => setSocketConnected(false));

    socket.on("NEW_ORDER", (data: { orderId: number; restaurantSlug: string }) => {
      if (data.restaurantSlug === slug) {
        void syncOrderById(data.orderId);
        playBip();
      }
    });

    socket.on("ORDER_UPDATED", (data: { orderId: number; restaurantSlug: string; status?: OrderStatus }) => {
      if (data.restaurantSlug === slug) {
        void syncOrderById(data.orderId);
        if (data.status === "READY_FOR_PICKUP") {
          playBip();
          toast.info(`Pedido #${data.orderId} está pronto para coleta!`);
        }
      }
    });

    getCouriersAction(slug).then(setCouriers);

    return () => {
      socket.disconnect();
    };
  }, [slug]);

  // Atualizar pedido
  const handleOrderPatch = async (
    orderId: number,
    payload: { status?: OrderStatus; paymentStatus?: PedidoRecebimento["paymentStatus"] },
  ) => {
    try {
      setLoadingOrderIds((prev) => [...prev, orderId]);
      const res = await fetch(`/api/pedidos/${String(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.error("Erro ao atualizar pedido");
        return;
      }

      const updated = (await res.json()) as PedidoRecebimento;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success(`Pedido #${orderId} atualizado com sucesso!`);
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setLoadingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  // Despachar pedido com motoboy
  const handleConfirmDispatch = async () => {
    if (!orderToDispatch || !dispatchCourierId) return;

    try {
      setIsDispatching(true);
      const result = await dispatchOrderAction(orderToDispatch.id, dispatchCourierId);
      if (result) {
        await syncOrderById(orderToDispatch.id);
        toast.success(`Pedido #${orderToDispatch.id} despachado com sucesso!`);
        setOrderToDispatch(null);
        setDispatchCourierId("");
      }
    } catch {
      toast.error("Erro ao despachar pedido.");
    } finally {
      setIsDispatching(false);
    }
  };

  const toggleExpanded = (orderId: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatTime = (date: Date | string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const cleanPhoneForWa = (phone: string | null | undefined) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    return digits;
  };

  // Impressão rápida
  const handlePrintDelivery = (order: PedidoRecebimento) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);

    const itemsHtml = order.orderProducts
      .map(
        (p) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;">
          <span>${p.quantity}x ${p.productNameSnapshot || p.product.name}</span>
        </div>
        ${
          p.orderProductOptions && p.orderProductOptions.length > 0
            ? `<div style="font-size:10px; color:#555; margin-left:8px;">${p.orderProductOptions.map((o) => `• ${o.nameSnapshot}`).join("<br>")}</div>`
            : ""
        }
        ${p.notes ? `<div style="font-size:10px; font-style:italic; margin-left:8px;">Obs: ${p.notes}</div>` : ""}
      `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cupom de Entrega #${order.id}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 8px; width: 280px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size:14px;">${restaurantName.toUpperCase()}</div>
          <div class="center">CUPOM DE ENTREGA</div>
          <div class="divider"></div>
          <div><span class="bold">PEDIDO:</span> #${order.id}</div>
          <div><span class="bold">HORA:</span> ${formatTime(order.createdAt)}</div>
          <div><span class="bold">CLIENTE:</span> ${order.customerName}</div>
          <div><span class="bold">FONE:</span> ${order.customerPhone || "N/A"}</div>
          <div class="divider"></div>
          <div class="bold">ENDEREÇO DE ENTREGA:</div>
          <div>${order.deliveryAddress || "Endereço não informado"}</div>
          <div class="divider"></div>
          <div class="bold">ITENS:</div>
          ${itemsHtml}
          <div class="divider"></div>
          <div style="display:flex; justify-content:space-between;" class="bold">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.total)}</span>
          </div>
          <div><span class="bold">PAGAMENTO:</span> ${order.paymentMethod} (${order.paymentStatus === "PAID" ? "PAGO" : "PENDENTE"})</div>
          ${order.changeFor ? `<div class="bold">TROCO PARA: ${formatCurrency(order.changeFor)}</div>` : ""}
          ${order.courier ? `<div><span class="bold">MOTOBOY:</span> ${order.courier.name}</div>` : ""}
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document ?? iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Modal de Despacho ────────────────────────── */}
      <Dialog
        open={!!orderToDispatch}
        onOpenChange={(open) => !open && setOrderToDispatch(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BikeIcon className="text-cyan-600" size={20} />
              Despachar Pedido #{orderToDispatch?.id}
            </DialogTitle>
            <DialogDescription>
              Selecione o entregador responsável para levar o pedido de{" "}
              <strong>{orderToDispatch?.customerName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-semibold text-slate-800">Destino:</p>
              <p className="text-slate-600">{orderToDispatch?.deliveryAddress || "Endereço não informado"}</p>
              <p className="mt-1 font-semibold text-slate-800">Total a receber:</p>
              <p className="text-slate-900 font-bold">
                {formatCurrency(orderToDispatch?.total ?? 0)}{" "}
                <span className="font-normal text-slate-500">
                  ({orderToDispatch?.paymentMethod} • {orderToDispatch?.paymentStatus === "PAID" ? "Já Pago" : "Pendente"})
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Entregador / Motoboy *
              </label>
              <Select
                value={dispatchCourierId}
                onValueChange={setDispatchCourierId}
              >
                <SelectTrigger className="mt-1 h-11 rounded-xl border-slate-200 bg-white text-sm">
                  <SelectValue placeholder="Selecione um entregador..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white">
                  {couriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <BikeIcon size={14} className="text-slate-500" />
                        <span>{c.name}</span>
                        <span className="text-[11px] text-slate-400">
                          ({c.vehicleType ?? "MOTO"} • {c.phone})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOrderToDispatch(null)}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              disabled={!dispatchCourierId || isDispatching}
              onClick={handleConfirmDispatch}
              className="rounded-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
            >
              {isDispatching && (
                <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Confirmar e Iniciar Rota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Top Header Card (estilo tela de Usuários) ── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                <BikeIcon size={20} />
              </div>
              <div>
                <CardTitle className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  Painel de Entregas & Expedição
                </CardTitle>
                <p className="text-xs sm:text-sm text-slate-500">
                  Controle de expedição, rotas de motoboys e pedidos para entrega em tempo real.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={socketConnected ? "success" : "danger"}
              className="h-8 gap-1.5 px-3 rounded-full text-xs font-semibold"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  socketConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500",
                )}
              />
              {socketConnected ? "Expedição sincronizada" : "Reconectando..."}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={enableAudio}
              className={cn(
                "h-8 rounded-full border-slate-200 text-xs",
                audioEnabled && "border-cyan-300 bg-cyan-50 text-cyan-800",
              )}
              title={audioEnabled ? "Alertas sonoros ativos" : "Ativar som de novo pedido"}
            >
              {audioEnabled ? (
                <Volume2Icon size={14} className="mr-1 text-cyan-600" />
              ) : (
                <VolumeXIcon size={14} className="mr-1 text-slate-400" />
              )}
              {audioEnabled ? "Som Ativo" : "Ativar Som"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={reloadAllOrders}
              className="h-8 rounded-full border-slate-200 text-xs"
              title="Atualizar lista"
            >
              <RefreshCwIcon size={13} className="mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ── KPI Metrics Grid (estilo tela de Usuários) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition hover:border-amber-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aguardando Coleta
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <PackageCheckIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-amber-700">
              {prontosParaColeta.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Prontos na expedição
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition hover:border-cyan-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Em Rota na Rua
              </span>
              <div className="rounded-lg bg-cyan-100 p-1.5 text-cyan-700">
                <BikeIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-cyan-700">
              {emRotaDeEntrega.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Com os motoboys
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition hover:border-emerald-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Entregues Hoje
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-emerald-700">
              {entreguesHoje.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Finalizados com sucesso
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition hover:border-indigo-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Motoboys Cadastrados
              </span>
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <UsersIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold text-indigo-700">
              {motoboysAtivos.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Equipe de entrega ativa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Barra de Abas e Filtros ─────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Abas */}
            <div className="overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as TabFiltro)}
                className="w-auto"
              >
                <TabsList className="h-10 p-1 bg-slate-100 rounded-xl">
                  <TabsTrigger
                    value="PRONTOS"
                    className="text-xs sm:text-sm gap-1.5 rounded-lg px-3"
                  >
                    <span>Prontos p/ Coleta</span>
                    <span className="rounded-full bg-amber-200/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                      {prontosParaColeta.length}
                    </span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="EM_ROTA"
                    className="text-xs sm:text-sm gap-1.5 rounded-lg px-3"
                  >
                    <span>Em Rota</span>
                    <span className="rounded-full bg-cyan-200/90 px-1.5 py-0.5 text-[10px] font-bold text-cyan-900">
                      {emRotaDeEntrega.length}
                    </span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="COZINHA"
                    className="text-xs sm:text-sm gap-1.5 rounded-lg px-3"
                  >
                    <span>Na Cozinha</span>
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {emPreparo.length}
                    </span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="CONCLUIDOS"
                    className="text-xs sm:text-sm gap-1.5 rounded-lg px-3"
                  >
                    <span>Concluídos</span>
                    <span className="rounded-full bg-emerald-200/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                      {entreguesHoje.length}
                    </span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="TODOS"
                    className="text-xs sm:text-sm gap-1.5 rounded-lg px-3"
                  >
                    <span>Todos</span>
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {deliveryOrders.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Busca & Filtro de Motoboy */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-64">
                <SearchIcon
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  placeholder="Buscar #id, cliente, endereço..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs placeholder:text-slate-400 focus:bg-white"
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

              <div className="w-full sm:w-48">
                <Select
                  value={selectedCourierFilter}
                  onValueChange={setSelectedCourierFilter}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Entregador..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os entregadores</SelectItem>
                    <SelectItem value="UNASSIGNED">Sem entregador</SelectItem>
                    {couriers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Grid de Pedidos de Entrega ──────────────── */}
      {filteredOrders.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white/70">
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
            <TruckIcon className="text-slate-300" size={36} />
            <p className="mt-3 text-base font-semibold text-slate-800">
              Nenhum pedido de entrega encontrado
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery || selectedCourierFilter !== "ALL"
                ? "Tente ajustar os filtros ou a busca para localizar o pedido."
                : "Quando novos pedidos de delivery forem realizados, eles aparecerão aqui automaticamente."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => {
            const isReady = order.status === "READY_FOR_PICKUP";
            const isOut = order.status === "OUT_FOR_DELIVERY";
            const isDone = order.status === "FINISHED";
            const isPrep = ["PENDING", "IN_PREPARATION"].includes(order.status);
            const isLoading = loadingOrderIds.includes(order.id);
            const isExpanded = expandedOrders.has(order.id);

            const cleanPhone = cleanPhoneForWa(order.customerPhone);
            const mapsUrl = order.deliveryAddress
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`
              : null;
            const waUrl = cleanPhone
              ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `Olá ${order.customerName}, tudo bem? Aqui é da equipe de entrega do ${restaurantName}. Estou com o seu pedido #${order.id}!`,
                )}`
              : null;

            return (
              <Card
                key={order.id}
                className={cn(
                  "border bg-white shadow-sm transition-all hover:shadow-md",
                  isReady && "border-amber-300/80 bg-amber-50/20",
                  isOut && "border-cyan-300/80 bg-cyan-50/20",
                  isDone && "border-emerald-200 bg-emerald-50/10",
                )}
              >
                <CardHeader className="space-y-2 p-3.5 pb-2.5">
                  {/* Linha 1: ID, status e impressão */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                        #{order.id}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => handlePrintDelivery(order)}
                        title="Imprimir Cupom de Entrega"
                      >
                        <PrinterIcon size={12} />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          isReady
                            ? "warning"
                            : isOut
                              ? "default"
                              : isDone
                                ? "success"
                                : "secondary"
                        }
                        className={cn(
                          "px-2.5 py-0.5 text-[10px] font-bold uppercase",
                          isReady && "bg-amber-100 text-amber-900 border-amber-300",
                          isOut && "bg-cyan-100 text-cyan-900 border-cyan-300",
                          isDone && "bg-emerald-100 text-emerald-900 border-emerald-300",
                        )}
                      >
                        {isReady
                          ? "Pronto na Expedição"
                          : isOut
                            ? "Em Rota com Motoboy"
                            : isDone
                              ? "Entregue"
                              : "Em Preparo"}
                      </Badge>
                    </div>
                  </div>

                  {/* Linha 2: Cliente e Horário */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-bold text-slate-900 leading-tight">
                        {order.customerName}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <ClockIcon size={11} />
                        Pedido às {formatTime(order.createdAt)}
                      </p>
                    </div>

                    {/* Botões de Ação de Contato */}
                    <div className="flex items-center gap-1 shrink-0">
                      {cleanPhone && (
                        <>
                          <a
                            href={waUrl ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircleIcon size={13} />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
                            title="Ligar para o cliente"
                          >
                            <PhoneIcon size={13} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Linha 3: Endereço de Entrega */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <MapPinIcon
                          size={14}
                          className="mt-0.5 shrink-0 text-cyan-600"
                        />
                        <p className="font-medium text-slate-800 leading-snug break-words">
                          {order.deliveryAddress || "Endereço não informado"}
                        </p>
                      </div>

                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                        >
                          <span>GPS</span>
                          <ExternalLinkIcon size={10} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Linha 4: Pagamento & Troco */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg bg-slate-100/80 px-2.5 py-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <BadgeDollarSignIcon size={13} className="text-slate-500" />
                        <span className="font-semibold text-slate-700">
                          {order.paymentMethod === "DINHEIRO"
                            ? "Dinheiro"
                            : order.paymentMethod === "CARTAO_PRESENCIAL"
                              ? "Cartão Presencial"
                              : "Online (PIX/Cartão)"}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    {/* Aviso de Troco para Dinheiro */}
                    {order.paymentMethod === "DINHEIRO" && (
                      <div className="rounded-lg border border-amber-300 bg-amber-100/60 p-2 text-xs text-amber-900 font-medium">
                        {order.changeFor ? (
                          <p>
                            💵 <strong>Troco para:</strong> {formatCurrency(order.changeFor)}{" "}
                            (Devolver{" "}
                            <strong>
                              {formatCurrency(order.changeFor - (order.total ?? 0))}
                            </strong>
                            )
                          </p>
                        ) : (
                          <p>💵 Dinheiro sem necessidade de troco</p>
                        )}
                      </div>
                    )}

                    {order.paymentMethod === "CARTAO_PRESENCIAL" && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900 font-medium">
                        💳 <strong>Levar Maquininha:</strong> Cobrar {formatCurrency(order.total)}
                      </div>
                    )}

                    {order.paymentStatus === "PAID" && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-center text-xs font-semibold text-emerald-800">
                        ✓ Pedido já pago online. Não cobrar nada na entrega.
                      </div>
                    )}
                  </div>

                  {/* Itens do Pedido (Conferência) */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(order.id)}
                    className="flex w-full items-center justify-between pt-1 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                  >
                    <span>
                      Conferir sacola ({order.orderProducts.length} itens)
                    </span>
                    <ChevronDownIcon
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-xs">
                      {order.orderProducts.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-2 border-b border-slate-200/50 pb-1 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 leading-tight">
                              {item.productNameSnapshot || item.product.name}
                            </p>
                            {item.orderProductOptions && item.orderProductOptions.length > 0 && (
                              <p className="text-[10px] text-slate-500">
                                {item.orderProductOptions.map((o) => o.nameSnapshot).join(", ")}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-[10px] italic text-amber-700">
                                Obs: {item.notes}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 font-bold text-slate-700">
                            {item.quantity}×
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardHeader>

                {/* ── Rodapé / Ações do Entregador ──────── */}
                <CardContent className="p-3.5 pt-1 space-y-2">
                  {/* Entregador atribuído */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <BikeIcon size={14} className="text-cyan-700 shrink-0" />
                      <span className="text-slate-500">Entregador:</span>
                      <span className="font-bold text-slate-900 truncate">
                        {order.courier?.name ?? "Nenhum atribuído"}
                      </span>
                    </div>

                    {isReady && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOrderToDispatch(order);
                          setDispatchCourierId(order.courierId ?? "");
                        }}
                        className="h-7 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                      >
                        Trocar
                      </Button>
                    )}
                  </div>

                  {/* Ações de Despacho & Conclusão */}
                  <div className="flex items-center gap-2 pt-1">
                    {isReady && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setOrderToDispatch(order);
                          setDispatchCourierId(order.courierId ?? "");
                        }}
                        className="h-10 flex-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm"
                      >
                        <BikeIcon size={14} className="mr-1.5" />
                        Sair para Entrega
                      </Button>
                    )}

                    {isOut && (
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() =>
                          handleOrderPatch(order.id, { status: "FINISHED" })
                        }
                        className="h-10 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                      >
                        {isLoading ? (
                          <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2Icon size={14} className="mr-1.5" />
                        )}
                        Confirmar Entrega Realizada
                      </Button>
                    )}

                    {isDone && (
                      <div className="flex-1 rounded-xl bg-emerald-100/70 p-2 text-center text-xs font-bold text-emerald-800">
                        ✓ Entrega Concluída
                      </div>
                    )}

                    {isPrep && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() =>
                          handleOrderPatch(order.id, { status: "READY_FOR_PICKUP" })
                        }
                        className="h-9 flex-1 rounded-xl border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100"
                      >
                        Marcar como Pronto p/ Coleta
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
