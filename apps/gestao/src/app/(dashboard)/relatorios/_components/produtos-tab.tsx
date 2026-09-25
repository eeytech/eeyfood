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

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
    <div className="rounded-full bg-slate-100 p-3 text-slate-400">
      <PackageSearchIcon size={24} />
    </div>
    <p className="font-display text-sm font-semibold text-slate-900">Nenhum registro</p>
    <p className="max-w-xs text-xs text-slate-500">{label}</p>
  </div>
);

interface ProdutosTabProps {
  data: DashboardData;
}

const ProdutosTab = ({ data }: ProdutosTabProps) => {
  const { topProducts, bottomProducts, topModifiers } = data;

  return (
    <div className="space-y-6">
      {/* Top 10 produtos — gráfico horizontal */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold text-slate-900">
            Top 10 produtos mais vendidos
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Ranking por quantidade de unidades vendidas no período
          </CardDescription>
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
            {bottomProducts.length === 0 ? (
              <div className="p-6">
                <EmptyState label="Nenhum produto cadastrado." />
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
                    {bottomProducts.map((p) => (
                      <TableRow key={p.productId} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="font-medium text-slate-900">
                          {p.productName}
                          {p.totalQuantity === 0 && (
                            <span className="ml-2 inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
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
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Opcionais / adicionais mais pedidos
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Modificadores com maior número de seleções
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topModifiers.length === 0 ? (
              <div className="p-6">
                <EmptyState label="Nenhum opcional registrado no período." />
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
                    {topModifiers.map((m, i) => (
                      <TableRow key={m.optionName} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="font-mono text-xs text-slate-400">#{i + 1}</TableCell>
                        <TableCell className="font-medium text-slate-900">{m.optionName}</TableCell>
                        <TableCell className="text-right font-medium text-slate-700">{m.totalCount}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">{fmt(m.estimatedRevenue)}</TableCell>
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
