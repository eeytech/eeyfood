"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  Loader2Icon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

import { updateCustomerAddress } from "../../actions/update-customer-address";
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
  onSelectAddress?: (address: CustomerAddress) => void;
  onAddressUpdated?: (address: CustomerAddress) => void;
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
  onSelectAddress,
  onAddressUpdated,
}: FulfillmentSectionProps) => {
  const addressMode = form.watch("deliveryAddressMode");
  const selectedAddressId = form.watch("selectedAddressId");
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const cepAbortRef = useRef<AbortController | null>(null);

  const fetchCepData = async (digits: string) => {
    if (digits.length !== 8) return;

    if (cepAbortRef.current) {
      cepAbortRef.current.abort();
    }
    const controller = new AbortController();
    cepAbortRef.current = controller;

    setIsSearchingCep(true);
    let found = false;

    try {
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // 1. Tenta ViaCEP
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!data.erro && (data.logradouro || data.bairro || data.localidade)) {
          if (data.logradouro) form.setValue("street", data.logradouro, { shouldValidate: true });
          if (data.bairro) form.setValue("neighborhood", data.bairro, { shouldValidate: true });
          if (data.localidade) form.setValue("city", data.localidade);
          if (data.uf) form.setValue("state", data.uf);
          toast.success("Endereço localizado via CEP!");
          found = true;
        }
      } catch {
        // ViaCEP falhou ou deu timeout
      }

      if (!found && !controller.signal.aborted) {
        // 2. Fallback BrasilAPI
        try {
          const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.street) form.setValue("street", data.street, { shouldValidate: true });
            if (data.neighborhood) form.setValue("neighborhood", data.neighborhood, { shouldValidate: true });
            if (data.city) form.setValue("city", data.city);
            if (data.state) form.setValue("state", data.state);
            toast.success("Endereço localizado via CEP!");
            found = true;
          }
        } catch {
          // BrasilAPI falhou
        }
      }

      clearTimeout(timeoutId);

      if (!found && !controller.signal.aborted) {
        toast.info("CEP não localizado. Preencha a rua e o bairro manualmente.");
      }
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
    if (digits.length === 8 && !isSearchingCep) {
      void fetchCepData(digits);
    }
  };

  const handleStartEdit = (addr: CustomerAddress) => {
    setEditingAddress(addr);
    form.setValue("street", addr.street, { shouldValidate: true });
    form.setValue("number", addr.number, { shouldValidate: true });
    form.setValue("neighborhood", addr.neighborhood, { shouldValidate: true });
    form.setValue("complement", addr.complement || "");
    form.setValue("reference", addr.reference || "");
    form.setValue("city", addr.city || "");
    form.setValue("state", addr.state || "");
    form.setValue("deliveryAddressMode", "NEW");
    onSelectAddress?.(addr);
  };

  const handleSaveAddressEdit = async () => {
    if (!editingAddress) return;
    const street = form.getValues("street");
    const number = form.getValues("number");
    const neighborhood = form.getValues("neighborhood");
    const complement = form.getValues("complement");
    const reference = form.getValues("reference");
    const city = form.getValues("city");
    const state = form.getValues("state");

    if (!street?.trim() || !number?.trim() || !neighborhood?.trim()) {
      toast.error("Informe rua, número e bairro para salvar o endereço.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await updateCustomerAddress({
        id: editingAddress.id,
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        complement: complement?.trim() || undefined,
        reference: reference?.trim() || undefined,
        city: city?.trim() || undefined,
        state: state?.trim() || undefined,
      });

      if (updated) {
        toast.success("Endereço atualizado com sucesso!");
        onAddressUpdated?.(updated);
        form.setValue("deliveryAddressMode", "SAVED");
        form.setValue("selectedAddressId", updated.id);
        setEditingAddress(null);
        onSelectAddress?.(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar endereço.");
    } finally {
      setIsSavingEdit(false);
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
                      setEditingAddress(null);
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
                            <div
                              key={addr.id}
                              onClick={() => {
                                field.onChange(addr.id);
                                onSelectAddress?.(addr);
                              }}
                              className={`w-full flex items-start justify-between p-3 rounded-2xl border text-left cursor-pointer transition-all ${
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

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  title="Editar endereço"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(addr);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all shadow-xs"
                                >
                                  <PencilIcon size={12} />
                                </button>
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
                            </div>
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
                    {editingAddress
                      ? "Editar endereço cadastrado"
                      : customerAddresses.length > 0
                        ? "Cadastrar novo endereço"
                        : "Endereço de entrega"}
                  </FormLabel>
                  {customerAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(null);
                        form.setValue("deliveryAddressMode", "SAVED");
                        if (!selectedAddressId && customerAddresses[0]) {
                          form.setValue("selectedAddressId", customerAddresses[0].id);
                          onSelectAddress?.(customerAddresses[0]);
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
                              placeholder="Apto 12, Bloco B"
                              className="h-10 rounded-xl text-sm bg-white"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Ponto de Referência
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ex: Próximo à padaria central"
                            className="h-10 rounded-xl text-sm bg-white"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {editingAddress && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={handleSaveAddressEdit}
                        className="w-full h-10 rounded-xl bg-slate-900 text-white font-semibold text-xs gap-1.5 shadow-xs hover:bg-slate-800"
                      >
                        {isSavingEdit ? (
                          <>
                            <Loader2Icon size={14} className="animate-spin" />
                            <span>Salvando alterações...</span>
                          </>
                        ) : (
                          <>
                            <CheckIcon size={14} />
                            <span>Salvar alterações neste endereço</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {allowsScheduling && (
          <>
            <FormField
              control={form.control}
              name="fulfillmentTiming"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-bold uppercase text-slate-400">
                    Previsão para {schedulingLabel}
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange("ASAP");
                          form.setValue("scheduledFor", "");
                        }}
                        className={`h-11 rounded-2xl border text-sm font-semibold transition-all ${
                          field.value === "ASAP"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        O quanto antes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange("SCHEDULED");
                          if (
                            schedulingSlots.length > 0 &&
                            schedulingSlots[0]?.items?.[0] &&
                            !form.getValues("scheduledFor")
                          ) {
                            form.setValue(
                              "scheduledFor",
                              schedulingSlots[0].items[0].value,
                            );
                          }
                        }}
                        className={`h-11 rounded-2xl border text-sm font-semibold transition-all ${
                          field.value === "SCHEDULED"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Agendar
                      </button>
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
