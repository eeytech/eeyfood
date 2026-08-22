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
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) => (
  <Card className="border-white/80 bg-white/90">
    <CardContent className="flex items-center justify-between p-4">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display mt-0.5 text-xl font-semibold">{value}</p>
      </div>
      <Icon className={`${color} shrink-0`} size={20} />
    </CardContent>
  </Card>
);

const EmptyChart = ({ label }: { label: string }) => (
  <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-slate-50">
    <BarChart3Icon className="text-muted-foreground" size={32} />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

const OverviewTab = ({ data }: OverviewTabProps) => {
  const { summary, dailyRevenue, revenueByConsumption } = data;

  const consumptionWithLabels = revenueByConsumption.map((r) => ({
    ...r,
    name: CONSUMPTION_LABELS[r.consumptionMethod] ?? r.consumptionMethod,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KPICard
          label="Faturamento bruto"
          value={fmt(summary.grossRevenue)}
          icon={ReceiptIcon}
          color="text-primary"
        />
        <KPICard
          label="Custo estimado"
          value={fmt(summary.estimatedCost)}
          icon={TrendingDownIcon}
          color="text-amber-500"
        />
        <KPICard
          label="Lucro líquido"
          value={fmt(summary.estimatedProfit)}
          icon={TrendingUpIcon}
          color="text-emerald-600"
        />
        <KPICard
          label="Ticket médio"
          value={fmt(summary.avgTicket)}
          icon={BarChart3Icon}
          color="text-blue-500"
        />
        <KPICard
          label="Total de pedidos"
          value={String(summary.totalOrders)}
          icon={PackageSearchIcon}
          color="text-slate-500"
        />
        <KPICard
          label="Margem de lucro"
          value={`${summary.profitMargin.toFixed(1)}%`}
          icon={PercentIcon}
          color="text-violet-500"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Area Chart — evolução diária */}
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="text-base">Evolução do período</CardTitle>
            <CardDescription>Faturamento e lucro estimado por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyRevenue.length === 0 ? (
              <EmptyChart label="Nenhum dado disponível para o período selecionado." />
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
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="text-base">Tipos de consumo</CardTitle>
            <CardDescription>Faturamento por canal no período</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {consumptionWithLabels.length === 0 ? (
              <EmptyChart label="Sem dados de consumo." />
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
