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
  badgeClass,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  badgeClass: string;
  valueClass?: string;
}) => (
  <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <div className={`rounded-lg p-1.5 ${badgeClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${valueClass}`}>{value}</p>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
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
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:gap-4">
        <KPICard
          label="LTV Médio (Lifetime Value)"
          value={fmt(kpis.ltv)}
          description="Gasto médio total por cliente ativo"
          icon={DollarSignIcon}
          badgeClass="bg-emerald-100 text-emerald-700"
          valueClass="text-emerald-700"
        />
        <KPICard
          label="Churn Rate"
          value={fmtPct(kpis.churnRate)}
          description="Clientes inativos ou em risco sobre o total"
          icon={TrendingDownIcon}
          badgeClass={kpis.churnRate > 30 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}
          valueClass={kpis.churnRate > 30 ? "text-rose-700" : "text-amber-700"}
        />
        <KPICard
          label="CAC (Custo de Aquisição)"
          value={kpis.cac > 0 ? fmt(kpis.cac) : "—"}
          description={
            kpis.cac > 0
              ? `${kpis.newCustomers} novos clientes · ${fmt(kpis.marketingSpend)} investidos`
              : "Sem gastos de marketing cadastrados"
          }
          icon={UsersIcon}
          badgeClass="bg-blue-100 text-blue-700"
          valueClass="text-blue-700"
        />
        <KPICard
          label="ROI em Cupons"
          value={kpis.roi > 0 ? fmtPct(kpis.roi) : "—"}
          description="Retorno sobre investimento em cupons"
          icon={kpis.roi >= 0 ? TrendingUpIcon : TrendingDownIcon}
          badgeClass={kpis.roi >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}
          valueClass={kpis.roi >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
      </div>

      {/* Funnel Chart */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
            <ShoppingCartIcon size={16} className="text-slate-500" />
            Funil de Conversão do Cardápio
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Jornada do cliente desde o carrinho até o pedido finalizado
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {kpis.conversionFunnel.carts === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                <BarChart3Icon size={24} />
              </div>
              <p className="font-display text-sm font-semibold text-slate-900">Sem dados de funil</p>
              <p className="max-w-xs text-xs text-slate-500">
                Sem registros de carrinho ou checkout no período selecionado.
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
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {funnelWithRate.slice(1).map((item, i) => (
                <span
                  key={i}
                  className="rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {funnelData[i]!.name} → {item.name}: <strong className="font-semibold text-slate-900">{item.taxa}%</strong>
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
