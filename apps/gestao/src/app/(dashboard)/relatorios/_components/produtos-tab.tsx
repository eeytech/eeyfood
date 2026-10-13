"use client";

import { PackageSearchIcon, SearchIcon, SparklesIcon, TrendingDownIcon, TrophyIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTheme } from "@/components/theme-provider";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
    <div className="rounded-full bg-slate-100 p-3 text-slate-400">
      <PackageSearchIcon size={24} />
    </div>
    <p className="font-display text-sm font-semibold text-slate-900">Nenhum registro encontrado</p>
    <p className="max-w-xs text-xs text-slate-500">{label}</p>
  </div>
);

interface ProdutosTabProps {
  data: DashboardData;
}

const ProdutosTab = ({ data }: ProdutosTabProps) => {
  const { topProducts, bottomProducts, topModifiers } = data;
  const { currentThemeConfig } = useTheme();
  const [search, setSearch] = useState("");
  const [metricSort, setMetricSort] = useState<"QTY" | "REVENUE">("QTY");

  const totalSoldUnits = useMemo(
    () => topProducts.reduce((sum, p) => sum + p.totalQuantity, 0),
    [topProducts],
  );

  const topProductLeader = topProducts[0];
  const topModifierLeader = topModifiers[0];
  const zeroSalesCount = bottomProducts.filter((p) => p.totalQuantity === 0).length;

  const filteredTop = useMemo(() => {
    let list = [...topProducts];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) => p.productName.toLowerCase().includes(q));
    }
    if (metricSort === "REVENUE") {
      list.sort((a, b) => b.grossRevenue - a.grossRevenue);
    } else {
      list.sort((a, b) => b.totalQuantity - a.totalQuantity);
    }
    return list;
  }, [topProducts, search, metricSort]);

  const filteredBottom = useMemo(() => {
    if (!search.trim()) return bottomProducts;
    const q = search.toLowerCase().trim();
    return bottomProducts.filter((p) => p.productName.toLowerCase().includes(q));
  }, [bottomProducts, search]);

  const filteredModifiers = useMemo(() => {
    if (!search.trim()) return topModifiers;
    const q = search.toLowerCase().trim();
    return topModifiers.filter((m) => m.optionName.toLowerCase().includes(q));
  }, [topModifiers, search]);

  return (
    <div className="space-y-6">
      {/* KPI Cards dos Produtos com cores do tema */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Unidades vendidas
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <PackageSearchIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {totalSoldUnits}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Total acumulado no período</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mais vendido
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <TrophyIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-lg font-bold text-slate-900 truncate" title={topProductLeader?.productName ?? "—"}>
              {topProductLeader ? topProductLeader.productName : "—"}
            </p>
            <p className="mt-0.5 text-xs text-primary font-medium">
              {topProductLeader ? `${topProductLeader.totalQuantity} un. (${fmt(topProductLeader.grossRevenue)})` : "Sem vendas"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Opcional mais pedido
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <SparklesIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-lg font-bold text-slate-900 truncate" title={topModifierLeader?.optionName ?? "—"}>
              {topModifierLeader ? topModifierLeader.optionName : "—"}
            </p>
            <p className="mt-0.5 text-xs text-primary font-medium">
              {topModifierLeader ? `${topModifierLeader.totalCount} seleções (${fmt(topModifierLeader.estimatedRevenue)})` : "Sem adicionais"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sem saída no período
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <TrendingDownIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {zeroSalesCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Itens com 0 unidades vendidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Top produtos — gráfico horizontal com filtros */}
      <Card className="border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-base font-semibold text-slate-900">
                Ranking de produtos mais vendidos
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Desempenho por unidades e faturamento no período
              </CardDescription>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto ou opcional..."
                  className="h-8 w-52 pl-8 text-xs bg-slate-50/70"
                />
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setMetricSort("QTY")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    metricSort === "QTY"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Por unidades
                </button>
                <button
                  type="button"
                  onClick={() => setMetricSort("REVENUE")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    metricSort === "REVENUE"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Por faturamento
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredTop.length === 0 ? (
            <EmptyState label="Nenhum produto atende aos critérios do filtro." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, filteredTop.length * 44)}>
              <BarChart
                data={filteredTop}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="productName"
                  width={180}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "totalQuantity" ? `${value} un.` : fmt(Number(value)),
                    name === "totalQuantity" ? "Unidades" : "Receita",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey={metricSort === "REVENUE" ? "grossRevenue" : "totalQuantity"}
                  name={metricSort === "REVENUE" ? "Receita" : "Unidades"}
                  radius={[0, 6, 6, 0]}
                  fill="#e41d2c"
                >
                  {filteredTop.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "#e41d2c" : i === 1 ? "#ff6b00" : "#64748b"}
                      fillOpacity={1 - i * 0.05}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Produtos com menor saída */}
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Produtos com menor saída
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Produtos que tiveram menos pedidos ou nenhuma saída no período
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBottom.length === 0 ? (
              <div className="p-6">
                <EmptyState label="Nenhum produto cadastrado ou correspondente à busca." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-700">Produto</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">Unidades</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBottom.map((p) => (
                      <TableRow key={p.productId} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="font-medium text-slate-900">
                          {p.productName}
                          {p.totalQuantity === 0 && (
                            <span
                              className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors"
                              style={{
                                color: currentThemeConfig.hex,
                                borderColor: `${currentThemeConfig.hex}40`,
                                backgroundColor: `${currentThemeConfig.hex}15`,
                              }}
                            >
                              Sem saída
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-700">{p.totalQuantity}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">{fmt(p.grossRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opcionais mais pedidos */}
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Opcionais / adicionais mais pedidos
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Modificadores com maior número de seleções no período
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredModifiers.length === 0 ? (
              <div className="p-6">
                <EmptyState label="Nenhum opcional registrado ou correspondente à busca." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="w-12 text-xs font-semibold text-slate-700">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Opcional</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">Qtd.</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">Receita extra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModifiers.map((m, i) => (
                      <TableRow key={m.optionName} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="font-mono text-xs text-slate-400">#{i + 1}</TableCell>
                        <TableCell className="font-medium text-slate-900">{m.optionName}</TableCell>
                        <TableCell className="text-right font-medium text-slate-700">{m.totalCount}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{fmt(m.estimatedRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProdutosTab;
