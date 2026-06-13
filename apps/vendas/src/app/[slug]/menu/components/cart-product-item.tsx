import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import { useContext } from "react";

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
    <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
      {/* Esquerda: Imagem e Informações */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-1"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-xs font-bold text-slate-900 leading-tight">
            {product.name}
          </p>

          {/* Opções (simplificadas para economizar espaço) */}
          {((product.selectedOptions && product.selectedOptions.length > 0) || product.notes) && (
            <div className="flex flex-wrap gap-x-1 text-[9px] text-slate-400">
              {product.selectedOptions?.slice(0, 2).map((opt) => (
                <span key={opt.id} className="line-clamp-1 break-all">• {opt.name}</span>
              ))}
              {(product.selectedOptions?.length ?? 0) > 2 && <span>...</span>}
            </div>
          )}

          <p className="text-xs font-black text-primary">
            {formatCurrency(unitPrice * product.quantity)}
          </p>
        </div>
      </div>

      {/* Direita: Ações (Flex layout garantindo espaço) */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => removeProduct(product.cartItemId)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-50 active:text-rose-600 transition-colors"
          title="Remover"
        >
          <TrashIcon size={14} />
        </button>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => decreaseProductQuantity(product.cartItemId)}
            className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-600 hover:bg-slate-100 active:scale-90 transition-colors border border-slate-100"
            title="Diminuir quantidade"
          >
            <MinusIcon size={10} strokeWidth={3} />
          </button>

          <span className="min-w-[1.5rem] text-center text-xs font-black text-slate-900">
            {product.quantity}
          </span>

          <button
            type="button"
            onClick={() => increaseProductQuantity(product.cartItemId)}
            className="flex h-6 w-6 items-center justify-center rounded bg-destructive text-white hover:bg-destructive/90 active:scale-90 transition-colors"
            title="Aumentar quantidade"
          >
            <PlusIcon size={10} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartProductItem;
