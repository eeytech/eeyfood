import { ClockIcon, Settings2Icon } from "lucide-react";
import { notFound } from "next/navigation";

import { updateOperatingHoursAction, updateRestaurantStatusAction } from "@/app/[slug]/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buscarConfiguracoesRestaurante } from "@/lib/admin-queries";

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
  const config = await buscarConfiguracoesRestaurante(slug);

  if (!config) {
    return notFound();
  }

  const { restaurant, operatingHours } = config;

  return (
    <main className="space-y-6">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Configurações</CardTitle>
          <CardDescription className="text-base">
            Gerencie o status de funcionamento e os horários de atendimento do
            seu restaurante.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Override */}
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Settings2Icon size={20} />
              Status Atual
            </CardTitle>
            <CardDescription>
              Altere o status real de funcionamento agora mesmo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={updateRestaurantStatusAction.bind(null, slug)}
              className="space-y-6"
            >
              <div className="grid gap-4">
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
                    className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition hover:bg-slate-50 ${
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
                      className="mt-1 h-4 w-4 accent-slate-950"
                    />
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.label}
                      </p>
                      <p className="text-sm text-slate-500">
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

        {/* Operating Hours */}
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClockIcon size={20} />
              Horário de Funcionamento
            </CardTitle>
            <CardDescription>
              Configure os horários padrão para cada dia da semana.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={updateOperatingHoursAction.bind(null, slug)}
              className="space-y-4"
            >
              <div className="space-y-3">
                {daysOfWeek.map((dayName, index) => {
                  const hours = operatingHours.find((h) => h.dayOfWeek === index);
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
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
                          className="font-medium text-slate-900"
                        >
                          {dayName}
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          name={`openTime-${index}`}
                          type="time"
                          defaultValue={hours?.openTime ?? "08:00"}
                          className="w-32"
                        />
                        <span className="text-slate-400">até</span>
                        <Input
                          name={`closeTime-${index}`}
                          type="time"
                          defaultValue={hours?.closeTime ?? "22:00"}
                          className="w-32"
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
      </div>
    </main>
  );
};

export default ConfiguracoesPage;
