"use client";

import { PlusIcon, SparklesIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";

import { formatCurrency } from "@/helpers/format-currency";
import type { Product } from "@/lib/db";

import { getUpsellRecommendations } from "../actions/get-upsell-recommendations";
import { CartContext } from "../contexts/cart";

const CartRecommendations = () => {
  const { slug } = useParams<{ slug: string }>();
  const { products, addProduct } = useContext(CartContext);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (products.length === 0) {
        setRecommendations([]);
        return;
      }

      try {
        setIsLoading(true);
        const cartProductIds = products.map((p) => p.id);
        const data = await getUpsellRecommendations(slug, cartProductIds);
        setRecommendations(data as Product[]);
      } catch (error) {
        console.error("Erro ao buscar recomendações:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [products, slug]);

  if (recommendations.length === 0 || isLoading) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2 px-1">
        <SparklesIcon size={16} className="text-amber-500 fill-amber-500" />
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
          Que tal acompanhar com?
        </h4>
      </div>

      {/* Rolagem horizontal nativa forcada */}
      <div className="relative -mx-6">
        <div 
          className="flex gap-4 overflow-x-auto px-6 pb-4 outline-none" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {recommendations.map((product) => (
            <div
              key={product.id}
              className="flex min-w-[140px] max-w-[140px] flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm transition active:scale-95"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-contain p-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="line-clamp-2 min-h-[30px] text-[10px] font-bold leading-tight text-slate-800">
                  {product.name}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black text-primary">
                    {formatCurrency(product.price)}
                  </span>
                  <button
                    onClick={() =>
                      addProduct({
                        ...product,
                        cartItemId: product.id,
                        quantity: 1,
                        selectedOptions: [],
                      })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white shadow-md active:scale-90"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {/* Espaçador final */}
          <div className="min-w-[24px] shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default CartRecommendations;
