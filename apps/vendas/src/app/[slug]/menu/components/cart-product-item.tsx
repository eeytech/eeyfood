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

        <div className="min-w-0 space-y-2">
          <p className="line-clamp-2 text-sm font-medium text-slate-900">
            {product.name}
          </p>
          <p className="text-sm font-semibold">{formatCurrency(product.price)}</p>

          <div className="flex items-center gap-2">
            <Button
              className="h-8 w-8 rounded-full"
              variant="outline"
              onClick={() => decreaseProductQuantity(product.id)}
            >
              <MinusIcon size={14} />
            </Button>
            <p className="w-6 text-center text-sm font-medium">
              {String(product.quantity)}
            </p>
            <Button
              className="h-8 w-8 rounded-full"
              variant="outline"
              onClick={() => increaseProductQuantity(product.id)}
            >
              <PlusIcon size={14} />
            </Button>
          </div>
        </div>
      </div>

      <Button
        className="h-9 w-9 shrink-0 rounded-full"
        variant="ghost"
        onClick={() => removeProduct(product.id)}
      >
        <TrashIcon size={16} />
      </Button>
    </div>
  );
};

export default CartProductItem;
