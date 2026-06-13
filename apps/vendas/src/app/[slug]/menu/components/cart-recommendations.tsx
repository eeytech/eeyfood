"use client";

import { PlusIcon, SparklesIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="flex items-center gap-2 px-1">
        <SparklesIcon size={16} className="text-amber-500 fill-amber-500" />
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
          Que tal acompanhar com?
        </h4>
      </div>

      {/* Container de rolagem horizontal corrigido */}
      <div className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {recommendations.map((product) => (
          <div
            key={product.id}
            className="flex min-w-[150px] max-w-[150px] snap-start flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm transition hover:shadow-md active:scale-95"
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
              <p className="line-clamp-2 min-h-[32px] text-[11px] font-bold leading-tight text-slate-800">
                {product.name}
              </p>
              <div className="flex items-center justify-between gap-1 mt-auto">
                <span className="text-xs font-black text-primary">
                  {formatCurrency(product.price)}
                </span>
                <Button
                  size="icon"
                  className="h-7 w-7 rounded-lg bg-slate-900 shadow-md transition-all hover:bg-slate-800 active:scale-90"
                  onClick={() =>
                    addProduct({
                      ...product,
                      cartItemId: product.id,
                      quantity: 1,
                      selectedOptions: [],
                    })
                  }
                >
                  <PlusIcon size={14} className="text-white" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {/* Espaçador final para garantir que o último item não fique colado */}
        <div className="min-w-[1px] shrink-0" />
      </div>
    </div>
  );
};

export default CartRecommendations;
