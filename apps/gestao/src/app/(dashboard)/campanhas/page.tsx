import {
  customersTable,
  db,
  eq,
} from "@fsw/db";
import {
  AlertTriangleIcon,
  HeartIcon,
  MegaphoneIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
  UserXIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import { dispararCampanhaAction } from "../marketing-actions";
import { CampanhaForm } from "./campanha-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params?: Promise<{ slug?: string }>;
}

const SEGMENT_CARDS = [
  {
    value: "ALL",
    label: "Total de Clientes",
    desc: "Base completa",
    icon: UsersIcon,
    badgeClass: "bg-slate-100 text-slate-700",
    textClass: "text-slate-900",
  },
  {
    value: "NEW",
    label: "Novos",
    desc: "1º pedido recente",
    icon: UserPlusIcon,
    badgeClass: "bg-blue-100 text-blue-700",
    textClass: "text-blue-700",
  },
  {
    value: "VIP",
    label: "VIP",
    desc: "Alta frequência",
    icon: SparklesIcon,
    badgeClass: "bg-amber-100 text-amber-700",
    textClass: "text-amber-700",
  },
  {
    value: "LOYAL",
    label: "Leais",
    desc: "Pedidos recorrentes",
    icon: HeartIcon,
    badgeClass: "bg-purple-100 text-purple-700",
    textClass: "text-purple-700",
  },
  {
    value: "AT_RISK",
    label: "Em Risco",
    desc: "Sem compras há dias",
    icon: AlertTriangleIcon,
    badgeClass: "bg-orange-100 text-orange-700",
    textClass: "text-orange-700",
  },
  {
    value: "CHURNED",
    label: "Inativos",
    desc: "Sem atividade recente",
    icon: UserXIcon,
    badgeClass: "bg-rose-100 text-rose-700",
    textClass: "text-rose-700",
  },
];

async function getSegmentCounts(restaurantId: string) {
  const all = await db
    .select({ segment: customersTable.segment })
    .from(customersTable)
    .where(eq(customersTable.restaurantId, restaurantId));

  const counts: Record<string, number> = { ALL: all.length };
  for (const { segment } of all) {
    counts[segment] = (counts[segment] ?? 0) + 1;
  }

  return counts;
}

export default async function CampanhasPage({ params }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    notFound();
  }

  const restaurantSlug = restaurant.slug;
  const counts = await getSegmentCounts(restaurant.id);

  async function dispatch(formData: FormData) {
    "use server";
    return dispararCampanhaAction(restaurantSlug, formData);
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <MegaphoneIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Campanhas de Marketing
            </h1>
            <p className="text-sm text-slate-500">
              Envie mensagens segmentadas via WhatsApp para sua base de clientes com alta conversão.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Disparador WhatsApp Ativo</span>
          </div>
        </div>
      </div>

      {/* ── Segment KPI Metric Cards ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SEGMENT_CARDS.map((card) => {
          const Icon = card.icon;
          const count = counts[card.value] ?? 0;

          return (
            <Card
              key={card.value}
              className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300"
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
                    card.value === "ALL" ? "text-slate-900" : card.textClass,
                  )}
                >
                  {count}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  {card.desc}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Campaign Form & Live Preview ─────────────────── */}
      <CampanhaForm
        segments={SEGMENT_CARDS.map((c) => ({ value: c.value, label: c.label }))}
        counts={counts}
        dispatchAction={dispatch}
      />
    </div>
  );
}
