"use client";

import { MapPinIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConsumptionMethod } from "@/lib/db";

import type { FormSchema } from "../finish-order-schema";
import { SectionHeader } from "./section-header";

export interface SchedulingSlotGroup {
  label: string;
  date: string;
  items: Array<{ value: string; label: string }>;
}

interface FulfillmentSectionProps {
  form: UseFormReturn<FormSchema>;
  consumptionMethod: ConsumptionMethod;
  schedulingLabel: string;
  schedulingSlots: SchedulingSlotGroup[];
  fulfillmentTiming: "ASAP" | "SCHEDULED";
  isLoading: boolean;
}

export const FulfillmentSection = ({
  form,
  consumptionMethod,
  schedulingLabel,
  schedulingSlots,
  fulfillmentTiming,
  isLoading,
}: FulfillmentSectionProps) => (
  <section>
    <SectionHeader icon={<MapPinIcon size={16} />} title="Entrega / Retirada" />
    <div className="rounded-[24px] border bg-slate-50/50 p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Horário da {schedulingLabel}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Escolha se deseja receber o pedido o quanto antes ou em um horário agendado.
        </p>
      </div>

      <FormField
        control={form.control}
        name="fulfillmentTiming"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormControl>
              <div className="grid gap-2.5">
                {[
                  {
                    value: "ASAP" as const,
                    title: "O quanto antes",
                    description:
                      consumptionMethod === "DELIVERY"
                        ? "Preparo e despacho imediato."
                        : "Preparo imediato para retirada.",
                  },
                  {
                    value: "SCHEDULED" as const,
                    title: "Agendar horário",
                    description: "Escolha uma data e hora futura.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all ${
                      field.value === option.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-bold">{option.title}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {fulfillmentTiming === "SCHEDULED" && (
        <FormField
          control={form.control}
          name="scheduledFor"
          render={({ field }) => (
            <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1.5">
              <FormLabel className="text-xs font-bold uppercase text-slate-400">
                Data e hora
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Escolha um horário..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-xl">
                  {schedulingSlots.length > 0 ? (
                    schedulingSlots.map((group) => (
                      <SelectGroup key={group.date}>
                        <SelectLabel className="text-primary font-bold text-sm">
                          {group.label}
                        </SelectLabel>
                        {group.items.map((slot) => (
                          <SelectItem
                            key={slot.value}
                            value={slot.value}
                            className="rounded-lg text-sm"
                          >
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      {isLoading ? "Carregando horários..." : "Nenhum horário disponível."}
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      )}
    </div>
  </section>
);
