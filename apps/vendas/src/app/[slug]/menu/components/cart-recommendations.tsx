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
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-6">
        <SparklesIcon size={14} className="text-amber-500 fill-amber-500" />
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Que tal acompanhar com?
        </h4>
      </div>

      {/* Container de carrossel com scroll horizontal invisível */}
      <div
        className="overflow-x-auto pb-2 pl-6 [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div
          className="flex gap-3 pr-6"
          style={{
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {recommendations.map((product) => (
            <div
              key={product.id}
              className="flex shrink-0 min-w-[120px] max-w-[120px] flex-col gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-50">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-contain p-1.5"
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="line-clamp-2 min-h-[28px] text-xs font-bold leading-tight text-slate-800">
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
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white shadow active:scale-90"
                  >
                    <PlusIcon size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CartRecommendations;
