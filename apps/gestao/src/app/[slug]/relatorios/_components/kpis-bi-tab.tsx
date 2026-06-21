"use client";

import {
  BarChart3Icon,
  DollarSignIcon,
  ShoppingCartIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdvancedKPIs } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

interface KPIBiTabProps {
  kpis: AdvancedKPIs;
}

const KPICard = ({
  label,
  value,
  description,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  color: string;
}) => (
  <Card className="border-white/80 bg-white/90">
    <CardContent className="flex items-start justify-between gap-3 p-4">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display mt-0.5 text-xl font-semibold">{value}</p>
        {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <Icon className={`${color} mt-0.5 shrink-0`} size={20} />
    </CardContent>
  </Card>
);

const FUNNEL_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

const KPIsBITab = ({ kpis }: KPIBiTabProps) => {
  const funnelData = [
    { name: "Carrinhos Criados", value: kpis.conversionFunnel.carts },
    { name: "Checkouts Iniciados", value: kpis.conversionFunnel.checkouts },
    { name: "Pedidos Finalizados", value: kpis.conversionFunnel.orders },
  ];

  const funnelWithRate = funnelData.map((item, i) => ({
    ...item,
    taxa:
      i === 0
        ? 100
        : funnelData[i - 1]!.value > 0
          ? Math.round((item.value / funnelData[i - 1]!.value) * 100)
          : 0,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <KPICard
          label="LTV Médio (Lifetime Value)"
          value={fmt(kpis.ltv)}
          description="Gasto médio total por cliente ativo"
          icon={DollarSignIcon}
          color="text-emerald-600"
        />
        <KPICard
          label="Churn Rate"
          value={fmtPct(kpis.churnRate)}
          description="Clientes inativos ou em risco sobre o total"
          icon={TrendingDownIcon}
          color={kpis.churnRate > 30 ? "text-rose-600" : "text-amber-500"}
        />
        <KPICard
          label="CAC (Custo de Aquisição)"
          value={kpis.cac > 0 ? fmt(kpis.cac) : "—"}
          description={
            kpis.cac > 0
              ? `${kpis.newCustomers} novos clientes · ${fmt(kpis.marketingSpend)} investidos`
              : "Registre gastos de marketing para calcular"
          }
          icon={UsersIcon}
          color="text-blue-500"
        />
        <KPICard
          label="ROI em Cupons"
          value={kpis.roi > 0 ? fmtPct(kpis.roi) : "—"}
          description="Retorno sobre investimento em promoções"
          icon={kpis.roi >= 0 ? TrendingUpIcon : TrendingDownIcon}
          color={kpis.roi >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      {/* Funnel Chart */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCartIcon size={18} className="text-primary" />
            Funil de Conversão do Cardápio
          </CardTitle>
          <CardDescription>
            Jornada do cliente desde o carrinho até o pedido finalizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kpis.conversionFunnel.carts === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-slate-50">
              <BarChart3Icon className="text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">
                Sem dados de carrinho no período selecionado.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={funnelWithRate}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value, _name, props) => [
                    `${String(value)} (${String(props.payload.taxa)}% de conversão)`,
                    "Volume",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {funnelWithRate.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Conversion rate badges */}
          {kpis.conversionFunnel.carts > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {funnelWithRate.slice(1).map((item, i) => (
                <span
                  key={i}
                  className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {funnelData[i]!.name} → {item.name}: {item.taxa}%
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KPIsBITab;
