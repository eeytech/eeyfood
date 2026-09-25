"use client";

import {
  BarChart3Icon,
  BikeIcon,
  CreditCardIcon,
  ReceiptIcon,
  SparklesIcon,
  TagIcon,
  TrendingUpIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdvancedKPIs, DashboardData } from "@/lib/admin-queries";

import AssistenteIaTab from "./assistente-ia-tab";
import DreTab from "./dre-tab";
import KPIsBITab from "./kpis-bi-tab";
import LogisticaTab from "./logistica-tab";
import MarketingTab from "./marketing-tab";
import OverviewTab from "./overview-tab";
import PagamentosTab from "./pagamentos-tab";
import ProdutosTab from "./produtos-tab";

export const TABS = [
  { value: "overview", label: "Painel Geral", icon: BarChart3Icon },
  { value: "produtos", label: "Produtos", icon: UtensilsCrossedIcon },
  { value: "logistica", label: "Logística", icon: BikeIcon },
  { value: "marketing", label: "Marketing", icon: TagIcon },
  { value: "pagamentos", label: "Pagamentos", icon: CreditCardIcon },
  { value: "dre", label: "DRE Financeiro", icon: ReceiptIcon },
  { value: "kpis", label: "KPIs & BI", icon: TrendingUpIcon },
  { value: "ia", label: "Assistente IA", icon: SparklesIcon },
] as const;

export type TabValue = (typeof TABS)[number]["value"];

interface DashboardTabsProps {
  data: DashboardData;
  kpis: AdvancedKPIs;
  slug: string;
  activeTab?: TabValue;
  onTabChange?: (tab: TabValue) => void;
}

const DashboardTabs = ({
  data,
  kpis,
  slug,
  activeTab: controlledTab,
  onTabChange,
}: DashboardTabsProps) => {
  const [internalTab, setInternalTab] = useState<TabValue>("overview");
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (v: string) => {
    const nextTab = v as TabValue;
    setInternalTab(nextTab);
    onTabChange?.(nextTab);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <div className="print:hidden">
        <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                <Icon size={14} className="mr-1.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-5">
        <OverviewTab data={data} />
      </TabsContent>

      <TabsContent value="produtos" className="mt-5">
        <ProdutosTab data={data} />
      </TabsContent>

      <TabsContent value="logistica" className="mt-5">
        <LogisticaTab data={data} />
      </TabsContent>

      <TabsContent value="marketing" className="mt-5">
        <MarketingTab data={data} />
      </TabsContent>

      <TabsContent value="pagamentos" className="mt-5">
        <PagamentosTab data={data} />
      </TabsContent>

      <TabsContent value="dre" className="mt-5">
        <DreTab data={data} />
      </TabsContent>

      <TabsContent value="kpis" className="mt-5">
        <KPIsBITab kpis={kpis} />
      </TabsContent>

      <TabsContent value="ia" className="mt-5">
        <AssistenteIaTab slug={slug} />
      </TabsContent>
    </Tabs>
  );
};

export default DashboardTabs;
