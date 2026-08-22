"use client";

import { CreditCardIcon, HandCoinsIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PaymentMethod } from "@/lib/db";

import type { FormSchema } from "../finish-order-schema";
import { SectionHeader } from "./section-header";

const paymentOptions: Array<{
  value: PaymentMethod;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
}> = [
  {
    value: "MERCADO_PAGO",
    titulo: "Mercado Pago",
    descricao: "Pagamento online seguro e rápido.",
    icon: <CreditCardIcon size={20} className="text-blue-600" />,
  },
  {
    value: "DINHEIRO",
    titulo: "Dinheiro",
    descricao: "Pagamento presencial com troco opcional.",
    icon: <HandCoinsIcon size={20} className="text-emerald-600" />,
  },
  {
    value: "CARTAO_PRESENCIAL",
    titulo: "Cartão (Presencial)",
    descricao: "Maquininha no balcão ou entrega.",
    icon: <CreditCardIcon size={20} className="text-slate-600" />,
  },
];

interface PaymentSectionProps {
  form: UseFormReturn<FormSchema>;
  needsChangeField: boolean;
  isActionDisabled: boolean;
  acceptMercadoPago: boolean;
}

export const PaymentSection = ({
  form,
  needsChangeField,
  isActionDisabled,
  acceptMercadoPago,
}: PaymentSectionProps) => {
  const visibleOptions = acceptMercadoPago
    ? paymentOptions
    : paymentOptions.filter((o) => o.value !== "MERCADO_PAGO");

  return (
  <section aria-label="Pagamento">
    <SectionHeader icon={<HandCoinsIcon size={16} />} title="Pagamento" />
    <div
      className={`space-y-3 transition-opacity duration-200 ${
        isActionDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem className="space-y-2.5">
            <FormControl>
              <div
                className={`grid gap-2.5 ${isActionDisabled ? "pointer-events-none" : ""}`}
                aria-disabled={isActionDisabled}
              >
                {visibleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isActionDisabled}
                    onClick={() => field.onChange(option.value)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                      field.value === option.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background hover:bg-slate-50"
                    } disabled:cursor-not-allowed`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{option.titulo}</p>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {option.descricao}
                      </p>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        field.value === option.value ? "border-primary" : "border-slate-300"
                      }`}
                    >
                      {field.value === option.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />

      {needsChangeField && (
        <FormField
          control={form.control}
          name="changeFor"
          render={({ field }) => (
            <FormItem className="animate-in fade-in slide-in-from-top-2 space-y-1">
              <FormLabel className="text-sm">Troco para quanto?</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex.: 50,00"
                  inputMode="decimal"
                  className="rounded-xl h-9 text-base"
                  disabled={isActionDisabled}
                  aria-disabled={isActionDisabled}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      )}
    </div>
  </section>
  );
};
