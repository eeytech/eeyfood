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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md">
      {/* Esquerda: Imagem e Informações */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-1"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="truncate text-sm font-bold text-slate-900">
            {product.name}
          </p>
          
          {/* Opções e Observações */}
          {((product.selectedOptions && product.selectedOptions.length > 0) || product.notes) && (
            <div className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0 text-[10px] text-slate-400">
              {product.selectedOptions?.map((opt) => (
                <span key={opt.id}>• {opt.name}</span>
              ))}
              {product.notes && (
                <span className="font-medium text-destructive truncate max-w-full">
                  Obs: {product.notes}
                </span>
              )}
            </div>
          )}

          <p className="mt-1 text-sm font-extrabold text-primary">
            {formatCurrency(unitPrice * product.quantity)}
          </p>
        </div>
      </div>

      {/* Direita: Controles de Quantidade e Lixeira */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Button
          className="h-7 w-7 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          variant="ghost"
          size="icon"
          onClick={() => removeProduct(product.cartItemId)}
          aria-label={`Remover ${product.name} do carrinho`}
        >
          <TrashIcon size={16} />
        </Button>

        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
          <Button
            className="h-6 w-6 rounded-md border-slate-200 bg-white shadow-sm transition active:scale-95"
            variant="outline"
            size="icon"
            onClick={() => decreaseProductQuantity(product.cartItemId)}
            aria-label="Diminuir quantidade"
          >
            <MinusIcon size={10} />
          </Button>
          
          <span className="w-5 text-center text-xs font-bold text-slate-900">
            {product.quantity}
          </span>

          <Button
            className="h-6 w-6 rounded-md bg-destructive text-white shadow-sm transition active:scale-95 hover:bg-destructive/90"
            variant="destructive"
            size="icon"
            onClick={() => increaseProductQuantity(product.cartItemId)}
            aria-label="Aumentar quantidade"
          >
            <PlusIcon size={10} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartProductItem;
