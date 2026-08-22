"use client";

import { Loader2Icon, TicketPercentIcon, WalletCardsIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/helpers/format-currency";
import type { PedidoBeneficiosValidado } from "@/lib/db";

import type { FormSchema } from "../finish-order-schema";
import { SectionHeader } from "./section-header";

interface BenefitsSectionProps {
  form: UseFormReturn<FormSchema>;
  benefits: PedidoBeneficiosValidado | null;
  watchedPhone: string;
  useWalletBalance: boolean;
  isValidatingBenefits: boolean;
  isActionDisabled: boolean;
  isCouponsEnabled: boolean;
  isCashbackEnabled: boolean;
  onValidateBenefits: () => void;
  onToggleWalletBalance: () => void;
}

const WalletSkeleton = () => (
  <div className="rounded-xl border bg-white p-3 shadow-sm animate-pulse">
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-full bg-slate-200 shrink-0" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-2.5 w-32 rounded bg-slate-200" />
      </div>
    </div>
  </div>
);

export const BenefitsSection = ({
  form,
  benefits,
  watchedPhone,
  useWalletBalance,
  isValidatingBenefits,
  isActionDisabled,
  isCouponsEnabled,
  isCashbackEnabled,
  onValidateBenefits,
  onToggleWalletBalance,
}: BenefitsSectionProps) => {
  if (!isCouponsEnabled && !isCashbackEnabled) return null;

  return (
    <section aria-label="Benefícios">
      <SectionHeader icon={<TicketPercentIcon size={16} />} title="Benefícios" />
      <div
        className={`rounded-[24px] border bg-slate-50/50 p-4 space-y-4 transition-opacity duration-200 ${
          isActionDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isCouponsEnabled && (
          <FormField
            control={form.control}
            name="couponCode"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm">Cupom de desconto</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="Ex.: BEMVINDO10"
                      autoCapitalize="characters"
                      className="rounded-xl uppercase h-9 text-base"
                      disabled={isActionDisabled}
                      aria-disabled={isActionDisabled}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-9 px-3 text-sm"
                    disabled={isActionDisabled || isValidatingBenefits || !watchedPhone}
                    aria-disabled={isActionDisabled}
                    onClick={onValidateBenefits}
                  >
                    {isValidatingBenefits ? (
                      <Loader2Icon className="animate-spin h-3.5 w-3.5" />
                    ) : (
                      "Aplicar"
                    )}
                  </Button>
                </div>
                <FormMessage className="text-xs" />
                {isActionDisabled ? (
                  <p className="text-xs text-rose-500 mt-1 italic">
                    * Indisponível enquanto o restaurante estiver fechado.
                  </p>
                ) : !watchedPhone ? (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    * Informe seu celular para aplicar cupons automaticamente.
                  </p>
                ) : !benefits && !isValidatingBenefits ? (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    * Digite o celular completo para consultar seu cashback.
                  </p>
                ) : null}
              </FormItem>
            )}
          />
        )}

        {isCashbackEnabled && (
          <>
            {/* Skeleton while auto-validating in background */}
            {isValidatingBenefits && !benefits && <WalletSkeleton />}

            {/* Wallet card with pop-in animation when benefits arrive */}
            {benefits && (
              <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-500">
                <div className="rounded-xl border bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <WalletCardsIcon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Seu Cashback</p>
                        <p className="text-xs text-muted-foreground">
                          Saldo:{" "}
                          <strong>{formatCurrency(benefits.wallet?.currentBalance ?? 0)}</strong>
                        </p>
                      </div>
                    </div>

                    {(benefits.wallet?.currentBalance ?? 0) > 0 && (
                      <Button
                        type="button"
                        variant={useWalletBalance ? "default" : "outline"}
                        className="h-7 rounded-full text-xs px-3"
                        disabled={isActionDisabled || isValidatingBenefits}
                        aria-disabled={isActionDisabled}
                        onClick={onToggleWalletBalance}
                      >
                        {useWalletBalance ? "Remover" : "Usar"}
                      </Button>
                    )}
                  </div>

                  {useWalletBalance && benefits.wallet?.availableToRedeem ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 inline-block">
                      Resgate de {formatCurrency(benefits.wallet.availableToRedeem)} aplicado!
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
