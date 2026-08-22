"use client";

import { CheckCircle2Icon, ShoppingBagIcon } from "lucide-react";
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
}

const CartPanel = ({ variant = "sidebar", restaurant }: CartPanelProps) => {
  const [finishOrderSheetIsOpen, setFinishOrderSheetIsOpen] = useState(false);
  const { products, total, totalQuantity } = useContext(CartContext);
  const hasProducts = products.length > 0;

  const threshold = restaurant.freeDeliveryThreshold;
  const showFreeDelivery = threshold != null && threshold > 0;
  const freeDeliveryRemaining = showFreeDelivery ? Math.max(threshold - total, 0) : 0;
  const freeDeliveryProgress = showFreeDelivery ? Math.min((total / threshold) * 100, 100) : 0;
  const freeDeliveryAchieved = showFreeDelivery && freeDeliveryRemaining === 0;

  const content = (
    <>
      <div className={variant === "sheet" ? "flex flex-col gap-1 px-6 pt-0" : "flex flex-col gap-1 px-4 pt-6"}>
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
        <div className={variant === "sheet" ? "px-6 pb-2 pt-3" : "px-6 pb-1 pt-3"}>
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
        <div className={variant === "sheet" ? "flex-1 overflow-hidden px-6 pt-4" : "min-h-0 flex-1 overflow-hidden px-0 pt-3"}>
          <ScrollArea className={variant === "sidebar" ? "h-full" : "h-full"}>
            <div className={variant === "sidebar" ? "space-y-2 px-6 pb-4" : "space-y-3 pr-4 pb-6"}>
              {products.map((product) => (
                <CartProductItem key={product.cartItemId} product={product} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {hasProducts && (
        <div className={variant === "sheet" ? "px-6 pt-2 pb-2 border-t" : "px-0 pt-0"}>
          <CartRecommendations />
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
            ? "mt-auto flex flex-col gap-4 border-t bg-white p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]"
            : "mt-6 flex flex-col gap-4 border-t bg-slate-50/40 px-6 py-6"
        }
      >
        <div className="flex w-full items-center justify-between">
          <p className="text-base font-semibold text-slate-500">Total do pedido</p>
          <p className="text-2xl font-extrabold text-slate-900" aria-live="polite">
            {formatCurrency(total)}
          </p>
        </div>
        <Button
          className="h-12 w-full rounded-2xl bg-destructive text-base font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          disabled={!hasProducts}
          onClick={() => setFinishOrderSheetIsOpen(true)}
        >
          Finalizar pedido
        </Button>
      </div>
    </>
  );

  return (
    <>
      {variant === "sidebar" ? (
        <Card className="flex h-full flex-col overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-slate-200/60">
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
      />
    </>
  );
};

export default CartPanel;
