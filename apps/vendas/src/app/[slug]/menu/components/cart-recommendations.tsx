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
  }, [products, slug]); // Só revalida se o número de itens mudar ou slug

  if (recommendations.length === 0 || isLoading) return null;

  return (
    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="flex items-center gap-2 px-1">
        <SparklesIcon size={16} className="text-amber-500 fill-amber-500" />
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
          Que tal acompanhar com?
        </h4>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {recommendations.map((product) => (
          <div
            key={product.id}
            className="flex min-w-[140px] flex-col gap-2 rounded-2xl border bg-white p-2 shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain p-2"
              />
            </div>
            <div className="flex flex-col gap-1 px-1">
              <p className="truncate text-[11px] font-bold text-slate-800">
                {product.name}
              </p>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-primary">
                  {formatCurrency(product.price)}
                </span>
                <Button
                  size="icon"
                  className="h-6 w-6 rounded-lg shadow-sm"
                  onClick={() =>
                    addProduct({
                      ...product,
                      cartItemId: product.id,
                      quantity: 1,
                      selectedOptions: [],
                    })
                  }
                >
                  <PlusIcon size={12} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CartRecommendations;
