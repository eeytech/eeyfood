"use client";

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SparklesIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

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

  useEffect(() => {
    checkScroll();
  }, [recommendations, checkScroll]);

  if (recommendations.length === 0 || isLoading) return null;

  const horizontalPadding = variant === "sheet" ? "px-6" : "px-4";
  const leftPadding = variant === "sheet" ? "pl-6" : "pl-4";
  const rightPadding = variant === "sheet" ? "pr-6" : "pr-4";

  const handleScrollNav = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -180 : 180;
    el.scrollBy({ left: amount, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && !e.shiftKey) {
      e.currentTarget.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 3) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isMouseDownRef.current = false;
  };

  return (
    <div className="space-y-1.5">
      <div className={`flex items-center justify-between ${horizontalPadding}`}>
        <div className="flex items-center gap-1.5">
          <SparklesIcon size={12} className="text-amber-500 fill-amber-500 shrink-0" />
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Que tal acompanhar com?
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScrollNav("left")}
            disabled={!canScrollLeft}
            className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Rolar para a esquerda"
          >
            <ChevronLeftIcon size={12} />
          </button>
          <button
            type="button"
            onClick={() => handleScrollNav("right")}
            disabled={!canScrollRight}
            className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Rolar para a direita"
          >
            <ChevronRightIcon size={12} />
          </button>
        </div>
      </div>

      {/* Container de carrossel compacto com scroll horizontal estilizado e funcional no desktop */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`overflow-x-auto pb-2 pt-0.5 ${leftPadding} cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full`}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#cbd5e1 transparent",
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
                  className="object-contain p-0.5 pointer-events-none"
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
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasDraggedRef.current) return;
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
