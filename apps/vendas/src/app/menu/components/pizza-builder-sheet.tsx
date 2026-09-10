"use client";

import {
  ChefHatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  SearchIcon,
} from "lucide-react";
import Image from "next/image";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/helpers/format-currency";
import { isRestaurantOpen } from "@/helpers/restaurant-status";
import { trackViewContent } from "@/hooks/use-pixel-events";
import type {
  Product,
  ProductComRestaurante,
  ProductOption,
  ProductOptionGroup,
  RestaurantComCategoriasEProdutos,
} from "@/lib/db";

import { fetchCategoryProductsAction } from "../actions";
import { CartContext } from "../contexts/cart";
import { ProductSheetSkeleton } from "./product-sheet";

type PizzaFraction = "inteira" | "meio-a-meio";

type FullProduct = ProductComRestaurante & {
  optionGroups?: (ProductOptionGroup & { options: ProductOption[] })[];
  ingredients?: string[];
  trackInventory?: boolean;
  stockQuantity?: number;
  availableFrom?: string | null;
  availableTo?: string | null;
};

interface PizzaBuilderSheetProps {
  isOpen: boolean;
  product: FullProduct | null;
  categoryId: string;
  restaurantSlug: string;
  pizzaPricingRule: "MAX" | "AVERAGE";
  borderOptionGroup?: ProductOptionGroup & { options: ProductOption[] };
  restaurant?: RestaurantComCategoriasEProdutos;
  onOpenChange: (open: boolean) => void;
}

