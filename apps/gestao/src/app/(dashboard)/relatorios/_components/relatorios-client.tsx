"use client";

import { BarChart3Icon } from "lucide-react";
import { useState } from "react";

import type { AdvancedKPIs, DashboardData } from "@/lib/admin-queries";

import DashboardTabs, { type TabValue } from "./dashboard-tabs";
import DateRangeFilter from "./date-range-filter";
import ExportPDFButton from "./export-pdf-button";

interface RelatoriosClientProps {
  data: DashboardData;
  kpis: AdvancedKPIs;
  slug: string;
  from: string;
  to: string;
}

export function RelatoriosClient({
  data,
  kpis,
  slug,
  from,
  to,
}: RelatoriosClientProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("overview");

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <BarChart3Icon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Relatórios e Analytics
            </h1>
            <p className="text-sm text-slate-500">
              Acompanhe faturamento, pedidos, métricas de crescimento e DRE financeiro em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportPDFButton
            data={data}
            activeTab={activeTab}
            from={from}
            to={to}
          />
        </div>
      </div>

      {/* ── Filtros do Período ───────────────────────────── */}
      <DateRangeFilter from={from} to={to} />

      {/* ── Abas e Conteúdo ──────────────────────────────── */}
      <DashboardTabs
        data={data}
        kpis={kpis}
        slug={slug}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
