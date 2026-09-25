import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buscarDadosDashboard, buscarKPIsAvancados } from "@/lib/admin-queries";

import { RelatoriosClient } from "./_components/relatorios-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatórios & Analytics | Gestão",
};

interface RelatoriosPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const RelatoriosPage = async ({ params, searchParams }: RelatoriosPageProps) => {
  const { slug } = await params;
  const { from, to } = await searchParams;

  const defaults = getDefaultRange();
  const fromStr = from ?? defaults.from;
  const toStr = to ?? defaults.to;

  const startDate = new Date(`${fromStr}T00:00:00.000Z`);
  const endDate = new Date(`${toStr}T23:59:59.999Z`);

  const [data, kpis] = await Promise.all([
    buscarDadosDashboard(slug, startDate, endDate),
    buscarKPIsAvancados(slug, startDate, endDate),
  ]);

  if (!data || !kpis) return notFound();

  return (
    <RelatoriosClient
      data={data}
      kpis={kpis}
      slug={slug}
      from={fromStr}
      to={toStr}
    />
  );
};

export default RelatoriosPage;
