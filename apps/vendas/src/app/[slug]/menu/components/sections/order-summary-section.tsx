import { CoinsIcon, ShoppingBagIcon, TrendingUpIcon } from "lucide-react";

import { formatCurrency } from "@/helpers/format-currency";

import { SectionHeader } from "./section-header";

interface NextLoyaltyRule {
  minOrderValue: number;
  cashbackPercent: number;
  remainingAmount: number;
}

export interface CheckoutSummary {
  subtotal: number;
  couponDiscountAmount: number;
  cashbackRedeemedAmount: number;
  total: number;
  cashbackEarnedAmount: number;
  nextLoyaltyRule?: NextLoyaltyRule | null;
}

interface OrderSummarySectionProps {
  checkoutSummary: CheckoutSummary;
  isCashbackEnabled: boolean;
}

export const OrderSummarySection = ({ checkoutSummary, isCashbackEnabled }: OrderSummarySectionProps) => {
  const nextRule = checkoutSummary.nextLoyaltyRule;

  // Progress toward the next cashback tier (capped at 99 so bar never looks "done")
  const progressPercent = nextRule
    ? Math.min(
        Math.round(
          (checkoutSummary.total /
            (checkoutSummary.total + nextRule.remainingAmount)) *
            100,
        ),
        99,
      )
    : 0;

  return (
    <section>
      <SectionHeader icon={<ShoppingBagIcon size={16} />} title="Resumo do Pedido" />
      <div className="rounded-[24px] border bg-slate-50/80 p-4 space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-semibold">{formatCurrency(checkoutSummary.subtotal)}</span>
        </div>

        {checkoutSummary.couponDiscountAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
            <span>Cupom de Desconto</span>
            <span>-{formatCurrency(checkoutSummary.couponDiscountAmount)}</span>
          </div>
        )}

        {checkoutSummary.cashbackRedeemedAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
            <span>Cashback Resgatado</span>
            <span>-{formatCurrency(checkoutSummary.cashbackRedeemedAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-1.5">
          <span className="font-bold text-slate-800 text-base">Total Final</span>
          <span className="text-lg font-extrabold text-primary">
            {formatCurrency(checkoutSummary.total)}
          </span>
        </div>

        {/* Cashback earned — highlighted in emerald */}
        {isCashbackEnabled && checkoutSummary.cashbackEarnedAmount > 0 && (
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CoinsIcon size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700">
                  Você vai ganhar cashback!
                </p>
                <p className="text-base font-extrabold text-emerald-600">
                  +{formatCurrency(checkoutSummary.cashbackEarnedAmount)}
                </p>
              </div>
            </div>
            {!nextRule && (
              <p className="mt-1.5 text-xs text-emerald-600 leading-relaxed">
                Finalize agora e acumule pontos para sua próxima refeição!
              </p>
            )}
          </div>
        )}

        {/* Upsell: progress bar toward the next cashback tier */}
        {isCashbackEnabled && nextRule && (
          <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <TrendingUpIcon size={13} className="text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-700">Dica de Ouro!</p>
            </div>

            <p className="text-xs text-amber-700 leading-relaxed">
              Faltam apenas{" "}
              <strong>{formatCurrency(nextRule.remainingAmount)}</strong> para você
              ganhar <strong>{nextRule.cashbackPercent}%</strong> de cashback neste
              pedido!
            </p>

            <div className="space-y-1">
              <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-amber-500 font-medium">
                <span>Atual: {formatCurrency(checkoutSummary.total)}</span>
                <span>
                  Meta: {formatCurrency(checkoutSummary.total + nextRule.remainingAmount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-600 font-semibold">
              Adicione mais um item e não perca este bônus!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
