import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import { useContext } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/helpers/format-currency";

import { CartContext, CartProduct } from "../contexts/cart";

interface CartItemProps {
  product: CartProduct;
}

const CartProductItem = ({ product }: CartItemProps) => {
  const { decreaseProductQuantity, increaseProductQuantity, removeProduct } =
    useContext(CartContext);

  const optionsTotal =
    product.selectedOptions?.reduce((acc, opt) => acc + opt.price, 0) || 0;
  const unitPrice = product.price + optionsTotal;

  return (
    <div className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 rounded-2xl bg-slate-50">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="rounded-2xl object-contain p-2"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="line-clamp-1 text-sm font-bold text-slate-900">
            {product.name}
          </p>
          
          {((product.selectedOptions && product.selectedOptions.length > 0) || product.notes) && (
            <div className="space-y-0.5">
              {product.selectedOptions?.map((opt) => (
                <p key={opt.id} className="text-[10px] leading-tight text-slate-500">
                  + {opt.name}
                </p>
              ))}
              {product.notes && (
                <p className="text-[10px] font-medium leading-tight text-destructive">
                  Obs: {product.notes}
                </p>
              )}
            </div>
          )}

          <p className="text-sm font-extrabold text-slate-900">{formatCurrency(unitPrice)}</p>

          <div className="flex items-center gap-3 pt-1" role="group" aria-label="Controle de quantidade">
            <Button
              className="h-8 w-8 rounded-xl border-slate-200 shadow-sm transition active:scale-90"
              variant="outline"
              size="icon"
              onClick={() => decreaseProductQuantity(product.cartItemId)}
              aria-label={`Remover uma unidade de ${product.name}`}
            >
              <MinusIcon size={14} aria-hidden="true" />
            </Button>
            <p className="w-4 text-center text-sm font-bold" aria-live="polite">
              {String(product.quantity)}
            </p>
            <Button
              className="h-8 w-8 rounded-xl shadow-md shadow-destructive/10 transition active:scale-90"
              variant="destructive"
              size="icon"
              onClick={() => increaseProductQuantity(product.cartItemId)}
              aria-label={`Adicionar uma unidade de ${product.name}`}
            >
              <PlusIcon size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <Button
        className="h-8 w-8 shrink-0 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
        variant="ghost"
        size="icon"
        onClick={() => removeProduct(product.cartItemId)}
        aria-label={`Remover ${product.name} do carrinho`}
      >
        <TrashIcon size={16} aria-hidden="true" />
      </Button>
    </div>
  );
};

export default CartProductItem;
