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
    <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" style={{ display: 'flex !important', visibility: 'visible !important' }}>
      {/* Esquerda: Imagem e Nome */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-1"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-bold text-slate-900">
            {product.name}
          </p>
          
          {/* Opções */}
          {((product.selectedOptions && product.selectedOptions.length > 0) || product.notes) && (
            <div className="mt-0.5 flex flex-wrap gap-x-1 text-[10px] text-slate-400">
              {product.selectedOptions?.map((opt) => (
                <span key={opt.id} className="whitespace-nowrap">• {opt.name}</span>
              ))}
            </div>
          )}

          <p className="mt-1 text-sm font-black text-primary">
            {formatCurrency(unitPrice * product.quantity)}
          </p>
        </div>
      </div>

      {/* Direita: Ações (Sempre visíveis) */}
      <div className="flex shrink-0 flex-col items-end gap-2 border-l border-slate-50 pl-3" style={{ display: 'flex !important' }}>
        {/* Botão Remover */}
        <button
          type="button"
          onClick={() => removeProduct(product.cartItemId)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-100 hover:text-rose-600"
          style={{ cursor: 'pointer', zIndex: 10 }}
        >
          <TrashIcon size={16} />
        </button>

        {/* Seletor de Quantidade */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1" style={{ display: 'flex !important' }}>
          <button
            type="button"
            onClick={() => decreaseProductQuantity(product.cartItemId)}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 text-slate-600 transition active:scale-90"
            style={{ cursor: 'pointer', zIndex: 10 }}
          >
            <MinusIcon size={12} strokeWidth={3} />
          </button>
          
          <span className="min-w-[1.25rem] text-center text-xs font-black text-slate-900">
            {product.quantity}
          </span>

          <button
            type="button"
            onClick={() => increaseProductQuantity(product.cartItemId)}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-destructive text-white shadow-sm transition active:scale-90"
            style={{ cursor: 'pointer', zIndex: 10 }}
          >
            <PlusIcon size={12} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartProductItem;
