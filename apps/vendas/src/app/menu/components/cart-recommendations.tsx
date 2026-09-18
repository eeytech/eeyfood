"use client";

import { PlusIcon, SparklesIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";

import { formatCurrency } from "@/helpers/format-currency";
import type { Product } from "@/lib/db";

import { getUpsellRecommendations } from "../actions/get-upsell-recommendations";
import { CartContext } from "../contexts/cart";

interface CartRecommendationsProps {
  restaurantSlug?: string;
  variant?: "sidebar" | "sheet";
}

const CartRecommendations = ({ restaurantSlug, variant = "sidebar" }: CartRecommendationsProps) => {
  const params = useParams<{ slug?: string }>();
  const slug = restaurantSlug || params?.slug || "";
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

  const horizontalPadding = variant === "sheet" ? "px-6" : "px-4";
  const leftPadding = variant === "sheet" ? "pl-6" : "pl-4";
  const rightPadding = variant === "sheet" ? "pr-6" : "pr-4";

  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-1.5 ${horizontalPadding}`}>
        <SparklesIcon size={12} className="text-amber-500 fill-amber-500 shrink-0" />
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Que tal acompanhar com?
        </h4>
      </div>

      {/* Container de carrossel compacto com scroll horizontal */}
      <div
        className={`overflow-x-auto pb-1 pt-0.5 ${leftPadding} [&::-webkit-scrollbar]:hidden`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          className={`flex gap-2 ${rightPadding}`}
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {recommendations.map((product) => (
            <div
              key={product.id}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm transition hover:border-slate-300 min-w-[155px] max-w-[170px]"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-contain p-0.5"
                />
              </div>
              <div className="flex flex-1 min-w-0 flex-col">
                <p className="truncate text-[11px] font-semibold text-slate-800 leading-tight">
                  {product.name}
                </p>
                <span className="text-[11px] font-bold text-primary leading-tight mt-0.5">
                  {formatCurrency(product.price)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  addProduct({
                    ...product,
                    cartItemId: product.id,
                    quantity: 1,
                    selectedOptions: [],
                  });
                  toast.success(`${product.name} adicionado ao pedido!`);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 active:scale-90"
                aria-label={`Adicionar ${product.name}`}
              >
                <PlusIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CartRecommendations;
