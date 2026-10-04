"use client";

import { CheckIcon, CopyIcon, CreditCardIcon, HandCoinsIcon, QrCodeIcon, ZapIcon } from "lucide-react";
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
    value: "PIX",
    titulo: "Pix",
    descricao: "Transferência instantânea via chave Pix.",
    icon: <QrCodeIcon size={20} className="text-teal-600" />,
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
  onlinePaymentGateway?: "MERCADO_PAGO" | "INFINITEPAY" | "DISABLED" | string;
  acceptPix?: boolean;
  pixKey?: string | null;
  pixMode?: "QRCODE" | "MANUAL" | string;
  isOrderFree?: boolean;
}

export const PaymentSection = ({
  form,
  needsChangeField,
  isActionDisabled,
  acceptMercadoPago,
  onlinePaymentGateway = "MERCADO_PAGO",
  acceptPix = true,
  pixKey,
  pixMode = "QRCODE",
  isOrderFree,
}: PaymentSectionProps) => {
  const [copiedKey, setCopiedKey] = useState(false);

  const isOnlinePaymentAllowed =
    acceptMercadoPago && onlinePaymentGateway !== "DISABLED";

  const visibleOptions = paymentOptions
    .filter((option) => {
      if (option.value === "MERCADO_PAGO" && !isOnlinePaymentAllowed) return false;
      if (option.value === "PIX" && !acceptPix) return false;
      return true;
    })
    .map((option) => {
      if (option.value === "MERCADO_PAGO") {
        if (onlinePaymentGateway === "INFINITEPAY") {
          return {
            value: "INFINITEPAY" as PaymentMethod,
            titulo: "InfinitePay (Online)",
            descricao: "Cartão de crédito ou Pix com menores taxas.",
            icon: <ZapIcon size={20} className="text-emerald-600 fill-emerald-600" />,
          };
        }
        return {
          ...option,
          titulo: "Mercado Pago (Online)",
          descricao: "Pagamento online seguro via Mercado Pago.",
        };
      }
      if (option.value === "PIX") {
        return {
          ...option,
          titulo: pixMode === "MANUAL" ? "Pix (Chave)" : "Pix (QR Code)",
          descricao:
            pixMode === "MANUAL"
              ? "Transferência direta via chave Pix."
              : "QR Code e Copia e Cola com valor exato.",
        };
      }
      return option;
    });

  const handleCopyPixKey = () => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    toast.success("Chave Pix copiada para a área de transferência!");
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
  <section aria-label="Pagamento">
    <SectionHeader icon={<HandCoinsIcon size={16} />} title="Pagamento" />
    {isOrderFree && (
      <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
          ✓
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-900">
            Pedido 100% coberto por benefícios/desconto
          </p>
          <p className="text-[11px] text-emerald-700">
            Nenhum pagamento adicional é necessário. Clique em confirmar para concluir.
          </p>
        </div>
      </div>
    )}
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

      {form.watch("paymentMethod") === "PIX" && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
            <QrCodeIcon size={16} className="text-teal-700" />
            <span>
              {pixMode === "MANUAL" ? "Pagamento via Chave Pix (Manual)" : "Pagamento via Pix (QR Code Dinâmico)"}
            </span>
          </div>

          {pixMode === "QRCODE" ? (
            pixKey ? (
              <p className="text-xs text-teal-800 leading-relaxed">
                Ao clicar em confirmar o pedido, o <strong>QR Code</strong> e o código <strong>Pix Copia e Cola</strong> serão gerados na tela com o valor exato para você escanear ou pagar direto no app do seu banco.
              </p>
            ) : (
              <p className="text-xs text-teal-800 leading-relaxed">
                O pagamento via Pix será realizado na entrega ou no balcão diretamente ao atendente/entregador.
              </p>
            )
          ) : pixKey ? (
            <div className="space-y-2">
              <p className="text-xs text-teal-800 leading-relaxed">
                Você pode copiar a chave Pix do restaurante agora ou após a confirmação do pedido:
              </p>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-teal-200/80 p-2.5 shadow-2xs">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Chave Pix</p>
                  <p className="text-xs font-mono font-bold text-slate-900 truncate select-all">
                    {pixKey}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPixKey}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 active:scale-95 transition"
                >
                  {copiedKey ? (
                    <>
                      <CheckIcon size={13} />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={13} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-teal-700">
                Após transferir, guarde o comprovante. O restaurante confirmará o recebimento ao preparar seu pedido.
              </p>
            </div>
          ) : (
            <p className="text-xs text-teal-800 leading-relaxed">
              O pagamento via Pix será realizado na entrega ou no balcão diretamente ao atendente/entregador.
            </p>
          )}
        </div>
      )}
    </div>
  </section>
  );
};
