"use client";

import { PackageSearchIcon } from "lucide-react";
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

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-slate-50 py-12">
    <PackageSearchIcon className="text-muted-foreground" size={32} />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

interface ProdutosTabProps {
  data: DashboardData;
}

const ProdutosTab = ({ data }: ProdutosTabProps) => {
  const { topProducts, bottomProducts, topModifiers } = data;

  return (
    <div className="space-y-4">
      {/* Top 10 produtos — gráfico horizontal */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="text-base">Top 10 produtos mais vendidos</CardTitle>
          <CardDescription>Ranking por quantidade de unidades vendidas no período</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <EmptyState label="Nenhum produto vendido no período selecionado." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, topProducts.length * 44)}>
              <BarChart
                data={topProducts}
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
                <Bar dataKey="totalQuantity" name="Unidades" radius={[0, 6, 6, 0]}>
                  {topProducts.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "#e41d2c" : i === 1 ? "#ff6b00" : "#64748b"}
                      fillOpacity={1 - i * 0.06}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Produtos com menor saída */}
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="text-base">Produtos com menor saída</CardTitle>
            <CardDescription>
              Produtos que tiveram menos pedidos ou nenhuma saída no período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bottomProducts.length === 0 ? (
              <EmptyState label="Nenhum produto cadastrado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-2 text-left font-medium">Produto</th>
                      <th className="px-2 py-2 text-right font-medium">Unidades</th>
                      <th className="px-2 py-2 text-right font-medium">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bottomProducts.map((p) => (
                      <tr key={p.productId} className="border-b last:border-0">
                        <td className="px-2 py-2 font-medium">
                          {p.productName}
                          {p.totalQuantity === 0 && (
                            <Badge variant="warning" className="ml-2 text-[10px]">
                              Sem saída
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">{p.totalQuantity}</td>
                        <td className="px-2 py-2 text-right">{fmt(p.grossRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opcionais mais pedidos */}
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="text-base">Opcionais / adicionais mais pedidos</CardTitle>
            <CardDescription>Modificadores com maior número de seleções</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topModifiers.length === 0 ? (
              <EmptyState label="Nenhum opcional registrado no período." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-2 text-left font-medium">#</th>
                      <th className="px-2 py-2 text-left font-medium">Opcional</th>
                      <th className="px-2 py-2 text-right font-medium">Qtd.</th>
                      <th className="px-2 py-2 text-right font-medium">Receita extra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topModifiers.map((m, i) => (
                      <tr key={m.optionName} className="border-b last:border-0">
                        <td className="px-2 py-2 text-xs text-muted-foreground">#{i + 1}</td>
                        <td className="px-2 py-2 font-medium">{m.optionName}</td>
                        <td className="px-2 py-2 text-right">{m.totalCount}</td>
                        <td className="px-2 py-2 text-right">{fmt(m.estimatedRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProdutosTab;
