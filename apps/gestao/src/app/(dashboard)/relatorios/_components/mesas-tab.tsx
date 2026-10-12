"use client";

import {
  BikeIcon,
  ShoppingBagIcon,
  StoreIcon,
  TrendingUpIcon,
  UtensilsIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface MesasTabProps {
  data: DashboardData;
}

const CONSUMPTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  DINE_IN: { label: "Salão (Mesas & Comandas)", icon: StoreIcon, color: "#e41d2c" },
  DELIVERY: { label: "Delivery", icon: BikeIcon, color: "#ff6b00" },
  TAKEAWAY: { label: "Retirada (Takeaway)", icon: ShoppingBagIcon, color: "#3b82f6" },
};

const MesasTab = ({ data }: MesasTabProps) => {
  const { revenueByConsumption, summary } = data;
  const [selectedChannel, setSelectedChannel] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"TOTAL" | "COUNT">("TOTAL");

  const channelsData = useMemo(() => {
    return revenueByConsumption.map((c) => {
      const config = CONSUMPTION_CONFIG[c.consumptionMethod] ?? {
        label: c.consumptionMethod,
        icon: UtensilsIcon,
        color: "#64748b",
      };
      const avgTicket = c.count > 0 ? c.total / c.count : 0;
      const pctTotal = summary.grossRevenue > 0 ? (c.total / summary.grossRevenue) * 100 : 0;

      return {
        ...c,
        name: config.label,
        icon: config.icon,
        color: config.color,
        avgTicket,
        pctTotal,
      };
    });
  }, [revenueByConsumption, summary.grossRevenue]);

  const dineInChannel = channelsData.find((c) => c.consumptionMethod === "DINE_IN") ?? {
    total: 0,
    count: 0,
    avgTicket: 0,
    pctTotal: 0,
  };

  const deliveryChannel = channelsData.find((c) => c.consumptionMethod === "DELIVERY") ?? {
    total: 0,
    count: 0,
    avgTicket: 0,
    pctTotal: 0,
  };

  const takeawayChannel = channelsData.find((c) => c.consumptionMethod === "TAKEAWAY") ?? {
    total: 0,
    count: 0,
    avgTicket: 0,
    pctTotal: 0,
  };

  const filteredChannels = useMemo(() => {
    let list = [...channelsData];
    if (selectedChannel !== "ALL") {
      list = list.filter((c) => c.consumptionMethod === selectedChannel);
    }
    if (sortBy === "COUNT") {
      list.sort((a, b) => b.count - a.count);
    } else {
      list.sort((a, b) => b.total - a.total);
    }
    return list;
  }, [channelsData, selectedChannel, sortBy]);

  return (
    <div className="space-y-6">
      {/* KPI Cards de Mesas e Canais com cores do tema */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Salão & Mesas
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <StoreIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {fmt(dineInChannel.total)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {dineInChannel.count} comandas ({dineInChannel.pctTotal.toFixed(1)}% do faturamento)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Delivery Online
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <BikeIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {fmt(deliveryChannel.total)}
            </p>
            <p className="mt-0.5 text-xs text-primary font-medium">
              {deliveryChannel.count} entregas ({deliveryChannel.pctTotal.toFixed(1)}% do total)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Retirada no Balcão
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <ShoppingBagIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {fmt(takeawayChannel.total)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {takeawayChannel.count} retiradas ({takeawayChannel.pctTotal.toFixed(1)}% do total)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ticket Médio Salão
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {fmt(dineInChannel.avgTicket)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              vs {fmt(deliveryChannel.avgTicket)} no Delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Canais */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Gráfico de Barras: Faturamento por Canal */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-display text-base font-semibold text-slate-900">
                  Comparativo de Faturamento por Canal
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Volume financeiro consolidado por modalidade de atendimento
                </CardDescription>
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setSortBy("TOTAL")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === "TOTAL"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Por receita
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("COUNT")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === "COUNT"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Por pedidos
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={channelsData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  formatter={(val, name) => [
                    name === "total" ? fmt(Number(val)) : `${val} pedidos`,
                    name === "total" ? "Receita" : "Pedidos",
                  ]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="total" name="Receita" radius={[6, 6, 0, 0]}>
                  {channelsData.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Donut de Participação */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Participação de Vendas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Proporção da receita por canal
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-2">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={channelsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="name"
                >
                  {channelsData.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmt(Number(v))}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Detalhamento com Filtros */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-base font-semibold text-slate-900">
                Detalhamento por Canal de Atendimento
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Receita, quantidade de pedidos e ticket médio de cada operação
              </CardDescription>
            </div>

            {/* Filtros da tabela */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
              <button
                type="button"
                onClick={() => setSelectedChannel("ALL")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedChannel === "ALL"
                    ? "bg-white text-primary shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos os canais
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel("DINE_IN")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedChannel === "DINE_IN"
                    ? "bg-white text-primary shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Salão
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel("DELIVERY")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedChannel === "DELIVERY"
                    ? "bg-white text-primary shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Delivery
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-700">Canal de Atendimento</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Pedidos</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Faturamento</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Ticket Médio</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Participação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChannels.map((c) => {
                  const Icon = c.icon;
                  return (
                    <TableRow key={c.consumptionMethod} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="font-semibold text-slate-900 flex items-center gap-2">
                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5 text-primary">
                          <Icon size={14} />
                        </div>
                        {c.name}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">{c.count} pedidos</TableCell>
                      <TableCell className="text-right font-bold text-primary">{fmt(c.total)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">{fmt(c.avgTicket)}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                          {c.pctTotal.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MesasTab;
