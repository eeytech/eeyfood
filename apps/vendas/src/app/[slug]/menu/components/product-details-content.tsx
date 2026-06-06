"use client";

import { ChefHatIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import { useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/helpers/format-currency";
import { isRestaurantOpen } from "@/helpers/restaurant-status";
import type { ProductComRestaurante } from "@/lib/db";

import { CartContext } from "../contexts/cart";

interface ProductDetailsContentProps {
  product: ProductComRestaurante;
  onAddToCart?: () => void;
  showImage?: boolean;
}

const ProductDetailsContent = ({
  product,
  onAddToCart,
  showImage = true,
}: ProductDetailsContentProps) => {
  const { toggleCart, addProduct } = useContext(CartContext);
  const [quantity, setQuantity] = useState<number>(1);

  const isOpen = isRestaurantOpen(
    product.restaurant.status,
    product.restaurant.operatingHours,
  );

  const handleDecreaseQuantity = () => {
    setQuantity((prev) => {
      if (prev === 1) {
        return 1;
      }

      return prev - 1;
    });
  };

  const handleIncreaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleAddToCart = () => {
    addProduct({
      ...product,
      quantity,
    });
    onAddToCart?.();
    toggleCart();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden lg:bg-white">
      {showImage && (
        <div className="relative min-h-[250px] w-full bg-slate-100 lg:min-h-[400px]">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-8 lg:p-12"
          />
        </div>
      )}

      <div className="flex flex-auto flex-col overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="flex-auto overflow-hidden">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <Image
              src={product.restaurant.avatarImageUrl}
              alt={product.restaurant.name}
              width={20}
              height={20}
              className="rounded-full"
            />
            <p className="text-sm text-muted-foreground">
              {product.restaurant.name}
            </p>
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {product.name}
          </h2>

          <div className="mt-4 flex items-center justify-between sm:mt-6">
            <h3 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              {formatCurrency(product.price)}
            </h3>
            <div className="flex items-center gap-4 text-center">
              <Button
                variant="outline"
                className="h-10 w-10 rounded-2xl border-slate-200 shadow-sm transition hover:bg-slate-50 active:scale-95"
                onClick={handleDecreaseQuantity}
              >
                <ChevronLeftIcon size={18} />
              </Button>
              <p className="w-6 text-lg font-bold">{quantity}</p>
              <Button
                variant="destructive"
                className="h-10 w-10 rounded-2xl shadow-md transition hover:scale-105 active:scale-95"
                onClick={handleIncreaseQuantity}
              >
                <ChevronRightIcon size={18} />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-full">
            <div className="mt-8 space-y-4">
              <h4 className="text-lg font-bold text-slate-950">Sobre</h4>
              <p className="text-base leading-relaxed text-slate-600">
                {product.description}
              </p>
            </div>

            {product.ingredients.length > 0 && (
              <div className="mt-8 space-y-4 pb-6">
                <div className="flex items-center gap-2">
                  <ChefHatIcon size={20} className="text-slate-800" />
                  <h4 className="text-lg font-bold text-slate-950">
                    Ingredientes
                  </h4>
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {product.ingredients.map((ingredient) => (
                    <li
                      key={ingredient}
                      className="flex items-center gap-2 text-base text-slate-600"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="mt-8 space-y-4 border-t pt-6 lg:mt-auto">
          {!isOpen && (
            <p className="rounded-2xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-600">
              O restaurante está fechado no momento e não aceita novos pedidos.
            </p>
          )}
          <Button
            className="h-14 w-full rounded-full text-lg font-bold shadow-lg shadow-destructive/20 transition hover:scale-[1.01] active:scale-[0.99]"
            onClick={handleAddToCart}
            disabled={!isOpen}
          >
            Adicionar à sacola
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsContent;
