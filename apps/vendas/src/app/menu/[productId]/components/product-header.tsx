"use client";

import { ChevronLeftIcon, ScrollTextIcon, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/db";

interface ProductHeaderProps {
  product: Pick<Product, "name" | "imageUrl">;
}

const ProductHeader = ({ product }: ProductHeaderProps) => {
  const router = useRouter();
  const [isImageLoading, setIsImageLoading] = useState(Boolean(product.imageUrl));

  const handleBackClick = () => router.back();
  const handleOrdersClick = () => router.push("/orders");

  return (
    <div className="relative h-[300px] w-full bg-slate-50 lg:h-full lg:min-h-[600px]">
      {isImageLoading && (
        <div className="absolute inset-0 z-10 animate-pulse bg-slate-200" />
      )}

      <Button
        variant="secondary"
        size="icon"
        className="absolute left-4 top-4 z-50 rounded-full border border-slate-200 shadow-sm transition hover:scale-110 active:scale-95 lg:left-8 lg:top-8"
        onClick={handleBackClick}
      >
        <ChevronLeftIcon />
      </Button>

      <div className="relative h-full w-full p-8 lg:p-16 flex items-center justify-center">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className={`object-contain p-8 transition-opacity duration-500 lg:p-16 ${
              isImageLoading ? "opacity-0" : "opacity-100"
            }`}
            priority
            onLoad={() => setIsImageLoading(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300">
            <UtensilsCrossed size={64} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <Button
        variant="secondary"
        size="icon"
        className="absolute right-4 top-4 z-50 rounded-full border border-slate-200 shadow-sm transition hover:scale-110 active:scale-95 lg:right-8 lg:top-8"
        onClick={handleOrdersClick}
      >
        <ScrollTextIcon />
      </Button>
    </div>
  );
};

export default ProductHeader;
