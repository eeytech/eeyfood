"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ProductComRestaurante } from "@/lib/db";

import ProductDetailsContent from "./product-details-content";

interface ProductSheetProps {
  product: ProductComRestaurante | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProductSheet = ({ product, isOpen, onOpenChange }: ProductSheetProps) => {
  if (!product) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>Detalhes do produto {product.name}</SheetDescription>
        </SheetHeader>
        <ProductDetailsContent
          product={product}
          onAddToCart={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
};

export default ProductSheet;
