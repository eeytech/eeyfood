"use client";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleHalfIcon,
  PizzaIcon,
} from "lucide-react";
import Image from "next/image";
import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/helpers/format-currency";
import type { Product, ProductOption, ProductOptionGroup } from "@/lib/db";

import { fetchCategoryProductsAction } from "../actions";
import { CartContext } from "../contexts/cart";

type PizzaFraction = "inteira" | "meio-a-meio";

interface PizzaBuilderSheetProps {
  isOpen: boolean;
  product: Product | null;
  categoryId: string;
  restaurantSlug: string;
  pizzaPricingRule: "MAX" | "AVERAGE";
  borderOptionGroup?: ProductOptionGroup & { options: ProductOption[] };
  onOpenChange: (open: boolean) => void;
}

const PizzaBuilderSheet = ({
  isOpen,
  product,
  categoryId,
  restaurantSlug,
  pizzaPricingRule,
  borderOptionGroup,
  onOpenChange,
}: PizzaBuilderSheetProps) => {
  const { addProduct, toggleCart } = useContext(CartContext);

  const [fraction, setFraction] = useState<PizzaFraction>("inteira");
  const [flavor2, setFlavor2] = useState<Product | null>(null);
  const [selectedBorder, setSelectedBorder] = useState<ProductOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!isOpen || !categoryId) return;
    setLoadingProducts(true);
    fetchCategoryProductsAction(restaurantSlug, categoryId)
      .then((products) => setCategoryProducts(products))
      .finally(() => setLoadingProducts(false));
  }, [isOpen, categoryId, restaurantSlug]);

  useEffect(() => {
    if (!isOpen) {
      setFraction("inteira");
      setFlavor2(null);
      setSelectedBorder(null);
      setQuantity(1);
    }
  }, [isOpen]);

  const computedPrice = useMemo(() => {
    if (!product) return 0;
    const borderPrice = selectedBorder?.price ?? 0;

    if (fraction === "inteira" || !flavor2) {
      return product.price + borderPrice;
    }

    const basePrice =
      pizzaPricingRule === "MAX"
        ? Math.max(product.price, flavor2.price)
        : (product.price + flavor2.price) / 2;

    return basePrice + borderPrice;
  }, [product, flavor2, fraction, selectedBorder, pizzaPricingRule]);

  const primaryProduct = useMemo(() => {
    if (!product) return null;
    if (fraction === "inteira" || !flavor2) return product;
    return pizzaPricingRule === "MAX" && flavor2.price > product.price ? flavor2 : product;
  }, [product, flavor2, fraction, pizzaPricingRule]);

  const handleAddToCart = () => {
    if (!primaryProduct || !product) return;

    if (fraction === "meio-a-meio" && !flavor2) {
      toast.warning("Selecione o segundo sabor para montar a pizza meio a meio.");
      return;
    }

    const flavorLabel =
      fraction === "meio-a-meio" && flavor2
        ? `${product.name} / ${flavor2.name}`
        : product.name;

    const notes =
      fraction === "meio-a-meio" && flavor2
        ? `Meio a meio: ${product.name} / ${flavor2.name}`
        : undefined;

    const optionsForCart = selectedBorder
      ? [{ id: selectedBorder.id, name: selectedBorder.name, price: selectedBorder.price }]
      : [];

    const cartItemId = `pizza-${primaryProduct.id}-${fraction}-${flavor2?.id ?? ""}-${selectedBorder?.id ?? ""}`;

    addProduct({
      id: primaryProduct.id,
      name: `Pizza — ${flavorLabel}`,
      price: computedPrice - (selectedBorder?.price ?? 0),
      imageUrl: primaryProduct.imageUrl,
      cartItemId,
      quantity,
      notes,
      selectedOptions: optionsForCart,
    });

    onOpenChange(false);
    toggleCart();
  };

  if (!product) return null;

  const otherFlavors = categoryProducts.filter((p) => p.id !== product.id);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <PizzaIcon size={20} className="text-orange-500" />
            Montar Pizza
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-auto flex-col overflow-y-auto px-5 py-4 pb-32 space-y-6">
          {/* Fraction selector */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Quantos sabores?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setFraction("inteira"); setFlavor2(null); }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition ${
                  fraction === "inteira"
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <PizzaIcon size={28} className={fraction === "inteira" ? "text-orange-500" : "text-slate-400"} />
                <span className="text-sm font-semibold">Inteira</span>
                <span className="text-xs text-slate-500">1 sabor</span>
              </button>
              <button
                type="button"
                onClick={() => setFraction("meio-a-meio")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition ${
                  fraction === "meio-a-meio"
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <CircleHalfIcon size={28} className={fraction === "meio-a-meio" ? "text-orange-500" : "text-slate-400"} />
                <span className="text-sm font-semibold">Meio a Meio</span>
                <span className="text-xs text-slate-500">2 sabores</span>
              </button>
            </div>
          </div>

          {/* Flavor 1 — always the clicked product */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">
              {fraction === "meio-a-meio" ? "1º Sabor" : "Sabor"}
            </p>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-orange-400 bg-orange-50 p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{product.name}</p>
                <p className="text-sm text-orange-600 font-medium">{formatCurrency(product.price)}</p>
              </div>
              <CheckIcon size={20} className="shrink-0 text-orange-500" />
            </div>
          </div>

          {/* Flavor 2 — only for meio-a-meio */}
          {fraction === "meio-a-meio" && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">2º Sabor</p>
              {loadingProducts ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {otherFlavors.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFlavor2(flavor2?.id === p.id ? null : p)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                        flavor2?.id === p.id
                          ? "border-orange-400 bg-orange-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                        <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(p.price)}</p>
                      </div>
                      {flavor2?.id === p.id && (
                        <CheckIcon size={18} className="shrink-0 text-orange-500" />
                      )}
                    </button>
                  ))}
                  {otherFlavors.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-4">
                      Nenhum outro sabor disponível nesta categoria.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Border options */}
          {borderOptionGroup && borderOptionGroup.options.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Borda Recheada (opcional)</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedBorder(null)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                    !selectedBorder
                      ? "border-orange-400 bg-orange-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-medium text-slate-700">Sem borda</span>
                  {!selectedBorder && <CheckIcon size={16} className="ml-auto shrink-0 text-orange-500" />}
                </button>
                {borderOptionGroup.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedBorder(selectedBorder?.id === opt.id ? null : opt)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                      selectedBorder?.id === opt.id
                        ? "border-orange-400 bg-orange-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{opt.name}</p>
                      {opt.description && (
                        <p className="text-xs text-slate-500">{opt.description}</p>
                      )}
                      {opt.price > 0 && (
                        <p className="text-xs font-medium text-orange-600">+ {formatCurrency(opt.price)}</p>
                      )}
                    </div>
                    {selectedBorder?.id === opt.id && (
                      <CheckIcon size={16} className="shrink-0 text-orange-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="fixed bottom-0 left-0 w-full border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-9 w-9 rounded-[14px] border-slate-200"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <ChevronLeftIcon size={18} />
              </Button>
              <span className="w-6 text-center text-lg font-semibold">{quantity}</span>
              <Button
                variant="destructive"
                className="h-9 w-9 rounded-[14px]"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <ChevronRightIcon size={18} />
              </Button>
            </div>
            <div className="text-right">
              {fraction === "meio-a-meio" && flavor2 && pizzaPricingRule === "AVERAGE" && (
                <p className="text-[10px] text-slate-400">Preço médio dos sabores</p>
              )}
              {fraction === "meio-a-meio" && flavor2 && pizzaPricingRule === "MAX" && (
                <p className="text-[10px] text-slate-400">Preço do sabor mais caro</p>
              )}
              <p className="text-xl font-bold text-slate-900">{formatCurrency(computedPrice * quantity)}</p>
            </div>
          </div>
          <Button
            className="h-12 w-full rounded-xl text-base font-bold shadow-lg shadow-orange-500/20 bg-orange-500 hover:bg-orange-600 text-white transition hover:scale-[1.01] active:scale-[0.99]"
            onClick={handleAddToCart}
          >
            Adicionar à sacola
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PizzaBuilderSheet;
