"use client";

import { ArrowDownCircleIcon, ArrowUpCircleIcon, CreditCardIcon } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PAYMENT_LABELS: Record<string, string> = {
  MERCADO_PAGO: "Mercado Pago",
  DINHEIRO: "Dinheiro",
  CARTAO_PRESENCIAL: "Cartão Presencial",
};

const COLORS = ["#e41d2c", "#ff6b00", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

interface PagamentosTabProps {
  data: DashboardData;
}

const PagamentosTab = ({ data }: PagamentosTabProps) => {
  const { paymentMethods, financialBreakdown, summary } = data;

  const paymentWithLabels = paymentMethods.map((p) => ({
    ...p,
    name: PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod,
  }));

  const expenses = financialBreakdown.filter((f) => f.type === "EXPENSE");
  const revenues = financialBreakdown.filter((f) => f.type === "REVENUE");
  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);
  const totalRevenues = revenues.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {/* Donut de pagamentos */}
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCardIcon size={16} />
              Meios de pagamento
            </CardTitle>
            <CardDescription>Divisão do faturamento por forma de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentWithLabels.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-slate-50 py-12">
                <CreditCardIcon className="text-muted-foreground" size={32} />
                <p className="text-sm text-muted-foreground">Sem dados de pagamento.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={paymentWithLabels}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="name"
                    >
                      {paymentWithLabels.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmt(Number(v))}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {paymentWithLabels.map((p, i) => (
                    <div key={p.paymentMethod} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span>{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{fmt(p.total)}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({p.count} ped.)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Balanço financeiro */}
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="text-base">Balanço operacional</CardTitle>
            <CardDescription>
              Faturamento vs. gastos operacionais cadastrados no período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary row */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs text-muted-foreground">Receita de pedidos</p>
                <p className="mt-0.5 text-lg font-semibold text-emerald-700">
                  {fmt(summary.grossRevenue)}
                </p>
              </div>
              <div className="rounded-2xl bg-red-50 p-3">
                <p className="text-xs text-muted-foreground">Gastos operacionais</p>
                <p className="mt-0.5 text-lg font-semibold text-red-700">{fmt(totalExpenses)}</p>
              </div>
              <div
                className={`rounded-2xl p-3 ${summary.grossRevenue + totalRevenues - totalExpenses >= 0 ? "bg-blue-50" : "bg-red-50"}`}
              >
                <p className="text-xs text-muted-foreground">Balanço líquido</p>
                <p
                  className={`mt-0.5 text-lg font-semibold ${summary.grossRevenue + totalRevenues - totalExpenses >= 0 ? "text-blue-700" : "text-red-700"}`}
                >
                  {fmt(summary.grossRevenue + totalRevenues - totalExpenses)}
                </p>
              </div>
            </div>

            {/* Breakdown table */}
            {financialBreakdown.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-slate-50 py-8 text-center text-sm text-muted-foreground">
                Nenhuma transação financeira registrada no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-2 text-left font-medium">Categoria</th>
                      <th className="px-2 py-2 text-left font-medium">Tipo</th>
                      <th className="px-2 py-2 text-right font-medium">Qtd.</th>
                      <th className="px-2 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialBreakdown.map((f, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-2 font-medium">
                          {f.categoryName ?? "Sem categoria"}
                        </td>
                        <td className="px-2 py-2">
                          {f.type === "EXPENSE" ? (
                            <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100">
                              <ArrowDownCircleIcon size={11} />
                              Despesa
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              <ArrowUpCircleIcon size={11} />
                              Receita
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">{f.count}</td>
                        <td
                          className={`px-2 py-2 text-right font-medium ${f.type === "EXPENSE" ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {f.type === "EXPENSE" ? "−" : "+"}
                          {fmt(f.total)}
                        </td>
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

export default PagamentosTab;
