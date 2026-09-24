import {
  customersTable,
  db,
  eq,
  sql,
} from "@fsw/db";
import {
  AlertTriangleIcon,
  RotateCcwIcon,
  SparklesIcon,
  UserPlusIcon,
  Users2Icon,
  UsersIcon,
  UserXIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import {
  classificarClientesRFMAction,
  listarClientesCRMAction,
} from "../crm-actions";
import { CrmFilters } from "./crm-filters";
import { CrmReclassifyButton } from "./crm-reclassify-button";
import { CustomerTable } from "./customer-table";

export const dynamic = "force-dynamic";

interface PageProps {
  params?: Promise<{ slug?: string }>;
  searchParams: Promise<{ segment?: string; search?: string; page?: string }>;
}

const SEGMENT_CARDS = [
  {
    key: "ALL",
    label: "Total de Clientes",
    description: "Base total de clientes",
    icon: UsersIcon,
    badgeClass: "bg-slate-100 text-slate-700",
    textClass: "text-slate-900",
  },
  {
    key: "NEW",
    label: "Novos",
    description: "1º pedido recente",
    icon: UserPlusIcon,
    badgeClass: "bg-blue-100 text-blue-700",
    textClass: "text-blue-700",
  },
  {
    key: "VIP",
    label: "VIP",
    description: "Alta frequência e ticket",
    icon: SparklesIcon,
    badgeClass: "bg-amber-100 text-amber-700",
    textClass: "text-amber-700",
  },
  {
    key: "RECOVERED",
    label: "Recuperados",
    description: "Voltaram a comprar",
    icon: RotateCcwIcon,
    badgeClass: "bg-emerald-100 text-emerald-700",
    textClass: "text-emerald-700",
  },
  {
    key: "AT_RISK",
    label: "Em Risco",
    description: "Sem pedir há +30 dias",
    icon: AlertTriangleIcon,
    badgeClass: "bg-orange-100 text-orange-700",
    textClass: "text-orange-700",
  },
  {
    key: "INACTIVE",
    label: "Inativos",
    description: "Sem compras há +60 dias",
    icon: UserXIcon,
    badgeClass: "bg-rose-100 text-rose-700",
    textClass: "text-rose-700",
  },
];

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
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Users2Icon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Clientes (CRM)
            </h1>
            <p className="text-sm text-slate-500">
              Base de clientes identificados por telefone com classificação de recorrência RFM e endereços de entrega.
            </p>
          </div>
        </div>

        <CrmReclassifyButton action={reclassify} />
      </div>

      {/* ── Segment KPI Cards (Não clicáveis) ────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SEGMENT_CARDS.map((card) => {
          const count = stats[card.key] ?? 0;
          const Icon = card.icon;

          return (
            <Card
              key={card.key}
              className="border-slate-200/80 bg-white shadow-sm transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                    {card.label}
                  </span>
                  <div className={cn("rounded-lg p-1.5 shrink-0", card.badgeClass)}>
                    <Icon size={16} />
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-2 font-display text-2xl font-bold",
                    card.key === "ALL" ? "text-slate-900" : card.textClass,
                  )}
                >
                  {count}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Filters Card ─────────────────────────────────── */}
      <CrmFilters
        currentSegment={sp.segment}
        currentSearch={sp.search}
        totalShowing={data.customers.length}
        totalCount={data.total}
      />

      {/* ── Customer Table & Cards ───────────────────────── */}
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
