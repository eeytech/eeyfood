import {
  customersTable,
  db,
  eq,
  sql,
} from "@fsw/db";
import { Users2Icon } from "lucide-react";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  classificarClientesRFMAction,
  listarClientesCRMAction,
} from "../crm-actions";
import { CrmFilters } from "./crm-filters";
import { CustomerTable } from "./customer-table";

export const dynamic = "force-dynamic";

interface PageProps {
  params?: Promise<{ slug?: string }>;
  searchParams: Promise<{ segment?: string; search?: string; page?: string }>;
}

const SEGMENT_LABELS: Record<string, string> = {
  ALL: "Todos",
  NEW: "Novos",
  VIP: "VIP",
  INACTIVE: "Inativos",
  AT_RISK: "Em Risco",
  RECOVERED: "Recuperados",
};


async function getSegmentStats(restaurantId: string) {
  const rows = await db
    .select({ segment: customersTable.segment, count: sql<number>`count(*)` })
    .from(customersTable)
    .where(eq(customersTable.restaurantId, restaurantId))
    .groupBy(customersTable.segment);

  const stats: Record<string, number> = { ALL: 0 };
  for (const row of rows) {
    stats[row.segment] = Number(row.count);
    stats.ALL += Number(row.count);
  }
  return stats;
}

export default async function CrmPage({ params, searchParams }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const sp = await searchParams;

  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    notFound();
  }

  const restaurantSlug = restaurant.slug;

  const [stats, data] = await Promise.all([
    getSegmentStats(restaurant.id),
    listarClientesCRMAction(restaurantSlug, {
      segment: sp.segment,
      search: sp.search,
      page: sp.page ? Number(sp.page) : 1,
    }),
  ]);

  async function reclassify() {
    "use server";
    await classificarClientesRFMAction(restaurantSlug);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users2Icon className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Clientes (CRM)</h1>
            <p className="text-sm text-muted-foreground">
              Base de clientes identificados por número de telefone.
            </p>
          </div>
        </div>
        <form action={reclassify}>
          <Button type="submit" variant="outline" size="sm">
            Reclassificar segmentos
          </Button>
        </form>
      </div>

      {/* Segment KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(SEGMENT_LABELS).map(([seg, label]) => (
          <Card key={seg} className="text-center">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{stats[seg] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <CrmFilters currentSegment={sp.segment} currentSearch={sp.search} />

      {/* Table */}
      <CustomerTable
        customers={data.customers}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        slug={restaurantSlug}
      />
    </div>
  );
}
