"use client";

import { CheckCircle2Icon, ShoppingBagIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/helpers/format-currency";
import type { RestaurantComCategoriasEProdutos } from "@/lib/db";

import { CartContext } from "../contexts/cart";
import CartProductItem from "./cart-product-item";
import CartRecommendations from "./cart-recommendations";
import FinishOrderSheet from "./finish-order-sheet";

interface CartPanelProps {
  variant?: "sidebar" | "sheet";
  restaurant: RestaurantComCategoriasEProdutos;
  consumptionMethod?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
}

const CartPanel = ({
  variant = "sidebar",
  restaurant,
  consumptionMethod: consumptionMethodProp,
}: CartPanelProps) => {
  const searchParams = useSearchParams();
  const consumptionMethod =
    consumptionMethodProp ??
    (searchParams.get("consumptionMethod")?.toUpperCase() as
      | "DINE_IN"
      | "TAKEAWAY"
      | "DELIVERY"
      | undefined);
  const [finishOrderSheetIsOpen, setFinishOrderSheetIsOpen] = useState(false);
  const { products, total, totalQuantity } = useContext(CartContext);
  const hasProducts = products.length > 0;

  const isDelivery = consumptionMethod !== "DINE_IN" && consumptionMethod !== "TAKEAWAY";

  // Verifica se algum produto no carrinho dá direito a Frete Grátis por regra de Categoria ou Produto
  const hasItemWithFreeDelivery = isDelivery && Boolean(
    restaurant.freeDeliveryRules?.some((rule) => {
      if (!rule.isActive) return false;
      const now = new Date();
      if (rule.startsAt && new Date(rule.startsAt) > now) return false;
      if (rule.endsAt && new Date(rule.endsAt) < now) return false;

      const minOrder = Number(rule.minOrderValue || 0);
      if (minOrder > 0 && total < minOrder) return false;

      if (rule.criterion === "PRODUCT" && rule.productId) {
        return products.some((p) => p.id === rule.productId);
      }
      if (rule.criterion === "CATEGORY" && rule.menuCategoryId) {
        return products.some((p) => p.menuCategoryId === rule.menuCategoryId);
      }
      return false;
    }),
  );

  const threshold = restaurant.freeDeliveryThreshold;
  const showFreeDelivery =
    isDelivery &&
    ((threshold != null && threshold > 0) || hasItemWithFreeDelivery);
  const freeDeliveryRemaining = threshold != null && threshold > 0 ? Math.max(threshold - total, 0) : 0;
  const freeDeliveryProgress = threshold != null && threshold > 0 ? Math.min((total / threshold) * 100, 100) : 100;
  const freeDeliveryAchieved =
    isDelivery && (hasItemWithFreeDelivery || (threshold != null && threshold > 0 && freeDeliveryRemaining === 0));

  // Pedido mínimo para entrega
  const minOrderValue = isDelivery ? Number(restaurant.minimumOrderValue || 0) : 0;
  const isBelowMinimumOrder = isDelivery && minOrderValue > 0 && total < minOrderValue;

  // Estimativa de taxa de entrega
  const baseDeliveryFee = isDelivery
    ? (freeDeliveryAchieved ? 0 : Number(restaurant.deliveryFee || 0))
    : 0;
  const hasFeeRules = isDelivery && (restaurant.deliveryFeeRules?.length ?? 0) > 0;
  const estimatedTotal = total + baseDeliveryFee;

  const content = (
    <>
      <div className={variant === "sheet" ? "flex flex-col gap-1 px-6 pt-0 shrink-0" : "flex flex-col gap-1 px-4 pt-6 shrink-0"}>
        <div className="flex items-center gap-2">
          <ShoppingBagIcon size={18} className="text-primary" aria-hidden="true" />
          <h3 className="text-lg font-bold tracking-tight text-slate-900">Seu pedido</h3>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {hasProducts
            ? `${String(totalQuantity)} ${totalQuantity === 1 ? "item selecionado" : "itens selecionados"}`
            : "Adicione produtos para começar seu pedido."}
        </p>
      </div>

      {showFreeDelivery && (
        <div className={variant === "sheet" ? "px-6 pb-2 pt-3 shrink-0" : "px-4 pb-1 pt-3 shrink-0"}>
          {freeDeliveryAchieved ? (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
              <CheckCircle2Icon size={16} className="shrink-0 text-emerald-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-emerald-700">
                Parabéns, você garantiu Frete Grátis neste pedido!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Falta apenas{" "}
                <span className="font-bold text-slate-800">
                  {formatCurrency(freeDeliveryRemaining)}
                </span>{" "}
                para você ganhar{" "}
                <span className="font-semibold text-emerald-600">Frete Grátis!</span>
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {hasProducts && (
        <div className={variant === "sheet" ? "flex-1 min-h-0 overflow-hidden px-6 pt-4" : "min-h-0 flex-1 overflow-hidden px-0 pt-3"}>
          <ScrollArea
            className="h-full w-full [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full [&>[data-radix-scroll-area-viewport]>div]:!min-w-0"
          >
            <div className={variant === "sidebar" ? "space-y-2.5 px-4 pb-4 w-full min-w-0" : "space-y-3 pr-4 pb-6"}>
              {products.map((product) => (
                <CartProductItem key={product.cartItemId} product={product} variant={variant} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {hasProducts && (
        <div className={variant === "sheet" ? "pt-2 pb-1 border-t shrink-0" : "pt-2 pb-1 border-t border-slate-100 shrink-0"}>
          <CartRecommendations restaurantSlug={restaurant.slug} variant={variant} />
        </div>
      )}

      {!hasProducts && (
        <div className={variant === "sheet" ? "flex-1 overflow-hidden px-6 pt-4 flex items-center justify-center" : "flex flex-col gap-3 px-6 pt-3"}>
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/50 px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <ShoppingBagIcon size={24} className="text-slate-200" />
            </div>
            <p className="text-base font-bold text-slate-900">Seu carrinho está vazio</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Que tal dar uma olhada no cardápio e escolher algo gostoso?
            </p>
          </div>
        </div>
      )}

      <div
        className={
          variant === "sheet"
            ? "mt-auto shrink-0 flex flex-col gap-3.5 border-t bg-white p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]"
            : "mt-auto shrink-0 flex flex-col gap-3 border-t bg-slate-50/40 px-4 py-4"
        }
      >
        {isDelivery && hasProducts && (
          <div className="space-y-1.5 text-xs text-slate-500 pb-1 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-700">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>
                Taxa de entrega
                {hasFeeRules && !freeDeliveryAchieved && (
                  <span className="text-[10px] text-slate-400 ml-1">
                    (varia por endereço)
                  </span>
                )}
              </span>
              <span className="font-semibold">
                {freeDeliveryAchieved || baseDeliveryFee === 0 ? (
                  <span className="text-emerald-600 font-bold">Grátis</span>
                ) : (
                  <span>
                    {hasFeeRules ? `a partir de ${formatCurrency(baseDeliveryFee)}` : formatCurrency(baseDeliveryFee)}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="flex w-full items-center justify-between">
          <p className="text-base font-semibold text-slate-600">
            {isDelivery ? "Total estimado" : "Total do pedido"}
          </p>
          <p className="text-2xl font-extrabold text-slate-900" aria-live="polite">
            {formatCurrency(isDelivery ? estimatedTotal : total)}
          </p>
        </div>

        {isBelowMinimumOrder && (
          <p className="rounded-xl bg-amber-50 p-2 text-center text-xs font-medium text-amber-700 border border-amber-200">
            Pedido mínimo para entrega: <strong>{formatCurrency(minOrderValue)}</strong> (faltam {formatCurrency(minOrderValue - total)})
          </p>
        )}

        <Button
          className="h-12 w-full rounded-2xl bg-destructive text-base font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          disabled={!hasProducts || isBelowMinimumOrder}
          onClick={() => setFinishOrderSheetIsOpen(true)}
        >
          {isBelowMinimumOrder ? "Pedido mínimo não atingido" : "Finalizar pedido"}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {variant === "sidebar" ? (
        <Card className="flex h-full max-h-[calc(100vh-2rem)] w-full min-w-0 flex-col overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-slate-200/60">
          {content}
        </Card>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {content}
        </div>
      )}

      <FinishOrderSheet
        open={finishOrderSheetIsOpen}
        onOpenChange={setFinishOrderSheetIsOpen}
        restaurant={restaurant}
        consumptionMethod={consumptionMethod}
      />
    </>
  );
};

export default CartPanel;
