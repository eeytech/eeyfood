"use client";

import { ShoppingBagIcon } from "lucide-react";
import { useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <>
      <Card
        className={
          variant === "sidebar"
            ? "overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-slate-200/60"
            : "border-0 shadow-none"
        }
      >
        <CardHeader className={variant === "sheet" ? "px-0 pt-0" : "px-4 pt-6"}>
          <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ShoppingBagIcon size={18} className="text-primary" aria-hidden="true" />
            Seu pedido
          </CardTitle>
          <CardDescription className="text-xs" aria-live="polite">
            {hasProducts
              ? `${String(totalQuantity)} ${totalQuantity === 1 ? "item selecionado" : "itens selecionados"}`
              : "Adicione produtos para começar seu pedido."}
          </CardDescription>
        </CardHeader>

        <CardContent
          className={
            variant === "sheet" ? "flex flex-col gap-4 px-4 pb-0" : "flex flex-col gap-4 px-6"
          }
        >
          {hasProducts ? (
            <ScrollArea className={variant === "sidebar" ? "h-[450px]" : "h-[550px]"}>
              <div className="space-y-4 pr-4 pb-4">
                {products.map((product) => (
                  <CartProductItem key={product.cartItemId} product={product} />
                ))}
                
                <CartRecommendations />
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/50 px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <ShoppingBagIcon size={24} className="text-slate-300" />
              </div>
              <p className="text-base font-bold text-slate-900">Seu carrinho está vazio</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Que tal dar uma olhada no cardápio e escolher algo gostoso?
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter
          className={
            variant === "sheet"
              ? "mt-auto flex-col gap-4 border-t bg-white p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]"
              : "mt-6 flex-col gap-4 border-t bg-slate-50/40 px-6 py-6"
          }
        >
          <div className="flex w-full items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Total do pedido</p>
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
        </CardFooter>
      </Card>

      <FinishOrderSheet
        open={finishOrderSheetIsOpen}
        onOpenChange={setFinishOrderSheetIsOpen}
        restaurant={restaurant}
      />
    </>
  );
};

export default CartPanel;
