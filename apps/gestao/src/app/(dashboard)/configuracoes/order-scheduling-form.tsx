"use client";

import { CalendarClockIcon, ClockIcon, InfoIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOrderSchedulingAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
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

interface OrderSchedulingFormProps {
  slug: string;
  initialValues: {
    isOrderSchedulingEnabled: boolean;
    schedulingMinAdvanceMinutes: number;
    schedulingSlotIntervalMinutes: number;
    schedulingMaxDays: number;
    schedulingHoursMode: string;
    schedulingCustomStartTime: string | null;
    schedulingCustomEndTime: string | null;
  };
}

export const OrderSchedulingForm = ({
  slug,
  initialValues,
}: OrderSchedulingFormProps) => {
  const [isOrderSchedulingEnabled, setIsOrderSchedulingEnabled] = useState(
    initialValues.isOrderSchedulingEnabled,
  );
  const [minAdvanceMinutes, setMinAdvanceMinutes] = useState(
    String(initialValues.schedulingMinAdvanceMinutes || 45),
  );
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(
    String(initialValues.schedulingSlotIntervalMinutes || 30),
  );
  const [maxDays, setMaxDays] = useState(
    String(initialValues.schedulingMaxDays || 3),
  );
  const [hoursMode, setHoursMode] = useState(
    initialValues.schedulingHoursMode === "CUSTOM" ? "CUSTOM" : "OPERATING_HOURS",
  );
  const [customStartTime, setCustomStartTime] = useState(
    initialValues.schedulingCustomStartTime || "11:00",
  );
  const [customEndTime, setCustomEndTime] = useState(
    initialValues.schedulingCustomEndTime || "23:00",
  );

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
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
        await updateOrderSchedulingAction(slug, formData);
        toast.success("Configurações de agendamento salvas com sucesso!");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Falha ao salvar configurações de agendamento.",
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Switch Principal: Ativar/Desativar Agendamento */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:bg-slate-50 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <CalendarClockIcon size={20} />
          </div>
          <div>
            <Label
              htmlFor="isOrderSchedulingEnabled"
              className="text-sm font-semibold text-slate-900 cursor-pointer"
            >
              Ativar Agendamento de Pedidos
            </Label>
            <p className="text-xs text-slate-500">
              Permite que os clientes agendem um horário futuro para entrega ou retirada no App de Vendas.
            </p>
          </div>
        </div>
        <Switch
          id="isOrderSchedulingEnabled"
          checked={isOrderSchedulingEnabled}
          onCheckedChange={setIsOrderSchedulingEnabled}
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
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Parâmetros de Tempo e Intervalo */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Antecedência Mínima */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Antecedência Mínima
              </Label>
              <Select value={minAdvanceMinutes} onValueChange={setMinAdvanceMinutes}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
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

            {/* Intervalo dos Slots */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Intervalo dos Horários
              </Label>
              <Select value={slotIntervalMinutes} onValueChange={setSlotIntervalMinutes}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
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
                Espaçamento entre as opções de horários (ex: 12:00, 12:30).
              </p>
            </div>

            {/* Janela de Dias */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Dias Disponíveis
              </Label>
              <Select value={maxDays} onValueChange={setMaxDays}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
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

          {/* Origem dos Horários */}
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Regra de Horários para Agendamento
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha se os horários permitidos devem seguir os horários de funcionamento semanais ou uma faixa personalizada.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Opção 1: Horário de Funcionamento */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                  hoursMode === "OPERATING_HOURS"
                    ? "border-slate-950 bg-white ring-1 ring-slate-950 shadow-2xs"
                    : "border-slate-200 bg-white/70 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="hoursModeRadio"
                  value="OPERATING_HOURS"
                  checked={hoursMode === "OPERATING_HOURS"}
                  onChange={() => setHoursMode("OPERATING_HOURS")}
                  className="mt-0.5 h-4 w-4 accent-slate-950"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Horário de Funcionamento
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gera horários baseados no horário cadastrado para cada dia da semana. Dias fechados não terão opções.
                  </p>
                </div>
              </label>

              {/* Opção 2: Horário Específico (Sobreposição) */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                  hoursMode === "CUSTOM"
                    ? "border-slate-950 bg-white ring-1 ring-slate-950 shadow-2xs"
                    : "border-slate-200 bg-white/70 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="hoursModeRadio"
                  value="CUSTOM"
                  checked={hoursMode === "CUSTOM"}
                  onChange={() => setHoursMode("CUSTOM")}
                  className="mt-0.5 h-4 w-4 accent-slate-950"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Horário Fixo Específico (Sobreposição)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sobrepõe o horário semanal com uma faixa de agendamento exclusiva.
                  </p>
                </div>
              </label>
            </div>

            {/* Seletor de Horário Customizado se CUSTOM estiver selecionado */}
            {hoursMode === "CUSTOM" && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <ClockIcon size={16} className="text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700">
                  Permitir agendamentos das:
                </span>
                <Input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="w-28 h-9 text-xs rounded-lg border-slate-200"
                />
                <span className="text-xs text-slate-400">até</span>
                <Input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="w-28 h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          As regras de agendamento serão aplicadas no checkout dos clientes.
        </p>
        <Button
          type="submit"
          disabled={isPending}
          className="h-10 gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2Icon size={15} className="animate-spin" />
              <span>Salvando alterações...</span>
            </>
          ) : (
            <>
              <SaveIcon size={15} />
              <span>Salvar Configurações de Agendamento</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
