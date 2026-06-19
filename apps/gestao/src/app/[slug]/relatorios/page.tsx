import { notFound } from "next/navigation";

import { buscarDadosDashboard } from "@/lib/admin-queries";

import DateRangeFilter from "./_components/date-range-filter";
import DashboardTabs from "./_components/dashboard-tabs";

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

  const data = await buscarDadosDashboard(slug, startDate, endDate);

  if (!data) return notFound();

  return (
    <main className="space-y-4">
      <DateRangeFilter from={fromStr} to={toStr} />
      <DashboardTabs data={data} from={fromStr} to={toStr} />
    </main>
  );
};

export default RelatoriosPage;
