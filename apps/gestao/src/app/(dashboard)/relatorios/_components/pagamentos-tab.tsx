"use client";

import { ArrowDownCircleIcon, ArrowUpCircleIcon, CreditCardIcon } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Donut de pagamentos */}
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
              <CreditCardIcon size={16} className="text-slate-500" />
              Meios de pagamento
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Divisão do faturamento por forma de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {paymentWithLabels.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                  <CreditCardIcon size={24} />
                </div>
                <p className="font-display text-sm font-semibold text-slate-900">Sem pagamentos</p>
                <p className="max-w-xs text-xs text-slate-500">Nenhum pagamento registrado no período.</p>
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
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {paymentWithLabels.map((p, i) => (
                    <div key={p.paymentMethod} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="font-medium text-slate-700">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900">{fmt(p.total)}</span>
                        <span className="ml-1.5 text-slate-400">
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
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Balanço operacional
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Faturamento vs. gastos operacionais cadastrados no período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {/* Summary row */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Receita de pedidos
                </span>
                <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                  {fmt(summary.grossRevenue)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Gastos operacionais
                </span>
                <p className="mt-1 font-display text-lg font-bold text-rose-700">
                  {fmt(totalExpenses)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Balanço líquido
                </span>
                <p
                  className={`mt-1 font-display text-lg font-bold ${
                    summary.grossRevenue + totalRevenues - totalExpenses >= 0
                      ? "text-blue-700"
                      : "text-rose-700"
                  }`}
                >
                  {fmt(summary.grossRevenue + totalRevenues - totalExpenses)}
                </p>
              </div>
            </div>

            {/* Breakdown table */}
            {financialBreakdown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 py-8 text-center text-xs text-slate-500">
                Nenhuma transação financeira registrada no período.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-700">Categoria</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Tipo</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">Qtd.</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-700">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialBreakdown.map((f, i) => (
                      <TableRow key={i} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <TableCell className="font-medium text-slate-900">
                          {f.categoryName ?? "Sem categoria"}
                        </TableCell>
                        <TableCell>
                          {f.type === "EXPENSE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                              <ArrowDownCircleIcon size={12} />
                              Despesa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <ArrowUpCircleIcon size={12} />
                              Receita
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-700">{f.count}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${f.type === "EXPENSE" ? "text-rose-600" : "text-emerald-700"}`}
                        >
                          {f.type === "EXPENSE" ? "−" : "+"}
                          {fmt(f.total)}
                        </TableCell>
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

export default PagamentosTab;
