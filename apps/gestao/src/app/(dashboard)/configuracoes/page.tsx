import { ClockIcon, Settings2Icon } from "lucide-react";
import { notFound } from "next/navigation";

import { updateOperatingHoursAction, updateRestaurantStatusAction } from "@/app/(dashboard)/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buscarAiSettingsPorSlug, buscarConfiguracoesRestaurante } from "@/lib/admin-queries";

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

  return (
    <main className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-xl">Configurações</CardTitle>
          <CardDescription className="text-sm">
            Gerencie o status de funcionamento e os horários de atendimento do
            seu restaurante.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="estabelecimento">
        <TabsList>
          <TabsTrigger value="estabelecimento">Estabelecimento</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="funcionamento">
            <Settings2Icon size={13} />
            Funcionamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estabelecimento" className="mt-4">
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

        <TabsContent value="modulos" className="mt-4">
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
            }}
          />
        </TabsContent>

        <TabsContent value="funcionamento" className="mt-4 space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2Icon size={16} />
                Status Atual
              </CardTitle>
              <CardDescription>
                Altere o status real de funcionamento agora mesmo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateRestaurantStatusAction.bind(null, slug)}
                className="space-y-4"
              >
                <div className="grid gap-3">
                  {[
                    {
                      value: "AUTO",
                      label: "Automático",
                      description: "Segue os horários configurados abaixo.",
                    },
                    {
                      value: "ALWAYS_OPEN",
                      label: "Sempre Aberto",
                      description: "Ignora os horários e mantém o app aberto.",
                    },
                    {
                      value: "ALWAYS_CLOSED",
                      label: "Sempre Fechado",
                      description: "Ignora os horários e mantém o app fechado.",
                    },
                  ].map((item) => (
                    <label
                      key={item.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:bg-slate-50 ${
                        restaurant.status === item.value
                          ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                          : "bg-white"
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
                        <p className="text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <SubmitButton className="w-full rounded-full">
                  Salvar Status
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon size={16} />
                Horário de Funcionamento
              </CardTitle>
              <CardDescription>
                Configure os horários padrão para cada dia da semana.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateOperatingHoursAction.bind(null, slug)}
                className="space-y-3"
              >
                <div className="space-y-2">
                  {daysOfWeek.map((dayName, index) => {
                    const hours = operatingHours.find((h) => h.dayOfWeek === index);
                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            name={`isOpen-${index}`}
                            id={`isOpen-${index}`}
                            defaultChecked={!!hours}
                            className="h-4 w-4 accent-slate-950"
                          />
                          <label
                            htmlFor={`isOpen-${index}`}
                            className="text-sm font-medium text-slate-900"
                          >
                            {dayName}
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            name={`openTime-${index}`}
                            type="time"
                            defaultValue={hours?.openTime ?? "08:00"}
                            className="w-28"
                          />
                          <span className="text-sm text-slate-400">até</span>
                          <Input
                            name={`closeTime-${index}`}
                            type="time"
                            defaultValue={hours?.closeTime ?? "22:00"}
                            className="w-28"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <SubmitButton className="w-full rounded-full">
                  Salvar Horários
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default ConfiguracoesPage;
