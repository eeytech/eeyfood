import {
  ActivityIcon,
  BarChart2Icon,
  CheckCircle2Icon,
  CreditCardIcon,
  EyeIcon,
  HelpCircleIcon,
  Share2Icon,
  ShoppingCartIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";
import { db, eq, marketingSettingsTable } from "@fsw/db";
import { salvarMarketingSettingsAction } from "../marketing-actions";
import { MarketingSettingsForm } from "./marketing-settings-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params?: Promise<{ slug?: string }>;
}

const EVENTS = [
  {
    name: "ViewContent",
    label: "Visualização do Item",
    desc: "Disparado quando o cliente abre os detalhes de um produto ou prato.",
    icon: EyeIcon,
    colorClass: "bg-blue-50 text-blue-600 border-blue-200/80",
  },
  {
    name: "AddToCart",
    label: "Adicionado ao Carrinho",
    desc: "Disparado quando o item é colocado na sacola de compras.",
    icon: ShoppingCartIcon,
    colorClass: "bg-amber-50 text-amber-600 border-amber-200/80",
  },
  {
    name: "InitiateCheckout",
    label: "Início de Finalização",
    desc: "Disparado na abertura da tela de entrega e pagamento.",
    icon: CreditCardIcon,
    colorClass: "bg-purple-50 text-purple-600 border-purple-200/80",
  },
  {
    name: "Purchase",
    label: "Pedido Confirmado",
    desc: "Disparado no sucesso da compra, enviando o valor total do pedido.",
    icon: CheckCircle2Icon,
    colorClass: "bg-emerald-50 text-emerald-600 border-emerald-200/80",
  },
];

export default async function MarketingPage({ params }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    notFound();
  }

  const restaurantSlug = restaurant.slug;

  const settings = await db.query.marketingSettingsTable.findFirst({
    where: eq(marketingSettingsTable.restaurantId, restaurant.id),
  });

  async function save(formData: FormData) {
    "use server";
    return salvarMarketingSettingsAction(restaurantSlug, formData);
  }

  const isMetaActive = Boolean(settings?.metaPixelId);
  const isGoogleActive = Boolean(
    settings?.ga4MeasurementId || settings?.gtmContainerId,
  );
  const isCartActive = settings?.abandonedCartEnabled !== false;

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <BarChart2Icon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Marketing & Rastreamento
            </h1>
            <p className="text-sm text-slate-500">
              Configure pixels de rastreamento de anúncios (Meta, Google) e recuperação de carrinho via WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Injeção de Tags Ativa</span>
          </div>
        </div>
      </div>

      {/* ── Metric Cards (estilo tela de Usuários) ────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Meta Ads Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Meta Ads & Pixel
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <Share2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-blue-700">
              {isMetaActive ? "Configurado" : "Pendente"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {settings?.metaPixelId ? `ID: ${settings.metaPixelId}` : "Facebook & Instagram"}
            </p>
          </CardContent>
        </Card>

        {/* Google Analytics Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Google Analytics
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-emerald-700">
              {isGoogleActive ? "Configurado" : "Pendente"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {settings?.ga4MeasurementId ? `GA4: ${settings.ga4MeasurementId}` : "GA4 & GTM Web"}
            </p>
          </CardContent>
        </Card>

        {/* Carrinho Abandonado Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Carrinho Abandonado
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <ShoppingCartIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-amber-700">
              {isCartActive ? "Ativo" : "Inativo"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {isCartActive
                ? `Cupom com ${settings?.abandonedCartCouponPercent ?? 5}% OFF`
                : "Automação pausada"}
            </p>
          </CardContent>
        </Card>

        {/* Eventos Padrão Card */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
                Eventos Padrão
              </span>
              <div className="rounded-lg bg-purple-100 p-1.5 text-purple-700">
                <ActivityIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-purple-700">
              4 Eventos
            </p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Injetados automaticamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Grid ────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7">
          <MarketingSettingsForm settings={settings ?? null} saveAction={save} />
        </div>

        {/* Right Column: Informative cards (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Automatic Events Card */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-900 p-1.5 text-white">
                  <ZapIcon size={16} />
                </div>
                <div>
                  <CardTitle className="font-display text-base font-semibold text-slate-900">
                    Eventos Monitorados no Cardápio
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Ao preencher os IDs ao lado, estes eventos são registrados automaticamente.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3">
              {EVENTS.map((event) => {
                const Icon = event.icon;
                return (
                  <div
                    key={event.name}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className={cn("rounded-lg p-2 shrink-0 border", event.colorClass)}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {event.name}
                        </span>
                        <Badge variant="outline" className="border-slate-200 bg-white text-[10px] font-medium text-slate-600">
                          {event.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* How Abandoned Cart Recovery Works */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <HelpCircleIcon size={14} className="text-amber-500" />
                Como Funciona a Recuperação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600">
              <p>
                O sistema monitora os clientes que adicionaram produtos e iniciaram o checkout mas não finalizaram o pedido.
              </p>
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    1
                  </span>
                  <span>Cliente abandona o pedido no checkout</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    2
                  </span>
                  <span>Sistema aguarda o tempo de espera configurado</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    3
                  </span>
                  <span>WhatsApp IA envia mensagem amigável com cupom</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Nota: O disparo é realizado através do bot de WhatsApp IA cadastrado para o estabelecimento.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
