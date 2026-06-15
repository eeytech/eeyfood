"use client";

import { ChefHatIcon, ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon } from "lucide-react";
import Image from "next/image";
import { useContext, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/helpers/format-currency";
import { isRestaurantOpen } from "@/helpers/restaurant-status";
import type { ProductComRestaurante, ProductOption, ProductOptionGroup } from "@/lib/db";

import { CartContext } from "../contexts/cart";

interface ProductWithModifier extends ProductComRestaurante {
  optionGroups?: (ProductOptionGroup & { options: ProductOption[] })[];
}

interface ProductDetailsContentProps {
  product: ProductWithModifier;
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [comment, setComment] = useState<string>("");
  const [isImageLoading, setIsImageLoading] = useState(true);

  const optionGroups = useMemo(() => product.optionGroups || [], [product.optionGroups]);

  const { isOpen } = isRestaurantOpen(
    product.restaurant.status,
    product.restaurant.operatingHours,
  );

  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;

  const handleDecreaseQuantity = () => {
    setQuantity((prev) => (prev === 1 ? 1 : prev - 1));
  };

  const handleIncreaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleOptionToggle = (groupId: string, optionId: string, maxOptions: number) => {
    setSelectedOptions((prev) => {
      const currentSelected = prev[groupId] || [];
      const isSelected = currentSelected.includes(optionId);

      if (isSelected) {
        return {
          ...prev,
          [groupId]: currentSelected.filter((id) => id !== optionId),
        };
      }

      if (maxOptions === 1) {
        return { ...prev, [groupId]: [optionId] };
      }

      if (currentSelected.length < maxOptions) {
        return { ...prev, [groupId]: [...currentSelected, optionId] };
      }

      return prev;
    });
  };

  const selectedOptionsList = useMemo(() => {
    const list: ProductOption[] = [];
    Object.values(selectedOptions).forEach((ids) => {
      ids.forEach((id) => {
        const option = optionGroups
          .flatMap((g) => g.options)
          .find((o) => o.id === id);
        if (option) list.push(option);
      });
    });
    return list;
  }, [selectedOptions, optionGroups]);

  const unitPrice = useMemo(() => {
    const optionsTotal = selectedOptionsList.reduce((acc, opt) => acc + opt.price, 0);
    return product.price + optionsTotal;
  }, [product.price, selectedOptionsList]);

  const canAddToCart = useMemo(() => {
    return optionGroups.every((group) => {
      const selected = selectedOptions[group.id] || [];
      return selected.length >= group.minOptions;
    });
  }, [optionGroups, selectedOptions]);

  const handleAddToCart = () => {
    if (!canAddToCart) return;

    const sortedOptionIds = selectedOptionsList.map((o) => o.id).sort();
    const commentHash = comment ? `-${comment.length}-${comment.slice(0, 5).replace(/\s/g, "")}` : "";
    const cartItemId = `${product.id}${sortedOptionIds.length > 0 ? `-${sortedOptionIds.join("-")}` : ""}${commentHash}`;

    addProduct({
      ...product,
      cartItemId,
      quantity,
      notes: comment,
      selectedOptions: selectedOptionsList.map((o) => ({
        id: o.id,
        name: o.name,
        price: o.price,
      })),
    });
    
    onAddToCart?.();
    toggleCart();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {showImage && (
        <div className="relative w-full shrink-0 bg-slate-100 h-[140px] sm:h-[180px] lg:h-[200px]">
          {isImageLoading && (
            <div className="absolute inset-0 z-10 animate-pulse bg-slate-200" />
          )}
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className={`object-contain transition-all duration-500 hover:scale-105 ${
              isImageLoading ? "opacity-0" : "opacity-100"
            }`}
            priority
            onLoad={() => setIsImageLoading(false)}
          />
        </div>
      )}

      <div className="flex flex-auto flex-col overflow-hidden p-4 sm:p-6 lg:p-8">
        <div className="flex-auto overflow-hidden">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <Image
              src={product.restaurant.avatarImageUrl}
              alt={product.restaurant.name}
              width={20}
              height={20}
              className="rounded-full ring-2 ring-white"
            />
            <p className="text-sm font-medium text-muted-foreground">
              {product.restaurant.name}
            </p>
          </div>

          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {product.name}
          </h2>

          <div className="mt-3 flex items-center justify-between sm:mt-4">
            <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">
              {formatCurrency(unitPrice)}
            </h3>
            <div className="flex items-center gap-3 text-center" role="group" aria-label="Seleção de quantidade">
              <Button
                variant="outline"
                className="h-9 w-9 rounded-[14px] border-slate-200 shadow-sm transition hover:bg-slate-50 active:scale-95"
                onClick={handleDecreaseQuantity}
                aria-label="Diminuir quantidade"
              >
                <ChevronLeftIcon size={18} aria-hidden="true" />
              </Button>
              <p className="w-6 text-lg font-semibold" aria-live="polite">{quantity}</p>
              <Button
                variant="destructive"
                className="h-9 w-9 rounded-[14px] shadow-md shadow-destructive/10 transition hover:scale-105 active:scale-95"
                onClick={handleIncreaseQuantity}
                aria-label="Aumentar quantidade"
              >
                <ChevronRightIcon size={18} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-full pr-4">
            {/* 1. SOBRE */}
            <div className="mt-6 space-y-2">
              <h4 className="text-lg font-semibold text-slate-950">Sobre</h4>
              <p className="text-base font-medium leading-relaxed text-slate-500">
                {product.description}
              </p>
            </div>

            {/* 2. INGREDIENTES */}
            {product.ingredients.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <ChefHatIcon size={18} className="text-slate-800" />
                  <h4 className="text-lg font-semibold text-slate-950">
                    Ingredientes
                  </h4>
                </div>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                  {product.ingredients.map((ingredient) => (
                    <li
                      key={ingredient}
                      className="flex items-center gap-2 text-base font-medium text-slate-500"
                    >
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. GRUPOS DE OPÇÕES */}
            {optionGroups.map((group) => (
              <div key={group.id} className="mt-6 space-y-3">
                <div className="flex flex-col gap-1">
                  <h4 className="text-lg font-semibold text-slate-950">{group.name}</h4>
                  <p className="text-sm text-slate-500">
                    {group.minOptions > 0 ? `Obrigatório • ` : ""}
                    {group.maxOptions === 1 ? "Selecione 1 opção" : `Selecione até ${group.maxOptions} opções`}
                  </p>
                </div>

                <div className="space-y-2">
                  {group.options.map((option: ProductOption) => {
                    const isSelected = (selectedOptions[group.id] || []).includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionToggle(group.id, option.id, group.maxOptions)}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 transition-all ${
                          isSelected
                            ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className={`text-base font-semibold ${isSelected ? "text-destructive" : "text-slate-900"}`}>
                            {option.name}
                          </span>
                          {option.description && (
                            <span className="text-sm text-slate-500">{option.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {option.price > 0 && (
                            <span className={`text-sm font-medium ${isSelected ? "text-destructive" : "text-slate-600"}`}>
                              + {formatCurrency(option.price)}
                            </span>
                          )}
                          {isSelected && <CircleCheckIcon size={18} className="text-destructive" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 4. OBSERVAÇÕES */}
            <div className="mt-6 space-y-2 pb-48">
              <Label htmlFor="comment" className="text-lg font-semibold text-slate-950">
                Observações
              </Label>
              <Textarea
                id="comment"
                placeholder="Ex: tirar cebola, ponto da carne, etc."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={200}
                className="min-h-[80px] rounded-xl border-slate-200 focus-visible:ring-destructive text-base"
              />
              <p className="text-right text-sm text-slate-400">
                {comment.length}/200
              </p>
            </div>
          </ScrollArea>
        </div>

        {/* FOOTER */}
        <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 z-50 lg:relative lg:p-0 lg:border-none lg:bg-transparent lg:mt-auto" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="max-w-screen-xl mx-auto space-y-3">
            {!isOpen && (
              <p className="rounded-xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-600 border border-rose-100">
                O restaurante está fechado no momento.
              </p>
            )}

            {isOutOfStock && (
              <p className="rounded-xl bg-amber-50 p-3 text-center text-sm font-semibold text-amber-600 border border-amber-100">
                Produto temporariamente esgotado.
              </p>
            )}

            <Button
              className="h-12 w-full rounded-xl text-base font-bold shadow-lg shadow-destructive/20 transition hover:scale-[1.01] active:scale-[0.99]"
              onClick={handleAddToCart}
              disabled={!isOpen || !canAddToCart || isOutOfStock}
            >
              Adicionar à sacola • {formatCurrency(unitPrice * quantity)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsContent;
