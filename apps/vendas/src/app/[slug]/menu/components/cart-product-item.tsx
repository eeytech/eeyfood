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
    <div className="flex items-stretch justify-between gap-4 rounded-[22px] border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-slate-50">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="space-y-1">
            <p className="line-clamp-1 text-sm font-bold text-slate-900">
              {product.name}
            </p>
            
            {((product.selectedOptions && product.selectedOptions.length > 0) || product.notes) && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {product.selectedOptions?.map((opt) => (
                  <span key={opt.id} className="text-[11px] font-medium text-slate-400">
                    • {opt.name}
                  </span>
                ))}
                {product.notes && (
                  <span className="text-[11px] font-bold text-destructive">
                    Obs: {product.notes}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-950">
              {formatCurrency(unitPrice)}
            </p>

            <div className="flex items-center gap-3" role="group" aria-label="Controle de quantidade">
              <Button
                className="h-7 w-7 rounded-lg border-slate-200 shadow-sm transition active:scale-90"
                variant="outline"
                size="icon"
                onClick={() => decreaseProductQuantity(product.cartItemId)}
                aria-label={`Remover uma unidade de ${product.name}`}
              >
                <MinusIcon size={12} aria-hidden="true" />
              </Button>
              <p className="w-4 text-center text-xs font-bold text-slate-900" aria-live="polite">
                {String(product.quantity)}
              </p>
              <Button
                className="h-7 w-7 rounded-lg bg-destructive shadow-md shadow-destructive/10 transition active:scale-90"
                variant="destructive"
                size="icon"
                onClick={() => increaseProductQuantity(product.cartItemId)}
                aria-label={`Adicionar uma unidade de ${product.name}`}
              >
                <PlusIcon size={12} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end justify-start pt-0.5">
        <Button
          className="h-8 w-8 rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500"
          variant="ghost"
          size="icon"
          onClick={() => removeProduct(product.cartItemId)}
          aria-label={`Remover ${product.name} do carrinho`}
        >
          <TrashIcon size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default CartProductItem;
