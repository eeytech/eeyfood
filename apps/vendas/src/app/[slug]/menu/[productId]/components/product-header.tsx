"use client";

import { ChevronLeftIcon, ScrollTextIcon } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/db";

interface ProductHeaderProps {
  product: Pick<Product, "name" | "imageUrl">;
}

const ProductHeader = ({ product }: ProductHeaderProps) => {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const handleBackClick = () => router.back();
  const handleOrdersClick = () => router.push(`/${slug}/orders`);

  return (
    <div className="relative h-[300px] w-full bg-slate-50 lg:h-full lg:min-h-[600px]">
      <Button
        variant="secondary"
        size="icon"
        className="absolute left-4 top-4 z-50 rounded-full border border-slate-200 shadow-sm transition hover:scale-110 active:scale-95 lg:left-8 lg:top-8"
        onClick={handleBackClick}
      >
        <ChevronLeftIcon />
      </Button>

      <div className="relative h-full w-full p-8 lg:p-16">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-contain p-8 lg:p-16"
          priority
        />
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
