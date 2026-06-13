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
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm sm:flex-row sm:items-center sm:gap-3">
      {/* Esquerda: Imagem e Informações */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 sm:h-14 sm:w-14">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-1"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-xs font-bold text-slate-900 leading-tight sm:text-xs">
            {product.name}
          </p>

          {/* Opções (simplificadas para economizar espaço) */}
          {((product.selectedOptions && product.selectedOptions.length > 0) || product.notes) && (
            <div className="flex flex-wrap gap-x-1 text-[8px] text-slate-400 sm:text-[9px]">
              {product.selectedOptions?.slice(0, 1).map((opt) => (
                <span key={opt.id} className="line-clamp-1 break-all">• {opt.name}</span>
              ))}
              {(product.selectedOptions?.length ?? 0) > 1 && <span>...</span>}
            </div>
          )}

          <p className="text-xs font-black text-primary">
            {formatCurrency(unitPrice * product.quantity)}
          </p>
        </div>
      </div>

      {/* Direita: Ações */}
      <div className="flex shrink-0 items-center justify-between gap-1.5 sm:flex-col sm:gap-1.5">
        <button
          type="button"
          onClick={() => removeProduct(product.cartItemId)}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-50 active:text-rose-600 transition-colors sm:h-7 sm:w-7"
          title="Remover"
        >
          <TrashIcon size={12} className="sm:block hidden" />
          <TrashIcon size={14} className="sm:hidden" />
        </button>

        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:gap-1 sm:p-1">
          <button
            type="button"
            onClick={() => decreaseProductQuantity(product.cartItemId)}
            className="flex h-5 w-5 items-center justify-center rounded bg-white text-slate-600 hover:bg-slate-100 active:scale-90 transition-colors border border-slate-100 sm:h-6 sm:w-6"
            title="Diminuir quantidade"
          >
            <MinusIcon size={8} strokeWidth={3} className="sm:hidden" />
            <MinusIcon size={10} strokeWidth={3} className="sm:block hidden" />
          </button>

          <span className="min-w-[1rem] text-center text-[10px] font-black text-slate-900 sm:min-w-[1.5rem] sm:text-xs">
            {product.quantity}
          </span>

          <button
            type="button"
            onClick={() => increaseProductQuantity(product.cartItemId)}
            className="flex h-5 w-5 items-center justify-center rounded bg-destructive text-white hover:bg-destructive/90 active:scale-90 transition-colors sm:h-6 sm:w-6"
            title="Aumentar quantidade"
          >
            <PlusIcon size={8} strokeWidth={3} className="sm:hidden" />
            <PlusIcon size={10} strokeWidth={3} className="sm:block hidden" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartProductItem;
