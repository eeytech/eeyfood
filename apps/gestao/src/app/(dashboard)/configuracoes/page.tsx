import {
  CheckCircle2Icon,
  ClockIcon,
  PaletteIcon,
  PizzaIcon,
  Settings2Icon,
  ShoppingBagIcon,
  StoreIcon,
  ToggleRightIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buscarAiSettingsPorSlug,
  buscarConfiguracoesRestaurante,
} from "@/lib/admin-queries";

import { RestaurantDetailsForm } from "./restaurant-details-form";
import { RestaurantFeaturesForm } from "./restaurant-features-form";
import { RestaurantHoursSchedulingForm } from "./restaurant-hours-scheduling-form";
import { ThemeSettings } from "./theme-settings";

interface ConfiguracoesPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

const ConfiguracoesPage = async ({
  params,
  searchParams,
}: ConfiguracoesPageProps) => {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const defaultTab =
    resolvedSearchParams?.tab &&
    ["estabelecimento", "modulos", "funcionamento", "tema"].includes(
      resolvedSearchParams.tab,
    )
      ? resolvedSearchParams.tab
      : "estabelecimento";

  const [config, aiSettings] = await Promise.all([
    buscarConfiguracoesRestaurante(slug),
    buscarAiSettingsPorSlug(slug),
  ]);

  if (!config) {
    return notFound();
  }

  const { restaurant, operatingHours } = config;

  const activeDaysCount = operatingHours.length;
  const activeChannels = [
    restaurant.isDeliveryEnabled && "Delivery",
    restaurant.isTakeawayEnabled && "Retirada",
    restaurant.isDineInEnabled && "Mesa",
  ]
    .filter(Boolean)
    .join(", ");

  const statusLabel =
    restaurant.status === "ALWAYS_OPEN"
      ? "Sempre Aberto"
      : restaurant.status === "ALWAYS_CLOSED"
        ? "Sempre Fechado"
        : "Horário Automático";

  return (
    <main className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <StoreIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Configurações da Loja
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie perfil, canais de atendimento, regras de pedidos, horários, aparência e inteligência artificial.
            </p>
          </div>
        </div>
      </div>

      {/* ── Metric / Status Cards ──────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status Atual
              </span>
              <div
                className={`rounded-lg p-1.5 ${
                  restaurant.status === "ALWAYS_CLOSED"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-slate-900">
              {statusLabel}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {restaurant.status === "AUTO"
                ? "Conforme horários"
                : "Forçado manualmente"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Horários
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <ClockIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {activeDaysCount} <span className="text-base font-normal">dias</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Com expediente cadastrado
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Canais Ativos
              </span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <ShoppingBagIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-primary truncate">
              {activeChannels || "Nenhum"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Métodos de atendimento
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Regra de Pizza
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <PizzaIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-amber-700">
              {restaurant.pizzaPricingRule === "AVERAGE" ? "Média" : "Maior Valor"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Cobrança de 2 sabores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────── */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
          <TabsTrigger
            value="estabelecimento"
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <StoreIcon size={15} className="mr-1.5" />
            Estabelecimento
          </TabsTrigger>
          <TabsTrigger
            value="modulos"
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <ToggleRightIcon size={15} className="mr-1.5" />
            Módulos e Regras
          </TabsTrigger>
          <TabsTrigger
            value="funcionamento"
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <Settings2Icon size={15} className="mr-1.5" />
            Horários e Agendamento
          </TabsTrigger>
          <TabsTrigger
            value="tema"
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            <PaletteIcon size={15} className="mr-1.5" />
            Aparência e Tema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estabelecimento" className="mt-5">
          <RestaurantDetailsForm
            slug={slug}
            initialValues={{
              name: restaurant.name,
              description: restaurant.description,
              cnpj: restaurant.cnpj,
              phone: restaurant.phone,
              address: restaurant.address,
              avatarImageUrl: restaurant.avatarImageUrl,
              coverImageUrl: restaurant.coverImageUrl,
            }}
          />
        </TabsContent>

        <TabsContent value="modulos" className="mt-5">
          <RestaurantFeaturesForm
            slug={slug}
            initialValues={{
              acceptMercadoPago: restaurant.acceptMercadoPago,
              isCouponsEnabled: restaurant.isCouponsEnabled,
              isCashbackEnabled: restaurant.isCashbackEnabled,
              showOptionImages: restaurant.showOptionImages,
              isDeliveryEnabled: restaurant.isDeliveryEnabled,
              isTakeawayEnabled: restaurant.isTakeawayEnabled,
              isDineInEnabled: restaurant.isDineInEnabled,
              isBotActive: aiSettings?.isBotActive ?? false,
              isOrderSchedulingEnabled: restaurant.isOrderSchedulingEnabled,
              pizzaPricingRule: restaurant.pizzaPricingRule as "MAX" | "AVERAGE",
            }}
          />
        </TabsContent>

        <TabsContent value="funcionamento" className="mt-5">
          <RestaurantHoursSchedulingForm
            slug={slug}
            initialStatus={restaurant.status}
            initialHours={operatingHours}
            initialScheduling={{
              isOrderSchedulingEnabled: restaurant.isOrderSchedulingEnabled,
              schedulingMinAdvanceMinutes:
                restaurant.schedulingMinAdvanceMinutes,
              schedulingSlotIntervalMinutes:
                restaurant.schedulingSlotIntervalMinutes,
              schedulingMaxDays: restaurant.schedulingMaxDays,
              schedulingHoursMode: restaurant.schedulingHoursMode,
              schedulingCustomStartTime: restaurant.schedulingCustomStartTime,
              schedulingCustomEndTime: restaurant.schedulingCustomEndTime,
            }}
          />
        </TabsContent>

        <TabsContent value="tema" className="mt-5">
          <ThemeSettings />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default ConfiguracoesPage;
