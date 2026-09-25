"use client";

import {
  BarChart3Icon,
  PackageSearchIcon,
  PercentIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const CONSUMPTION_LABELS: Record<string, string> = {
  DELIVERY: "Delivery",
  TAKEAWAY: "Retirada",
  DINE_IN: "Mesa/Comanda",
};

const COLORS = ["#e41d2c", "#ff6b00", "#10b981", "#3b82f6", "#8b5cf6"];

interface OverviewTabProps {
  data: DashboardData;
}

const KPICard = ({
  label,
  value,
  subtext,
  icon: Icon,
  badgeClass,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  badgeClass: string;
  valueClass?: string;
}) => (
  <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <div className={`rounded-lg p-1.5 ${badgeClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${valueClass}`}>{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-slate-500">{subtext}</p>}
    </CardContent>
  </Card>
);

const EmptyChart = ({ label }: { label: string }) => (
  <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
    <div className="rounded-full bg-slate-100 p-3 text-slate-400">
      <BarChart3Icon size={24} />
    </div>
    <p className="font-display text-sm font-semibold text-slate-900">Sem dados no período</p>
    <p className="max-w-xs text-xs text-slate-500">{label}</p>
  </div>
);

const OverviewTab = ({ data }: OverviewTabProps) => {
  const { summary, dailyRevenue, revenueByConsumption } = data;

  const consumptionWithLabels = revenueByConsumption.map((r) => ({
    ...r,
    name: CONSUMPTION_LABELS[r.consumptionMethod] ?? r.consumptionMethod,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 sm:gap-4">
        <KPICard
          label="Faturamento bruto"
          value={fmt(summary.grossRevenue)}
          subtext="Receita de todos os pedidos"
          icon={ReceiptIcon}
          badgeClass="bg-slate-100 text-slate-700"
          valueClass="text-slate-900"
        />
        <KPICard
          label="Custo estimado"
          value={fmt(summary.estimatedCost)}
          subtext="CMV e insumos calculados"
          icon={TrendingDownIcon}
          badgeClass="bg-amber-100 text-amber-700"
          valueClass="text-amber-700"
        />
        <KPICard
          label="Lucro líquido"
          value={fmt(summary.estimatedProfit)}
          subtext="Resultado bruto menos CMV"
          icon={TrendingUpIcon}
          badgeClass="bg-emerald-100 text-emerald-700"
          valueClass="text-emerald-700"
        />
        <KPICard
          label="Ticket médio"
          value={fmt(summary.avgTicket)}
          subtext="Média por pedido fechado"
          icon={BarChart3Icon}
          badgeClass="bg-blue-100 text-blue-700"
          valueClass="text-blue-700"
        />
        <KPICard
          label="Total de pedidos"
          value={String(summary.totalOrders)}
          subtext="Pedidos pagos no período"
          icon={PackageSearchIcon}
          badgeClass="bg-purple-100 text-purple-700"
          valueClass="text-purple-700"
        />
        <KPICard
          label="Margem de lucro"
          value={`${summary.profitMargin.toFixed(1)}%`}
          subtext="Rentabilidade operacional"
          icon={PercentIcon}
          badgeClass="bg-indigo-100 text-indigo-700"
          valueClass="text-indigo-700"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Area Chart — evolução diária */}
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Evolução do período
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Faturamento e lucro estimado distribuídos por dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyRevenue.length === 0 ? (
              <EmptyChart label="Nenhum faturamento registrado no período selecionado." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e41d2c" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#e41d2c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      fmt(Number(value)),
                      name === "grossRevenue" ? "Faturamento" : "Lucro",
                    ]}
                    labelFormatter={(label) => `Data: ${fmtDate(String(label))}`}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "grossRevenue" ? "Faturamento" : "Lucro estimado"
                    }
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="grossRevenue"
                    stroke="#e41d2c"
                    strokeWidth={2}
                    fill="url(#gradRevenue)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="estimatedProfit"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradProfit)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut — por método de consumo */}
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Canais e Tipos de consumo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Faturamento por canal de atendimento no período
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {consumptionWithLabels.length === 0 ? (
              <EmptyChart label="Sem pedidos no período." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={consumptionWithLabels}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="name"
                  >
                    {consumptionWithLabels.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmt(Number(v))}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
