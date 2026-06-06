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

import { CartContext } from "../contexts/cart";
import CartProductItem from "./cart-product-item";
import FinishOrderDialog from "./finish-order-dialog";

interface CartPanelProps {
  variant?: "sidebar" | "sheet";
}

const CartPanel = ({ variant = "sidebar" }: CartPanelProps) => {
  const [finishOrderDialogIsOpen, setFinishOrderDialogIsOpen] = useState(false);
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
        <CardHeader className={variant === "sheet" ? "px-0 pt-0" : "px-6 pt-8"}>
          <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <ShoppingBagIcon size={20} className="text-primary" />
            Sua sacola
          </CardTitle>
          <CardDescription className="text-sm">
            {hasProducts
              ? `${String(totalQuantity)} ${totalQuantity === 1 ? "item selecionado" : "itens selecionados"}`
              : "Adicione produtos para começar seu pedido."}
          </CardDescription>
        </CardHeader>

        <CardContent
          className={
            variant === "sheet" ? "flex flex-col gap-4 px-0 pb-0" : "flex flex-col gap-4 px-6"
          }
        >
          {hasProducts ? (
            <ScrollArea className={variant === "sidebar" ? "h-[450px]" : "h-[500px]"}>
              <div className="space-y-4 pr-4">
                {products.map((product) => (
                  <CartProductItem key={product.id} product={product} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-[32px] border border-dashed bg-slate-50/50 px-5 py-12 text-center">
              <p className="font-semibold text-slate-900">Carrinho vazio</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Explore as categorias e monte seu pedido com calma.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter
          className={
            variant === "sheet"
              ? "mt-6 flex-col gap-3 px-0 pb-0"
              : "mt-8 flex-col gap-4 border-t bg-slate-50/40 px-6 py-6"
          }
        >
          <div className="flex w-full items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            className="h-12 w-full rounded-full text-base font-bold shadow-lg shadow-primary/20 transition hover:scale-[1.02] active:scale-[0.98]"
            disabled={!hasProducts}
            onClick={() => setFinishOrderDialogIsOpen(true)}
          >
            Finalizar pedido
          </Button>
        </CardFooter>
      </Card>

      <FinishOrderDialog
        open={finishOrderDialogIsOpen}
        onOpenChange={setFinishOrderDialogIsOpen}
      />
    </>
  );
};

export default CartPanel;
