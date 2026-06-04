"use client";

import { isRestaurantOpen } from "@fsw/db";
import { ChefHatIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import { useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/helpers/format-currency";
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
    <div className="flex h-full flex-col overflow-hidden">
      {showImage && (
        <div className="relative min-h-[250px] w-full bg-slate-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-8"
          />
        </div>
      )}

      <div className="flex flex-auto flex-col overflow-hidden p-6">
        <div className="flex-auto overflow-hidden">
          <div className="flex items-center gap-1.5">
            <Image
              src={product.restaurant.avatarImageUrl}
              alt={product.restaurant.name}
              width={16}
              height={16}
              className="rounded-full"
            />
            <p className="text-xs text-muted-foreground">
              {product.restaurant.name}
            </p>
          </div>

          <h2 className="mt-1 text-xl font-semibold">{product.name}</h2>

          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              {formatCurrency(product.price)}
            </h3>
            <div className="flex items-center gap-3 text-center">
              <Button
                variant="outline"
                className="h-8 w-8 rounded-xl"
                onClick={handleDecreaseQuantity}
              >
                <ChevronLeftIcon size={16} />
              </Button>
              <p className="w-4 font-medium">{quantity}</p>
              <Button
                variant="destructive"
                className="h-8 w-8 rounded-xl"
                onClick={handleIncreaseQuantity}
              >
                <ChevronRightIcon size={16} />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-full">
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold text-slate-900">Sobre</h4>
              <p className="text-sm leading-6 text-slate-600">
                {product.description}
              </p>
            </div>

            {product.ingredients.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-1.5">
                  <ChefHatIcon size={18} className="text-slate-700" />
                  <h4 className="font-semibold text-slate-900">Ingredientes</h4>
                </div>
                <ul className="list-disc space-y-1 px-5 text-sm text-slate-600">
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="mt-6 space-y-3">
          {!isOpen && (
            <p className="text-center text-sm font-medium text-rose-600">
              O restaurante está fechado no momento e não aceita novos pedidos.
            </p>
          )}
          <Button
            className="w-full rounded-full"
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
