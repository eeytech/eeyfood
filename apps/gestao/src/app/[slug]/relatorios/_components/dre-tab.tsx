"use client";

import { BarChart3Icon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const vertPct = (value: number, base: number) => {
  if (base === 0) return "—";
  return `${((value / base) * 100).toFixed(1)}%`;
};

// ─── Row sub-components ────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-slate-100/80">
      <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </td>
    </tr>
  );
}

function LineRow({
  label,
  operator,
  value,
  base,
  deduction = false,
  indent = false,
}: {
  label: string;
  operator: string;
  value: number;
  base: number;
  deduction?: boolean;
  indent?: boolean;
}) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className={`py-2 pr-4 ${indent ? "pl-10" : "pl-4"}`}>
        <span className="mr-2 font-mono text-xs text-muted-foreground">{operator}</span>
        {label}
      </td>
      <td
        className={`py-2 pr-4 text-right font-mono text-sm ${
          deduction ? "text-red-600" : "text-emerald-700"
        }`}
      >
        {deduction ? `(${fmt(value)})` : fmt(value)}
      </td>
      <td className="py-2 pr-4 text-right text-xs text-muted-foreground">
        {vertPct(value, base)}
      </td>
    </tr>
  );
}

function SubtotalRow({
  label,
  value,
  base,
  deduction = false,
}: {
  label: string;
  value: number;
  base: number;
  deduction?: boolean;
}) {
  const isNegative = value < 0;
  const displayValue = Math.abs(value);
  const showAsDeduction = deduction || isNegative;

  return (
    <tr className="border-b-2 border-slate-200 bg-slate-50">
      <td className="px-4 py-2.5 text-sm font-semibold">{label}</td>
      <td
        className={`py-2.5 pr-4 text-right font-mono text-sm font-semibold ${
          showAsDeduction ? "text-red-700" : "text-emerald-700"
        }`}
      >
        {showAsDeduction ? `(${fmt(displayValue)})` : fmt(displayValue)}
      </td>
      <td className="py-2.5 pr-4 text-right text-xs font-medium text-muted-foreground">
        {vertPct(displayValue, base)}
      </td>
    </tr>
  );
}

