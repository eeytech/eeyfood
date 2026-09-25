"use client";

import {
  BarChart3Icon,
  DollarSignIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";

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
    <tr className="bg-slate-100/90">
      <td colSpan={3} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
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
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
      <td className={`py-2.5 pr-4 text-xs font-medium text-slate-800 ${indent ? "pl-9" : "pl-4"}`}>
        <span className="mr-2 font-mono text-xs text-slate-400">{operator}</span>
        {label}
      </td>
      <td
        className={`py-2.5 pr-4 text-right font-mono text-xs font-medium ${
          deduction ? "text-rose-600" : "text-emerald-700"
        }`}
      >
        {deduction ? `(${fmt(value)})` : fmt(value)}
      </td>
      <td className="py-2.5 pr-4 text-right text-xs text-slate-500">
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
    <tr className="border-b-2 border-slate-200 bg-slate-50/80">
      <td className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-900">{label}</td>
      <td
        className={`py-2.5 pr-4 text-right font-mono text-xs font-bold ${
          showAsDeduction ? "text-rose-700" : "text-emerald-700"
        }`}
      >
        {showAsDeduction ? `(${fmt(displayValue)})` : fmt(displayValue)}
      </td>
      <td className="py-2.5 pr-4 text-right text-xs font-semibold text-slate-600">
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
        isProfit ? "bg-emerald-50/70" : "bg-rose-50/70"
      }`}
    >
      <td className={`px-4 py-3 text-sm font-bold ${isProfit ? "text-emerald-900" : "text-rose-900"}`}>
        (=) RESULTADO LÍQUIDO (EBITDA)
      </td>
      <td
        className={`py-3 pr-4 text-right font-mono text-base font-bold ${
          isProfit ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {isProfit ? fmt(value) : `(${fmt(Math.abs(value))})`}
      </td>
      <td
        className={`py-3 pr-4 text-right text-sm font-semibold ${
          isProfit ? "text-emerald-700" : "text-rose-700"
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
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Receita Bruta Total
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <ReceiptIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {fmt(receitaBrutaTotal)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {summary.totalOrders} pedidos faturados
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                CMV – Custo Mercadoria
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <TrendingDownIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {fmt(cmv)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {vertPct(cmv, receitaBrutaTotal)} da receita bruta
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Despesas Operacionais
              </span>
              <div className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-rose-700">
              {fmt(totalDespesas)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {vertPct(totalDespesas, receitaBrutaTotal)} da receita bruta
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Resultado Líquido
              </span>
              <div className={`rounded-lg p-1.5 ${isProfit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className={`mt-2 font-display text-2xl font-bold ${isProfit ? "text-emerald-700" : "text-rose-700"}`}>
              {fmt(resultadoLiquido)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Margem líquida: {vertPct(Math.abs(resultadoLiquido), receitaBrutaTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Table */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
            <BarChart3Icon size={16} className="text-slate-500" />
            DRE — Demonstrativo de Resultado do Exercício
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Análise vertical da lucratividade. Percentuais calculados sobre a Receita Bruta Total.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Descrição</th>
                  <th className="py-2.5 pr-4 text-right font-semibold text-slate-700">Valor (R$)</th>
                  <th className="py-2.5 pr-4 text-right font-semibold text-slate-700">A.V.%</th>
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
                      className="px-10 py-3 text-xs italic text-slate-400"
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