const PizzaBuilderSheet = ({
  isOpen,
  product,
  categoryId,
  restaurantSlug,
  pizzaPricingRule,
  borderOptionGroup,
  restaurant,
  onOpenChange,
}: PizzaBuilderSheetProps) => {
  const { addProduct, toggleCart } = useContext(CartContext);

  const [fraction, setFraction] = useState<PizzaFraction>("inteira");
  const [flavor2, setFlavor2] = useState<Product | null>(null);
  const [selectedBorder, setSelectedBorder] = useState<ProductOption | null>(null);
  const [comment, setComment] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [flavorSearch, setFlavorSearch] = useState("");

  const restaurantInfo = product?.restaurant ?? restaurant;

  const { isOpen: isOpenRestaurant } = restaurantInfo
    ? isRestaurantOpen(restaurantInfo.status, restaurantInfo.operatingHours)
    : { isOpen: true };

  const isOutOfStock = Boolean(
    product?.trackInventory &&
      product.stockQuantity !== undefined &&
      product.stockQuantity <= 0,
  );

  const isOutsideAvailableHours = (() => {
    if (!product?.availableFrom || !product?.availableTo) return false;
    const now = new Date();
    const [fH, fM] = product.availableFrom.split(":").map(Number);
    const [tH, tM] = product.availableTo.split(":").map(Number);
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const fromMins = (fH ?? 0) * 60 + (fM ?? 0);
    const toMins = (tH ?? 0) * 60 + (tM ?? 0);
    if (fromMins <= toMins) return currentMins < fromMins || currentMins > toMins;
    return currentMins < fromMins && currentMins > toMins;
  })();

  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (product && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      trackViewContent({
        productId: product.id,
        productName: product.name,
        price: product.price,
      });
    }
  }, [product]);

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
      setComment("");
      setQuantity(1);
      setFlavorSearch("");
      setIsImageLoading(true);
    }
  }, [isOpen]);

  const computedPrice = useMemo(() => {
    if (!product) return 0;
    const borderPrice = selectedBorder?.price
      ? (typeof selectedBorder.price === "number" ? selectedBorder.price : Number(selectedBorder.price || 0))
      : 0;
    const prodPrice = typeof product.price === "number" ? product.price : Number(product.price || 0);

    if (fraction === "inteira" || !flavor2) {
      return prodPrice + borderPrice;
    }

    const flav2Price = typeof flavor2.price === "number" ? flavor2.price : Number(flavor2.price || 0);
    const basePrice =
      pizzaPricingRule === "MAX"
        ? Math.max(prodPrice, flav2Price)
        : (prodPrice + flav2Price) / 2;

    return basePrice + borderPrice;
  }, [product, flavor2, fraction, selectedBorder, pizzaPricingRule]);

  const primaryProduct = useMemo(() => {
    if (!product) return null;
    if (fraction === "inteira" || !flavor2) return product;
    const prodPrice = typeof product.price === "number" ? product.price : Number(product.price || 0);
    const flav2Price = typeof flavor2.price === "number" ? flavor2.price : Number(flavor2.price || 0);
    return pizzaPricingRule === "MAX" && flav2Price > prodPrice ? flavor2 : product;
  }, [product, flavor2, fraction, pizzaPricingRule]);

  const otherFlavors = useMemo(() => {
    if (!product) return [];
    return categoryProducts.filter((p) => p.id !== product.id);
  }, [categoryProducts, product]);

  const filteredOtherFlavors = useMemo(() => {
    if (!flavorSearch.trim()) return otherFlavors;
    const lower = flavorSearch.toLowerCase();
    return otherFlavors.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.description && p.description.toLowerCase().includes(lower)),
    );
  }, [otherFlavors, flavorSearch]);

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

    const noteParts: string[] = [];
    if (fraction === "meio-a-meio" && flavor2) {
      noteParts.push(`Meio a meio: ${product.name} / ${flavor2.name}`);
    }
    if (comment.trim()) {
      noteParts.push(noteParts.length > 0 ? `Obs: ${comment.trim()}` : comment.trim());
    }
    const notes = noteParts.length > 0 ? noteParts.join(" | ") : undefined;

    const optionsForCart = selectedBorder
      ? [
          {
            id: selectedBorder.id,
            name: selectedBorder.name,
            price:
              typeof selectedBorder.price === "number"
                ? selectedBorder.price
                : Number(selectedBorder.price || 0),
          },
        ]
      : [];

    const commentHash = comment.trim()
      ? `-${comment.trim().length}-${comment.trim().slice(0, 5).replace(/\s/g, "")}`
      : "";
    const cartItemId = `pizza-${primaryProduct.id}-${fraction}-${flavor2?.id ?? ""}-${selectedBorder?.id ?? ""}${commentHash}`;

    addProduct({
      id: primaryProduct.id,
      name: `Pizza — ${flavorLabel}`,
      price: computedPrice - (selectedBorder?.price ? Number(selectedBorder.price) : 0),
      imageUrl: primaryProduct.imageUrl,
      cartItemId,
      quantity,
      notes,
      selectedOptions: optionsForCart,
    });

    onOpenChange(false);
    toggleCart();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[450px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {product?.name ?? "Detalhes da Pizza"}
          </SheetTitle>
          <SheetDescription>
            {`Personalize sua pizza ${product?.name ?? ""}`}
          </SheetDescription>
        </SheetHeader>

        {!product ? (
          <ProductSheetSkeleton />
        ) : (
          <div className="flex h-full flex-col overflow-hidden bg-white">
            {/* Top Product Image */}
            <div className="relative shrink-0 bg-slate-100">
              <div className="relative h-[160px] w-full sm:h-[200px]">
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
            </div>

            {/* Details & Options */}
            <div className="flex flex-auto flex-col overflow-hidden">
              <div className="flex flex-auto flex-col overflow-hidden p-4 sm:p-6">
                {/* Header (Restaurant, Product Name, Price, Quantity) */}
                <div className="shrink-0">
                  {restaurantInfo && (
                    <div className="flex items-center gap-1.5">
                      <Image
                        src={restaurantInfo.avatarImageUrl}
                        alt={restaurantInfo.name}
                        width={18}
                        height={18}
                        className="rounded-full ring-2 ring-white"
                      />
                      <p className="text-sm font-medium text-muted-foreground">
                        {restaurantInfo.name}
                      </p>
                    </div>
                  )}

                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {product.name}
                  </h2>

                  <div className="mt-3 flex items-center justify-between sm:mt-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">
                        {formatCurrency(computedPrice)}
                      </h3>
                      {fraction === "meio-a-meio" && flavor2 && (
                        <p className="text-[11px] text-muted-foreground">
                          {pizzaPricingRule === "MAX"
                            ? "Preço do sabor mais caro"
                            : "Preço médio dos sabores"}
                        </p>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-3 text-center"
                      role="group"
                      aria-label="Seleção de quantidade"
                    >
                      <Button
                        variant="outline"
                        className="h-9 w-9 rounded-[14px] border-slate-200 shadow-sm transition hover:bg-slate-50 active:scale-95"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Diminuir quantidade"
                      >
                        <ChevronLeftIcon size={18} aria-hidden="true" />
                      </Button>
                      <p className="w-6 text-lg font-semibold" aria-live="polite">
                        {quantity}
                      </p>
                      <Button
                        variant="destructive"
                        className="h-9 w-9 rounded-[14px] shadow-md shadow-destructive/10 transition hover:scale-105 active:scale-95"
                        onClick={() => setQuantity((q) => q + 1)}
                        aria-label="Aumentar quantidade"
                      >
                        <ChevronRightIcon size={18} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>

                <ScrollArea className="mt-4 flex-auto pr-2">
                  {/* Sobre */}
                  {product.description && (
                    <div className="space-y-1.5">
                      <h4 className="text-base font-semibold text-slate-950">Sobre</h4>
                      <p className="text-sm font-medium leading-relaxed text-slate-500">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Ingredientes */}
                  {product.ingredients && product.ingredients.length > 0 && (
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <ChefHatIcon size={16} className="text-slate-800" />
                        <h4 className="text-base font-semibold text-slate-950">
                          Ingredientes
                        </h4>
                      </div>
                      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                        {product.ingredients.map((ingredient) => (
                          <li
                            key={ingredient}
                            className="flex items-center gap-2 text-sm font-medium text-slate-500"
                          >
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opção: Quantos Sabores */}
                  <div className="mt-5 rounded-xl">
                    <div className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            Quantos sabores?
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CircleCheckIcon size={10} aria-hidden="true" />
                            Obrigatório
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Selecione 1 opção</p>
                      </div>
                    </div>

                    <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setFraction("inteira");
                          setFlavor2(null);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-3 text-left transition-colors ${
                          fraction === "inteira"
                            ? "bg-destructive/5"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              fraction === "inteira"
                                ? "text-destructive"
                                : "text-slate-900"
                            }`}
                          >
                            Pizza Inteira
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            1 sabor ({product.name})
                          </p>
                        </div>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            fraction === "inteira"
                              ? "border-destructive"
                              : "border-slate-300"
                          }`}
                        >
                          {fraction === "inteira" && (
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          )}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFraction("meio-a-meio")}
                        className={`flex w-full items-center justify-between px-3 py-3 text-left transition-colors ${
                          fraction === "meio-a-meio"
                            ? "bg-destructive/5"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              fraction === "meio-a-meio"
                                ? "text-destructive"
                                : "text-slate-900"
                            }`}
                          >
                            Meio a Meio
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            2 sabores diferentes
                          </p>
                        </div>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            fraction === "meio-a-meio"
                              ? "border-destructive"
                              : "border-slate-300"
                          }`}
                        >
                          {fraction === "meio-a-meio" && (
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 1º Sabor (visível quando Meio a Meio) */}
                  {fraction === "meio-a-meio" && (
                    <div className="mt-4 rounded-xl">
                      <div className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              1º Sabor
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CircleCheckIcon size={10} aria-hidden="true" />
                              Definido
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Sabor selecionado</p>
                        </div>
                      </div>

                      <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 bg-destructive/5 px-3 py-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-destructive">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-xs text-destructive font-medium">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-destructive">
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2º Sabor (quando Meio a Meio) */}
                  {fraction === "meio-a-meio" && (
                    <div className="mt-4 rounded-xl">
                      <div className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              2º Sabor
                            </p>
                            {flavor2 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CircleCheckIcon size={10} aria-hidden="true" />
                                Selecionado
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {pizzaPricingRule === "MAX"
                              ? "Preço pelo sabor de maior valor"
                              : "Preço calculado pela média dos sabores"}
                          </p>
                        </div>
                      </div>

                      {otherFlavors.length > 3 && (
                        <div className="relative mt-2">
                          <SearchIcon
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="search"
                            placeholder="Buscar 2º sabor..."
                            value={flavorSearch}
                            onChange={(e) => setFlavorSearch(e.target.value)}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-0"
                          />
                        </div>
                      )}

                      <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-100">
                        {loadingProducts ? (
                          <div className="space-y-2 p-3">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-12 animate-pulse rounded-lg bg-slate-100"
                              />
                            ))}
                          </div>
                        ) : filteredOtherFlavors.length === 0 ? (
                          <p className="p-4 text-center text-sm text-slate-400">
                            {flavorSearch
                              ? "Nenhum sabor encontrado."
                              : "Nenhum outro sabor disponível nesta categoria."}
                          </p>
                        ) : (
                          filteredOtherFlavors.map((p) => {
                            const isSelected = flavor2?.id === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFlavor2(isSelected ? null : p)}
                                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                                  isSelected
                                    ? "bg-destructive/5"
                                    : "bg-white hover:bg-slate-50"
                                }`}
                              >
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100">
                                  <Image
                                    src={p.imageUrl}
                                    alt={p.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-sm font-semibold ${
                                      isSelected
                                        ? "text-destructive"
                                        : "text-slate-900"
                                    }`}
                                  >
                                    {p.name}
                                  </p>
                                  {p.description && (
                                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                      {p.description}
                                    </p>
                                  )}
                                  <p
                                    className={`mt-0.5 text-xs font-medium ${
                                      isSelected
                                        ? "text-destructive"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {formatCurrency(p.price)}
                                  </p>
                                </div>
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    isSelected
                                      ? "border-destructive"
                                      : "border-slate-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                                  )}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grupo: Borda Recheada */}
                  {borderOptionGroup && borderOptionGroup.options.length > 0 && (
                    <div className="mt-4 rounded-xl">
                      <div className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Borda Recheada
                          </p>
                          <p className="text-xs text-slate-500">
                            Opcional • Selecione até 1 opção
                          </p>
                        </div>
                      </div>

                      <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedBorder(null)}
                          className={`flex w-full items-center justify-between px-3 py-3 text-left transition-colors ${
                            !selectedBorder
                              ? "bg-destructive/5"
                              : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-semibold ${
                                !selectedBorder
                                  ? "text-destructive"
                                  : "text-slate-900"
                              }`}
                            >
                              Sem borda
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Massa tradicional sem recheio
                            </p>
                          </div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              !selectedBorder
                                ? "border-destructive"
                                : "border-slate-300"
                            }`}
                          >
                            {!selectedBorder && (
                              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                            )}
                          </span>
                        </button>

                        {borderOptionGroup.options.map((opt) => {
                          const isSelected = selectedBorder?.id === opt.id;
                          const optPrice = Number(opt.price || 0);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setSelectedBorder(isSelected ? null : opt)
                              }
                              className={`flex w-full items-center justify-between px-3 py-3 text-left transition-colors ${
                                isSelected
                                  ? "bg-destructive/5"
                                  : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-semibold ${
                                    isSelected
                                      ? "text-destructive"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {opt.name}
                                </p>
                                {opt.description && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {opt.description}
                                  </p>
                                )}
                                {optPrice > 0 && (
                                  <p
                                    className={`mt-0.5 text-xs font-medium ${
                                      isSelected
                                        ? "text-destructive"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    + {formatCurrency(optPrice)}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  isSelected
                                    ? "border-destructive"
                                    : "border-slate-300"
                                }`}
                              >
                                {isSelected && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  <div className="mt-5 space-y-2 pb-6">
                    <Label
                      htmlFor="pizza-comment"
                      className="text-base font-semibold text-slate-950"
                    >
                      Observações
                    </Label>
                    <Textarea
                      id="pizza-comment"
                      placeholder="Ex: tirar cebola, massa bem assada, etc."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={200}
                      className="min-h-[80px] rounded-xl border-slate-200 text-sm focus-visible:ring-destructive"
                    />
                    <p className="text-right text-xs text-slate-400">
                      {comment.length}/200
                    </p>
                  </div>
                </ScrollArea>
              </div>

              {/* Footer */}
              <div
                className="shrink-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm sm:p-6 sm:pt-4"
                style={{
                  paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
                }}
              >
                <div className="mx-auto max-w-screen-xl space-y-2 lg:max-w-none">
                  {!isOpenRestaurant && (
                    <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center text-sm font-semibold text-rose-600">
                      O restaurante está fechado no momento.
                    </p>
                  )}
                  {isOutOfStock && (
                    <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-600">
                      Produto temporariamente esgotado.
                    </p>
                  )}
                  {isOutsideAvailableHours && (() => {
                    const p = product as typeof product & {
                      availableFrom?: string | null;
                      availableTo?: string | null;
                    };
                    return (
                      <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center text-sm font-semibold text-blue-600">
                        Disponível apenas das {p.availableFrom} às {p.availableTo}
                      </p>
                    );
                  })()}
                  {fraction === "meio-a-meio" && !flavor2 && (
                    <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700">
                      Selecione o 2º sabor da pizza para continuar.
                    </p>
                  )}
                  <Button
                    className="h-12 w-full rounded-xl text-base font-bold shadow-lg shadow-destructive/20 transition hover:scale-[1.01] active:scale-[0.99]"
                    onClick={handleAddToCart}
                    disabled={
                      !isOpenRestaurant ||
                      isOutOfStock ||
                      isOutsideAvailableHours ||
                      (fraction === "meio-a-meio" && !flavor2)
                    }
                  >
                    Adicionar à sacola • {formatCurrency(computedPrice * quantity)}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PizzaBuilderSheet;
