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
    <div className="flex items-start justify-between gap-3 rounded-[24px] border bg-white p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 rounded-2xl bg-slate-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="rounded-2xl object-contain p-2"
          />
        </div>

        <div className="min-w-0 space-y-1">
          <p className="line-clamp-2 text-sm font-medium text-slate-900">
            {product.name}
          </p>
          
          {product.selectedOptions && product.selectedOptions.length > 0 && (
            <p className="text-xs text-slate-500 italic">
              {product.selectedOptions.map((opt) => opt.name).join(", ")}
            </p>
          )}

          <p className="text-sm font-semibold">{formatCurrency(unitPrice)}</p>

          <div className="flex items-center gap-2 pt-1" role="group" aria-label="Controle de quantidade">
            <Button
              className="h-8 w-8 rounded-full"
              variant="outline"
              onClick={() => decreaseProductQuantity(product.cartItemId)}
              aria-label={`Remover uma unidade de ${product.name}`}
            >
              <MinusIcon size={14} aria-hidden="true" />
            </Button>
            <p className="w-6 text-center text-sm font-medium" aria-live="polite">
              {String(product.quantity)}
            </p>
            <Button
              className="h-8 w-8 rounded-full"
              variant="outline"
              onClick={() => increaseProductQuantity(product.cartItemId)}
              aria-label={`Adicionar uma unidade de ${product.name}`}
            >
              <PlusIcon size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <Button
        className="h-9 w-9 shrink-0 rounded-full"
        variant="ghost"
        onClick={() => removeProduct(product.cartItemId)}
        aria-label={`Remover ${product.name} do carrinho`}
      >
        <TrashIcon size={16} aria-hidden="true" />
      </Button>
    </div>
  );
};

export default CartProductItem;
