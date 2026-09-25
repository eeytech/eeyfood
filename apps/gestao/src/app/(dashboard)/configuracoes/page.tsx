import {
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  PizzaIcon,
  Settings2Icon,
  ShoppingBagIcon,
  StoreIcon,
  ToggleRightIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  updateOperatingHoursAction,
  updateRestaurantStatusAction,
} from "@/app/(dashboard)/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buscarAiSettingsPorSlug,
  buscarConfiguracoesRestaurante,
} from "@/lib/admin-queries";

import { OrderSchedulingForm } from "./order-scheduling-form";
import { RestaurantDetailsForm } from "./restaurant-details-form";
import { RestaurantFeaturesForm } from "./restaurant-features-form";

interface ConfiguracoesPageProps {
  params: Promise<{ slug: string }>;
}

const daysOfWeek = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const ConfiguracoesPage = async ({ params }: ConfiguracoesPageProps) => {
  const { slug } = await params;
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <StoreIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Configurações da Loja
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie perfil, canais de atendimento, regras de pedidos, horários e inteligência artificial.
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
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <ClockIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
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
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <ShoppingBagIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-indigo-700 truncate">
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
      <Tabs defaultValue="estabelecimento">
        <TabsList className="h-11 rounded-2xl border border-slate-200/80 bg-slate-100 p-1">
          <TabsTrigger
            value="estabelecimento"
            className="rounded-xl px-4 py-1.5 font-medium text-slate-600 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
          >
            <StoreIcon size={15} className="mr-1.5" />
            Estabelecimento
          </TabsTrigger>
          <TabsTrigger
            value="modulos"
            className="rounded-xl px-4 py-1.5 font-medium text-slate-600 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
          >
            <ToggleRightIcon size={15} className="mr-1.5" />
            Módulos & Regras
          </TabsTrigger>
          <TabsTrigger
            value="funcionamento"
            className="rounded-xl px-4 py-1.5 font-medium text-slate-600 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
          >
            <Settings2Icon size={15} className="mr-1.5" />
            Horários & Agendamento
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

        <TabsContent value="funcionamento" className="mt-5 space-y-5">
          {/* Status Real de Funcionamento */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Settings2Icon size={18} />
                </div>
                Status Operacional da Loja
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Abra ou feche a loja imediatamente, ou deixe no modo automático seguindo os horários cadastrados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateRestaurantStatusAction.bind(null, slug)}
                className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      value: "AUTO",
                      label: "Automático (Horários)",
                      description: "Abre e fecha automaticamente conforme os horários abaixo.",
                    },
                    {
                      value: "ALWAYS_OPEN",
                      label: "Forçar Aberto",
                      description: "Ignora os horários e mantém a loja e cardápio sempre abertos.",
                    },
                    {
                      value: "ALWAYS_CLOSED",
                      label: "Forçar Fechado",
                      description: "Fecha imediatamente a loja, impedindo novos pedidos online.",
                    },
                  ].map((item) => (
                    <label
                      key={item.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                        restaurant.status === item.value
                          ? "border-slate-950 bg-slate-50/80 ring-1 ring-slate-950 shadow-2xs"
                          : "border-slate-200/80 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={item.value}
                        defaultChecked={restaurant.status === item.value}
                        className="mt-0.5 h-4 w-4 accent-slate-950"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="pt-2">
                  <SubmitButton className="h-10 w-full rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                    Salvar Status Operacional
                  </SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Horário de Funcionamento Semanal */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <ClockIcon size={18} />
                </div>
                Horário de Atendimento Semanal
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Defina o expediente padrão para cada dia da semana. Dias desmarcados serão considerados fechados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateOperatingHoursAction.bind(null, slug)}
                className="space-y-4"
              >
                <div className="space-y-2.5">
                  {daysOfWeek.map((dayName, index) => {
                    const hours = operatingHours.find((h) => h.dayOfWeek === index);
                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            name={`isOpen-${index}`}
                            id={`isOpen-${index}`}
                            defaultChecked={!!hours}
                            className="h-4 w-4 accent-slate-950 rounded cursor-pointer"
                          />
                          <label
                            htmlFor={`isOpen-${index}`}
                            className="text-sm font-semibold text-slate-900 cursor-pointer"
                          >
                            {dayName}
                          </label>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <Input
                            name={`openTime-${index}`}
                            type="time"
                            defaultValue={hours?.openTime ?? "08:00"}
                            className="h-9 w-28 rounded-lg border-slate-200 bg-white text-xs text-slate-900"
                          />
                          <span className="text-xs font-medium text-slate-400">até</span>
                          <Input
                            name={`closeTime-${index}`}
                            type="time"
                            defaultValue={hours?.closeTime ?? "22:00"}
                            className="h-9 w-28 rounded-lg border-slate-200 bg-white text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <SubmitButton className="h-10 w-full rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                    Salvar Horários de Atendimento
                  </SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Agendamento de Pedidos */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <CalendarClockIcon size={18} />
                </div>
                Agendamento de Pedidos
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Configure a antecedência, intervalos dos horários e regras para agendamento (Delivery e Retirada).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderSchedulingForm
                slug={slug}
                initialValues={{
                  isOrderSchedulingEnabled: restaurant.isOrderSchedulingEnabled,
                  schedulingMinAdvanceMinutes: restaurant.schedulingMinAdvanceMinutes,
                  schedulingSlotIntervalMinutes: restaurant.schedulingSlotIntervalMinutes,
                  schedulingMaxDays: restaurant.schedulingMaxDays,
                  schedulingHoursMode: restaurant.schedulingHoursMode,
                  schedulingCustomStartTime: restaurant.schedulingCustomStartTime,
                  schedulingCustomEndTime: restaurant.schedulingCustomEndTime,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default ConfiguracoesPage;
