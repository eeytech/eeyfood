"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardData } from "@/lib/admin-queries";

import DreTab from "./dre-tab";
import ExportPDFButton from "./export-pdf-button";
import LogisticaTab from "./logistica-tab";
import MarketingTab from "./marketing-tab";
import OverviewTab from "./overview-tab";
import PagamentosTab from "./pagamentos-tab";
import ProdutosTab from "./produtos-tab";

const TABS = [
  { value: "overview", label: "Painel Geral" },
  { value: "produtos", label: "Produtos" },
  { value: "logistica", label: "Logística" },
  { value: "marketing", label: "Marketing" },
  { value: "pagamentos", label: "Pagamentos" },
  { value: "dre", label: "DRE Financeiro" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

interface DashboardTabsProps {
  data: DashboardData;
  from: string;
  to: string;
}

const DashboardTabs = ({ data, from, to }: DashboardTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabValue>("overview");

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <TabsList className="h-auto flex-wrap gap-1 bg-white/70 p-1">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <ExportPDFButton data={data} activeTab={activeTab} from={from} to={to} />
      </div>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab data={data} />
      </TabsContent>

      <TabsContent value="produtos" className="mt-4">
        <ProdutosTab data={data} />
      </TabsContent>

      <TabsContent value="logistica" className="mt-4">
        <LogisticaTab data={data} />
      </TabsContent>

      <TabsContent value="marketing" className="mt-4">
        <MarketingTab data={data} />
      </TabsContent>

      <TabsContent value="pagamentos" className="mt-4">
        <PagamentosTab data={data} />
      </TabsContent>

      <TabsContent value="dre" className="mt-4">
        <DreTab data={data} />
      </TabsContent>
    </Tabs>
  );
};

export default DashboardTabs;
