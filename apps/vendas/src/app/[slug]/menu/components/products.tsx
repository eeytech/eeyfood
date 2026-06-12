"use client";

import { FlameIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { formatCurrency } from "@/helpers/format-currency";
import type { Product, ProductComRestaurante, RestaurantComCategoriasEProdutos } from "@/lib/db";

import ProductSheet from "./product-sheet";

interface ProductsProps {
  products: (Product & { isBestseller?: boolean })[];
  restaurant: RestaurantComCategoriasEProdutos;
}

const Products = ({ products, restaurant }: ProductsProps) => {
  const [selectedProduct, setSelectedProduct] =
    useState<ProductComRestaurante | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct({
      ...product,
      restaurant,
    });
  };

  if (products.length === 0) {
    return (
      <div className="rounded-[32px] border border-dashed bg-slate-50 px-6 py-12 text-center" role="status">
        <p className="text-lg font-medium text-slate-950">
          Nenhum produto disponível nesta categoria
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente navegar para outra categoria do cardápio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" role="list">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => handleProductClick(product)}
            className="group flex flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
            aria-label={`Ver detalhes de ${product.name}`}
            role="listitem"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
              <Image
                src={product.imageUrl}
                alt="" 
                fill
                className="object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
              />
              {product.isBestseller && (
                <div 
                  className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-xl shadow-secondary/30"
                  aria-label="Item muito popular"
                >
                  <FlameIcon size={12} className="fill-white" aria-hidden="true" />
                  Mais Pedido
                </div>
              )}
            </div>

            <div className="flex h-full flex-col gap-3 p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold tracking-tight text-slate-950">
                  {product.name}
                </h3>
                <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                  {product.description}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    A partir de
                  </span>
                  <span className="text-base font-extrabold text-slate-950">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition group-hover:bg-primary" aria-hidden="true">
                  Ver produto
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <ProductSheet
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      />
    </div>
  );
};

export default Products;