function ResultRow({
  value,
  base,
}: {
  value: number;
  base: number;
}) {
  const isProfit = value >= 0;

  return (
    <tr
      className={`border-t-2 border-slate-300 ${
        isProfit ? "bg-emerald-50" : "bg-red-50"
      }`}
    >
      <td className={`px-4 py-3 text-sm font-bold ${isProfit ? "text-emerald-800" : "text-red-800"}`}>
        (=) RESULTADO LÍQUIDO (EBITDA)
      </td>
      <td
        className={`py-3 pr-4 text-right font-mono text-base font-bold ${
          isProfit ? "text-emerald-700" : "text-red-700"
        }`}
      >
        {isProfit ? fmt(value) : `(${fmt(Math.abs(value))})`}
      </td>
      <td
        className={`py-3 pr-4 text-right text-sm font-semibold ${
          isProfit ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {vertPct(Math.abs(value), base)}
      </td>
    </tr>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface DreTabProps {
  data: DashboardData;
}

const DreTab = ({ data }: DreTabProps) => {
  const { summary, financialBreakdown } = data;

  const revenueTransactions = financialBreakdown.filter((f) => f.type === "REVENUE");
  const expenseTransactions = financialBreakdown.filter((f) => f.type === "EXPENSE");

  const faturamentoPedidos = summary.grossRevenue;
  const receitasAvulsas = revenueTransactions.reduce((s, f) => s + f.total, 0);
  const receitaBrutaTotal = faturamentoPedidos + receitasAvulsas;

  const cmv = summary.estimatedCost;
  const margemContribuicao = receitaBrutaTotal - cmv;

  const totalDespesas = expenseTransactions.reduce((s, f) => s + f.total, 0);
  const resultadoLiquido = margemContribuicao - totalDespesas;

  const isProfit = resultadoLiquido >= 0;

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="pb-4 pt-5">
            <p className="text-xs text-muted-foreground">Receita Bruta Total</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{fmt(receitaBrutaTotal)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{summary.totalOrders} pedidos no período</p>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardContent className="pb-4 pt-5">
            <p className="text-xs text-muted-foreground">CMV – Custo de Mercadoria</p>
            <p className="mt-1 text-xl font-bold text-orange-600">{fmt(cmv)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {vertPct(cmv, receitaBrutaTotal)} da receita bruta
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardContent className="pb-4 pt-5">
            <p className="text-xs text-muted-foreground">Despesas Operacionais</p>
            <p className="mt-1 text-xl font-bold text-red-600">{fmt(totalDespesas)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {vertPct(totalDespesas, receitaBrutaTotal)} da receita bruta
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border-white/80 ${isProfit ? "bg-emerald-50/90" : "bg-red-50/90"}`}
        >
          <CardContent className="pb-4 pt-5">
            <p className="text-xs text-muted-foreground">Resultado Líquido</p>
            <p
              className={`mt-1 text-xl font-bold ${isProfit ? "text-emerald-700" : "text-red-700"}`}
            >
              {fmt(resultadoLiquido)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Margem: {vertPct(Math.abs(resultadoLiquido), receitaBrutaTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Table */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3Icon size={16} />
            DRE — Demonstrativo de Resultado do Exercício
          </CardTitle>
          <CardDescription>
            Análise vertical da lucratividade. Percentuais calculados sobre a Receita Bruta Total.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Descrição</th>
                  <th className="pr-4 py-2.5 text-right font-medium">Valor (R$)</th>
                  <th className="pr-4 py-2.5 text-right font-medium">A.V.%</th>
                </tr>
              </thead>
              <tbody>
                {/* ── 1. RECEITA BRUTA ───────────────────────────────────── */}
                <SectionHeader label="1. Receita Operacional Bruta" />

                <LineRow
                  label="Faturamento de Pedidos"
                  operator="(+)"
                  value={faturamentoPedidos}
                  base={receitaBrutaTotal}
                  indent
                />

                {revenueTransactions.map((f, i) => (
                  <LineRow
                    key={i}
                    label={f.categoryName ?? "Receitas Avulsas"}
                    operator="(+)"
                    value={f.total}
                    base={receitaBrutaTotal}
                    indent
                  />
                ))}

                <SubtotalRow
                  label="(=) RECEITA BRUTA TOTAL"
                  value={receitaBrutaTotal}
                  base={receitaBrutaTotal}
                />

                {/* ── 2. CMV ─────────────────────────────────────────────── */}
                <SectionHeader label="2. Custo de Mercadoria Vendida (CMV)" />

                <LineRow
                  label="CMV — Custo estimado dos produtos vendidos"
                  operator="(−)"
                  value={cmv}
                  base={receitaBrutaTotal}
                  deduction
                  indent
                />

                <SubtotalRow
                  label="(=) MARGEM DE CONTRIBUIÇÃO"
                  value={margemContribuicao}
                  base={receitaBrutaTotal}
                  deduction={margemContribuicao < 0}
                />

                {/* ── 3. DESPESAS OPERACIONAIS ──────────────────────────── */}
                <SectionHeader label="3. Despesas Operacionais" />

                {expenseTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-10 py-3 text-xs italic text-muted-foreground"
                    >
                      Nenhuma despesa operacional registrada no período.
                    </td>
                  </tr>
                ) : (
                  expenseTransactions.map((f, i) => (
                    <LineRow
                      key={i}
                      label={f.categoryName ?? "Despesas Gerais"}
                      operator="(−)"
                      value={f.total}
                      base={receitaBrutaTotal}
                      deduction
                      indent
                    />
                  ))
                )}

                <SubtotalRow
                  label="(=) TOTAL DE DESPESAS OPERACIONAIS"
                  value={totalDespesas}
                  base={receitaBrutaTotal}
                  deduction
                />

                {/* ── RESULTADO LÍQUIDO ─────────────────────────────────── */}
                <ResultRow value={resultadoLiquido} base={receitaBrutaTotal} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DreTab;
