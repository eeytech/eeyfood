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
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProductSheetSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="h-[160px] w-full animate-pulse bg-slate-200 sm:h-[200px]" />
      <div className="flex flex-col gap-5 p-6">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-4 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="mt-2 space-y-3">
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

const ProductSheet = ({
  product,
  isOpen,
  isLoading,
  onOpenChange,
}: ProductSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 w-full sm:max-w-[450px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {isLoading ? "Carregando produto..." : (product?.name ?? "Produto")}
          </SheetTitle>
          <SheetDescription>
            {isLoading
              ? "Aguarde enquanto carregamos os detalhes."
              : `Detalhes do produto ${product?.name ?? ""}`}
          </SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <ProductSheetSkeleton />
        ) : product ? (
          <ProductDetailsContent
            product={product}
            onAddToCart={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default ProductSheet;
