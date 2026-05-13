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
        <CardHeader className={variant === "sheet" ? "px-0 pt-0" : undefined}>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShoppingBagIcon size={18} />
            Sua sacola
          </CardTitle>
          <CardDescription>
            {hasProducts
              ? `${String(totalQuantity)} ${totalQuantity === 1 ? "item selecionado" : "itens selecionados"}`
              : "Adicione produtos para começar seu pedido."}
          </CardDescription>
        </CardHeader>

        <CardContent
          className={
            variant === "sheet" ? "flex flex-col gap-4 px-0 pb-0" : "flex flex-col gap-4"
          }
        >
          {hasProducts ? (
            <ScrollArea className={variant === "sidebar" ? "h-[360px]" : "h-[420px]"}>
              <div className="space-y-3 pr-4">
                {products.map((product) => (
                  <CartProductItem key={product.id} product={product} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-[28px] border border-dashed bg-slate-50 px-5 py-10 text-center">
              <p className="font-medium text-slate-900">Carrinho vazio</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore as categorias e monte seu pedido com calma.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter
          className={
            variant === "sheet"
              ? "mt-6 flex-col gap-3 px-0 pb-0"
              : "mt-6 flex-col gap-3 border-t bg-slate-50/70 px-6 py-5"
          }
        >
          <div className="flex w-full items-center justify-between text-sm">
            <p className="text-muted-foreground">Total</p>
            <p className="text-base font-semibold">{formatCurrency(total)}</p>
          </div>
          <Button
            className="w-full rounded-full"
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
