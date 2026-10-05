"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  Loader2Icon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConsumptionMethod, CustomerAddress } from "@/lib/db";

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
  customerAddresses?: CustomerAddress[];
  isLoadingAddresses?: boolean;
  allowsScheduling?: boolean;
}

export const FulfillmentSection = ({
  form,
  consumptionMethod,
  schedulingLabel,
  schedulingSlots,
  fulfillmentTiming,
  isLoading,
  customerAddresses = [],
  isLoadingAddresses = false,
  allowsScheduling = true,
}: FulfillmentSectionProps) => {
  const addressMode = form.watch("deliveryAddressMode");
  const selectedAddressId = form.watch("selectedAddressId");
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const fetchCepData = async (digits: string) => {
    if (digits.length !== 8) return;

    setIsSearchingCep(true);
    try {
      // 1. Tenta ViaCEP
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro && (data.logradouro || data.bairro || data.localidade)) {
        if (data.logradouro) {
          form.setValue("street", data.logradouro, { shouldValidate: true });
        }
        if (data.bairro) {
          form.setValue("neighborhood", data.bairro, { shouldValidate: true });
        }
        if (data.localidade) {
          form.setValue("city", data.localidade);
        }
        if (data.uf) {
          form.setValue("state", data.uf);
        }
        toast.success("Endereço localizado via CEP!");
        return;
      }
    } catch {
      // Falha do ViaCEP, tenta fallback
    }

    try {
      // 2. Fallback BrasilAPI
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
      if (res.ok) {
        const data = await res.json();
        if (data.street) {
          form.setValue("street", data.street, { shouldValidate: true });
        }
        if (data.neighborhood) {
          form.setValue("neighborhood", data.neighborhood, { shouldValidate: true });
        }
        if (data.city) {
          form.setValue("city", data.city);
        }
        if (data.state) {
          form.setValue("state", data.state);
        }
        toast.success("Endereço localizado via CEP!");
        return;
      }
      toast.info("CEP não localizado. Preencha a rua e o bairro manualmente.");
    } catch {
      // Falha silenciosa
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    form.setValue("cep", masked, { shouldValidate: true });
    if (digits.length === 8) {
      void fetchCepData(digits);
    }
  };

  const handleCepBlur = () => {
    const cepVal = form.getValues("cep") || "";
    const digits = cepVal.replace(/\D/g, "");
    if (digits.length === 8) {
      void fetchCepData(digits);
    }
  };

  return (
    <section>
      <SectionHeader
        icon={<MapPinIcon size={16} />}
        title={
          allowsScheduling
            ? "Entrega / Retirada"
            : consumptionMethod === "DELIVERY"
              ? "Endereço de Entrega"
              : "Retirada no Balcão"
        }
      />
      <div className="rounded-[24px] border bg-slate-50/50 p-4 space-y-4">
        {consumptionMethod === "DELIVERY" && (
          <div className="space-y-3">
            {isLoadingAddresses ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-white rounded-2xl border border-slate-100">
                <Loader2Icon size={14} className="animate-spin text-primary" />
                <span>Buscando seus endereços cadastrados...</span>
              </div>
            ) : customerAddresses.length > 0 && addressMode === "SAVED" ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-bold uppercase text-slate-400">
                    Endereço de entrega
                  </FormLabel>
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("deliveryAddressMode", "NEW");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <PlusIcon size={13} />
                    <span>Novo endereço</span>
                  </button>
                </div>

                <FormField
                  control={form.control}
                  name="selectedAddressId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="space-y-2">
                        {customerAddresses.map((addr, idx) => {
                          const isSelected = field.value === addr.id;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => field.onChange(addr.id)}
                              className={`w-full flex items-start justify-between p-3 rounded-2xl border text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                                  : "border-slate-200 bg-white hover:bg-slate-50/80"
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 pr-2">
                                <div
                                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                    isSelected
                                      ? "bg-primary text-white"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <MapPinIcon size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {addr.street}, {addr.number}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {addr.neighborhood}
                                    {addr.complement ? ` • ${addr.complement}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {idx === 0 && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    Último
                                  </span>
                                )}
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <CheckIcon size={12} strokeWidth={3} />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-bold uppercase text-slate-400">
                    {customerAddresses.length > 0
                      ? "Cadastrar novo endereço"
                      : "Endereço de entrega"}
                  </FormLabel>
                  {customerAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue("deliveryAddressMode", "SAVED");
                        if (!selectedAddressId && customerAddresses[0]) {
                          form.setValue("selectedAddressId", customerAddresses[0].id);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
                    >
                      <ArrowLeftIcon size={13} />
                      <span>Ver endereços salvos</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {/* Campo de CEP (Opcional) com busca automática */}
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-medium text-slate-700">
                            CEP <span className="font-normal text-slate-400">(Opcional)</span>
                          </FormLabel>
                          {isSearchingCep && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                              <Loader2Icon size={12} className="animate-spin" />
                              <span>Localizando endereço...</span>
                            </span>
                          )}
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="00000-000"
                              maxLength={9}
                              onChange={(e) => handleCepChange(e.target.value)}
                              onBlur={handleCepBlur}
                              className="h-10 rounded-xl bg-white pr-9 text-sm"
                            />
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              {isSearchingCep ? (
                                <Loader2Icon size={14} className="animate-spin text-primary" />
                              ) : (
                                <SearchIcon size={14} />
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-12 gap-2">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem className="col-span-8 space-y-1">
                          <FormLabel className="text-xs font-medium text-slate-700">
                            Rua / Avenida *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: Av. Paulista"
                              className="h-10 rounded-xl text-sm bg-white"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem className="col-span-4 space-y-1">
                          <FormLabel className="text-xs font-medium text-slate-700">
                            Número *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="123 / SN"
                              className="h-10 rounded-xl text-sm bg-white"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem className="col-span-6 space-y-1">
                          <FormLabel className="text-xs font-medium text-slate-700">
                            Bairro *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: Centro"
                              className="h-10 rounded-xl text-sm bg-white"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="complement"
                      render={({ field }) => (
                        <FormItem className="col-span-6 space-y-1">
                          <FormLabel className="text-xs font-medium text-slate-700">
                            Complemento
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Apto, Bloco, etc."
                              className="h-10 rounded-xl text-sm bg-white"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {allowsScheduling && (
          <>
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
          </>
        )}
      </div>
    </section>
  );
};
