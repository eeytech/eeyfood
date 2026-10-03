"use client";

import {
  ClockIcon,
  InfoIcon,
  Loader2Icon,
  SaveIcon,
  Settings2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOperatingHoursAndSchedulingAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { RestaurantStatus } from "@fsw/db";

const DAYS_OF_WEEK = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

interface OperatingHourItem {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

interface RestaurantHoursSchedulingFormProps {
  slug: string;
  initialStatus: RestaurantStatus;
  initialHours: OperatingHourItem[];
  initialScheduling: {
    isOrderSchedulingEnabled: boolean;
    schedulingMinAdvanceMinutes: number;
    schedulingSlotIntervalMinutes: number;
    schedulingMaxDays: number;
    schedulingHoursMode: string;
    schedulingCustomStartTime: string | null;
    schedulingCustomEndTime: string | null;
  };
}

export const RestaurantHoursSchedulingForm = ({
  slug,
  initialStatus,
  initialHours,
  initialScheduling,
}: RestaurantHoursSchedulingFormProps) => {
  // Status Operacional
  const [status, setStatus] = useState<RestaurantStatus>(initialStatus);

  // Horários de Atendimento Semanal
  const [hoursState, setHoursState] = useState(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((day) => {
      const match = initialHours.find((h) => h.dayOfWeek === day);
      return {
        day,
        isOpen: !!match,
        openTime: match?.openTime ?? "08:00",
        closeTime: match?.closeTime ?? "22:00",
      };
    });
  });

  // Agendamento de Pedidos
  const [isOrderSchedulingEnabled, setIsOrderSchedulingEnabled] = useState(
    initialScheduling.isOrderSchedulingEnabled,
  );
  const [minAdvanceMinutes, setMinAdvanceMinutes] = useState(
    String(initialScheduling.schedulingMinAdvanceMinutes || 45),
  );
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(
    String(initialScheduling.schedulingSlotIntervalMinutes || 30),
  );
  const [maxDays, setMaxDays] = useState(
    String(initialScheduling.schedulingMaxDays || 3),
  );
  const [hoursMode, setHoursMode] = useState(
    initialScheduling.schedulingHoursMode === "CUSTOM"
      ? "CUSTOM"
      : "OPERATING_HOURS",
  );
  const [customStartTime, setCustomStartTime] = useState(
    initialScheduling.schedulingCustomStartTime || "11:00",
  );
  const [customEndTime, setCustomEndTime] = useState(
    initialScheduling.schedulingCustomEndTime || "23:00",
  );

  const [isPending, startTransition] = useTransition();

  const handleToggleDay = (dayIndex: number, checked: boolean) => {
    setHoursState((prev) =>
      prev.map((item) =>
        item.day === dayIndex ? { ...item, isOpen: checked } : item,
      ),
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "openTime" | "closeTime",
    value: string,
  ) => {
    setHoursState((prev) =>
      prev.map((item) =>
        item.day === dayIndex ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("status", status);

    // Horários semanais
    hoursState.forEach((h) => {
      if (h.isOpen) {
        formData.append(`isOpen-${h.day}`, "on");
      }
      formData.append(`openTime-${h.day}`, h.openTime);
      formData.append(`closeTime-${h.day}`, h.closeTime);
    });

    // Agendamento
    if (isOrderSchedulingEnabled) {
      formData.append("isOrderSchedulingEnabled", "on");
    }
    formData.append("schedulingMinAdvanceMinutes", minAdvanceMinutes);
    formData.append("schedulingSlotIntervalMinutes", slotIntervalMinutes);
    formData.append("schedulingMaxDays", maxDays);
    formData.append("schedulingHoursMode", hoursMode);
    formData.append("schedulingCustomStartTime", customStartTime);
    formData.append("schedulingCustomEndTime", customEndTime);

    startTransition(async () => {
      try {
        await updateOperatingHoursAndSchedulingAction(slug, formData);
        toast.success("Horários e agendamentos atualizados com sucesso!");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Falha ao salvar horários e agendamentos.",
        );
      }
    });
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Settings2Icon size={18} />
          </div>
          Horários e Agendamento do Estabelecimento
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Gerencie o status operacional da loja, os horários de atendimento semanal e as regras de agendamento de pedidos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── 1. Status Real de Funcionamento ────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Status Operacional da Loja
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Abra ou feche a loja imediatamente, ou deixe no modo automático seguindo os horários cadastrados.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  value: "AUTO",
                  label: "Automático (Horários)",
                  badge: "Recomendado",
                  badgeColor: "bg-emerald-100 text-emerald-700",
                  description:
                    "Abre e fecha automaticamente conforme os horários abaixo.",
                },
                {
                  value: "ALWAYS_OPEN",
                  label: "Forçar Aberto",
                  badge: "Manual",
                  badgeColor: "bg-primary/10 text-primary",
                  description:
                    "Ignora os horários e mantém a loja e cardápio sempre abertos.",
                },
                {
                  value: "ALWAYS_CLOSED",
                  label: "Forçar Fechado",
                  badge: "Manual",
                  badgeColor: "bg-rose-100 text-rose-700",
                  description:
                    "Fecha imediatamente a loja, impedindo novos pedidos online.",
                },
              ].map((item) => (
                <label
                  key={item.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                    status === item.value
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary shadow-xs"
                      : "border-slate-200/80 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="statusOption"
                    value={item.value}
                    checked={status === item.value}
                    onChange={() => setStatus(item.value as RestaurantStatus)}
                    className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-950">
                        {item.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── 2. Horário de Atendimento Semanal ─────────────────────── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Horário de Atendimento Semanal
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Defina o expediente padrão para cada dia da semana. Dias desmarcados serão considerados fechados.
            </p>

            <div className="space-y-2.5">
              {DAYS_OF_WEEK.map((dayName, index) => {
                const current = hoursState.find((h) => h.day === index);
                const isOpen = current?.isOpen ?? false;

                return (
                  <div
                    key={index}
                    className={`flex flex-col gap-3 rounded-xl border p-3.5 transition sm:flex-row sm:items-center sm:justify-between ${
                      isOpen
                        ? "border-slate-200/80 bg-white shadow-2xs hover:border-slate-300"
                        : "border-slate-200/60 bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        id={`day-switch-${index}`}
                        checked={isOpen}
                        onCheckedChange={(checked) => handleToggleDay(index, checked)}
                        disabled={isPending}
                      />
                      <Label
                        htmlFor={`day-switch-${index}`}
                        className="text-sm font-semibold text-slate-950 cursor-pointer"
                      >
                        {dayName}
                      </Label>
                      {!isOpen && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          Fechado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Input
                        type="time"
                        value={current?.openTime ?? "08:00"}
                        onChange={(e) =>
                          handleTimeChange(index, "openTime", e.target.value)
                        }
                        disabled={!isOpen || isPending}
                        className="h-9 w-28 rounded-lg border-slate-200 bg-white text-xs text-slate-900 disabled:opacity-40"
                      />
                      <span className="text-xs font-medium text-slate-400">
                        até
                      </span>
                      <Input
                        type="time"
                        value={current?.closeTime ?? "22:00"}
                        onChange={(e) =>
                          handleTimeChange(index, "closeTime", e.target.value)
                        }
                        disabled={!isOpen || isPending}
                        className="h-9 w-28 rounded-lg border-slate-200 bg-white text-xs text-slate-900 disabled:opacity-40"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3. Agendamento de Pedidos ─────────────────────────────── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Agendamento de Pedidos
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Configure a antecedência mínima, os intervalos de horários e regras para agendamento (Delivery e Retirada).
            </p>

            {/* Switch Principal */}
            <div
              className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:border-slate-300 ${
                isOrderSchedulingEnabled
                  ? "border-primary/40 bg-primary/[0.02]"
                  : "opacity-80"
              }`}
            >
              <div className="space-y-0.5">
                <Label
                  htmlFor="isOrderSchedulingEnabled"
                  className="cursor-pointer font-semibold text-slate-950 text-sm"
                >
                  Ativar Agendamento de Pedidos
                </Label>
                <p className="text-xs text-slate-500">
                  Permite que os clientes agendem um horário futuro para entrega ou retirada no App de Vendas.
                </p>
              </div>
              <Switch
                id="isOrderSchedulingEnabled"
                checked={isOrderSchedulingEnabled}
                onCheckedChange={setIsOrderSchedulingEnabled}
                disabled={isPending}
              />
            </div>

            {!isOrderSchedulingEnabled && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-800">
                <InfoIcon size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p>
                  Com o agendamento desativado, o app de Vendas não exibirá opções de horário futuro, enviando todos os pedidos para preparo imediato.
                </p>
              </div>
            )}

            {isOrderSchedulingEnabled && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Parâmetros em 3 colunas */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                    <Label className="text-xs font-semibold text-slate-950">
                      Antecedência Mínima
                    </Label>
                    <Select
                      value={minAdvanceMinutes}
                      onValueChange={setMinAdvanceMinutes}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos (recomendado)</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1 hora e 30 min</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                        <SelectItem value="180">3 horas</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-500">
                      Tempo mínimo de preparo entre o envio e o horário agendado.
                    </p>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                    <Label className="text-xs font-semibold text-slate-950">
                      Intervalo dos Horários
                    </Label>
                    <Select
                      value={slotIntervalMinutes}
                      onValueChange={setSlotIntervalMinutes}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 em 15 minutos</SelectItem>
                        <SelectItem value="30">30 em 30 minutos (padrão)</SelectItem>
                        <SelectItem value="45">45 em 45 minutos</SelectItem>
                        <SelectItem value="60">1 em 1 hora</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-500">
                      Espaçamento entre as opções (ex: 12:00, 12:30).
                    </p>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                    <Label className="text-xs font-semibold text-slate-950">
                      Dias Disponíveis
                    </Label>
                    <Select
                      value={maxDays}
                      onValueChange={setMaxDays}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Apenas Hoje (1 dia)</SelectItem>
                        <SelectItem value="2">Hoje e Amanhã (2 dias)</SelectItem>
                        <SelectItem value="3">Hoje e mais 2 dias (3 dias)</SelectItem>
                        <SelectItem value="5">Até 5 dias à frente</SelectItem>
                        <SelectItem value="7">Até 7 dias (1 semana)</SelectItem>
                        <SelectItem value="14">Até 14 dias (2 semanas)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-500">
                      Quantos dias futuros o cliente poderá escolher para agendar.
                    </p>
                  </div>
                </div>

                {/* Regra de Horários para Agendamento */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Regra de Horários para Agendamento
                  </p>
                  <p className="text-xs text-slate-500">
                    Escolha se os horários permitidos devem seguir os horários de funcionamento semanais ou uma faixa personalizada.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                        hoursMode === "OPERATING_HOURS"
                          ? "border-primary bg-primary/[0.04] ring-1 ring-primary shadow-xs"
                          : "border-slate-200/80 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="hoursModeRadio"
                        value="OPERATING_HOURS"
                        checked={hoursMode === "OPERATING_HOURS"}
                        onChange={() => setHoursMode("OPERATING_HOURS")}
                        className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-950 text-sm">
                            Horário de Funcionamento
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Padrão
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Gera horários baseados no expediente de cada dia da semana. Dias fechados não terão opções.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                        hoursMode === "CUSTOM"
                          ? "border-primary bg-primary/[0.04] ring-1 ring-primary shadow-xs"
                          : "border-slate-200/80 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="hoursModeRadio"
                        value="CUSTOM"
                        checked={hoursMode === "CUSTOM"}
                        onChange={() => setHoursMode("CUSTOM")}
                        className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-950 text-sm">
                            Horário Fixo Específico
                          </span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Personalizado
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Sobrepõe o horário semanal com uma faixa de agendamento exclusiva.
                        </p>
                      </div>
                    </label>
                  </div>

                  {hoursMode === "CUSTOM" && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150">
                      <ClockIcon size={16} className="text-primary shrink-0" />
                      <span className="text-xs font-semibold text-slate-700">
                        Permitir agendamentos das:
                      </span>
                      <Input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        disabled={isPending}
                        className="w-28 h-9 text-xs rounded-lg border-slate-200"
                      />
                      <span className="text-xs font-medium text-slate-400">até</span>
                      <Input
                        type="time"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        disabled={isPending}
                        className="w-28 h-9 text-xs rounded-lg border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Botão Único no Final da Aba ───────────────────────────── */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Status operacional, horários de atendimento e regras de agendamento são aplicados em tempo real no app.
            </p>
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2Icon size={15} className="animate-spin" />
                  <span>Salvando alterações...</span>
                </>
              ) : (
                <>
                  <SaveIcon size={15} />
                  <span>Salvar Horários e Agendamentos</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
