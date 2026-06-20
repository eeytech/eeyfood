"use client";

import {
  ChefHatIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import Image from "next/image";
import { useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
  const [optionCounts, setOptionCounts] = useState<Record<string, Record<string, number>>>({});
  const [comment, setComment] = useState<string>("");
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [shakingGroupId, setShakingGroupId] = useState<string | null>(null);
  const groupRefs = useRef<Map<string, HTMLElement>>(new Map());
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const optionGroups = useMemo(() => product.optionGroups || [], [product.optionGroups]);
  const showOptionImages = product.restaurant.showOptionImages;

  const { isOpen } = isRestaurantOpen(
    product.restaurant.status,
    product.restaurant.operatingHours,
  );

  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;

  const isGroupExpanded = (groupId: string) =>
    expandedGroups[groupId] !== false;

  const toggleGroup = (groupId: string) =>
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !isGroupExpanded(groupId) }));

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return optionGroups;
    const lower = searchTerm.toLowerCase();
    return optionGroups
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (o) =>
            o.name.toLowerCase().includes(lower) ||
            (o.description?.toLowerCase().includes(lower) ?? false),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [optionGroups, searchTerm]);

  const handleDecreaseQuantity = () => setQuantity((prev) => (prev === 1 ? 1 : prev - 1));
  const handleIncreaseQuantity = () => setQuantity((prev) => prev + 1);

  const handleRadioToggle = (groupId: string, optionId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [groupId]: [optionId] }));
  };

  const handleCounterChange = (groupId: string, optionId: string, delta: number, maxOptions: number) => {
    setOptionCounts((prev) => {
      const groupCounts = prev[groupId] ?? {};
      const current = groupCounts[optionId] ?? 0;
      const newCount = Math.max(0, current + delta);

      const totalSelected = Object.values({ ...groupCounts, [optionId]: newCount }).reduce(
        (sum, n) => sum + n,
        0,
      );
      if (totalSelected > maxOptions) return prev;

      const updated = { ...groupCounts, [optionId]: newCount };
      const selectedIds = Object.entries(updated)
        .filter(([, n]) => n > 0)
        .map(([id]) => id);

      setSelectedOptions((s) => ({ ...s, [groupId]: selectedIds }));
      return { ...prev, [groupId]: updated };
    });
  };

  const selectedOptionsList = useMemo(() => {
    const list: (ProductOption & { _count?: number })[] = [];
    Object.entries(selectedOptions).forEach(([groupId, ids]) => {
      ids.forEach((id) => {
        const option = optionGroups.flatMap((g) => g.options).find((o) => o.id === id);
        if (option) {
          const count = optionCounts[groupId]?.[id] ?? 1;
          for (let i = 0; i < count; i++) {
            list.push(option);
          }
        }
      });
    });
    return list;
  }, [selectedOptions, optionCounts, optionGroups]);

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
    // Find the first required group where the customer hasn't met the minimum selection
    const firstIncompleteGroup = optionGroups.find((group) => {
      const selected = selectedOptions[group.id] || [];
      return group.minOptions > 0 && selected.length < group.minOptions;
    });

    if (firstIncompleteGroup) {
      toast.warning(`Selecione uma opção em "${firstIncompleteGroup.name}"`);

      // Clear any active search so the group becomes visible, then ensure it's expanded
      setSearchTerm("");
      setExpandedGroups((prev) => ({ ...prev, [firstIncompleteGroup.id]: true }));

      // Scroll to the group after it's expanded (small delay lets React re-render first)
      const el = groupRefs.current.get(firstIncompleteGroup.id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
      }

      // Trigger the shake animation, then clear it once the animation finishes
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      setShakingGroupId(firstIncompleteGroup.id);
      shakeTimeoutRef.current = setTimeout(() => setShakingGroupId(null), 700);
      return;
    }

    const sortedOptionIds = selectedOptionsList.map((o) => o.id).sort();
    const commentHash = comment
      ? `-${comment.length}-${comment.slice(0, 5).replace(/\s/g, "")}`
      : "";
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
      {/* LEFT COLUMN — product image (desktop only: sticky) */}
      {showImage && (
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
      )}

      {/* RIGHT COLUMN — scrollable content */}
      <div className="flex flex-auto flex-col overflow-hidden">
        <div className="flex flex-auto flex-col overflow-hidden p-4 sm:p-6">
          {/* Header */}
          <div className="shrink-0">
            <div className="flex items-center gap-1.5">
              <Image
                src={product.restaurant.avatarImageUrl}
                alt={product.restaurant.name}
                width={18}
                height={18}
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
          </div>

          <ScrollArea className="mt-4 flex-auto pr-2">
            {/* Sobre */}
            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-slate-950">Sobre</h4>
              <p className="text-sm font-medium leading-relaxed text-slate-500">
                {product.description}
              </p>
            </div>

            {/* Ingredientes */}
            {product.ingredients.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2">
                  <ChefHatIcon size={16} className="text-slate-800" />
                  <h4 className="text-base font-semibold text-slate-950">Ingredientes</h4>
                </div>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient} className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Search bar — only when there are option groups */}
            {optionGroups.length > 0 && (
              <div className="relative mt-5">
                <SearchIcon
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  placeholder="Buscar adicional..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-0"
                />
              </div>
            )}

            {/* Option groups */}
            {filteredGroups.map((group) => {
              const isRadio = group.maxOptions === 1;
              const expanded = isGroupExpanded(group.id);
              const groupSelectedCount = (selectedOptions[group.id] || []).length;
              const isGroupComplete = group.minOptions > 0 && groupSelectedCount >= group.minOptions;
              const isShaking = shakingGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className={`mt-4 rounded-xl ${isShaking ? "animate-shake" : ""}`}
                  ref={(el) => {
                    if (el) groupRefs.current.set(group.id, el);
                    else groupRefs.current.delete(group.id);
                  }}
                >
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left transition hover:bg-slate-200 ${
                      isShaking ? "bg-amber-100" : "bg-slate-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                        {group.minOptions > 0 && (
                          isGroupComplete ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CircleCheckIcon size={10} aria-hidden="true" />
                              Obrigatório
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              Obrigatório
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {isRadio ? "Selecione 1 opção" : `Selecione até ${group.maxOptions} opções`}
                      </p>
                    </div>
                    {expanded
                      ? <ChevronUpIcon size={16} className="shrink-0 text-slate-500" />
                      : <ChevronDownIcon size={16} className="shrink-0 text-slate-500" />
                    }
                  </button>

                  {/* Options list */}
                  {expanded && (
                    <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-100">
                      {group.options.map((option: ProductOption) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(option.id);
                        const count = optionCounts[group.id]?.[option.id] ?? 0;

                        return (
                          <div
                            key={option.id}
                            className={`flex items-center gap-3 px-3 py-3 transition-colors ${
                              isSelected ? "bg-destructive/5" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            {/* Option thumbnail */}
                            {showOptionImages && option.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={option.imageUrl}
                                alt={option.name}
                                className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-cover"
                              />
                            )}

                            {/* Name + description */}
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold ${isSelected ? "text-destructive" : "text-slate-900"}`}>
                                {option.name}
                              </p>
                              {option.description && (
                                <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                              )}
                              {option.price > 0 && (
                                <p className={`mt-0.5 text-xs font-medium ${isSelected ? "text-destructive" : "text-slate-500"}`}>
                                  + {formatCurrency(option.price)}
                                </p>
                              )}
                            </div>

                            {/* Selector */}
                            {isRadio ? (
                              <button
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => handleRadioToggle(group.id, option.id)}
                                className="shrink-0"
                              >
                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
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
                            ) : (
                              <div className="flex shrink-0 items-center gap-2">
                                {count > 0 && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 rounded-full border-slate-300"
                                      onClick={() => handleCounterChange(group.id, option.id, -1, group.maxOptions)}
                                      aria-label={`Remover ${option.name}`}
                                    >
                                      <MinusIcon size={12} />
                                    </Button>
                                    <span className="w-4 text-center text-sm font-semibold text-destructive">
                                      {count}
                                    </span>
                                  </>
                                )}
                                <Button
                                  type="button"
                                  variant={isSelected ? "destructive" : "outline"}
                                  size="icon"
                                  className="h-7 w-7 rounded-full"
                                  onClick={() => handleCounterChange(group.id, option.id, 1, group.maxOptions)}
                                  aria-label={`Adicionar ${option.name}`}
                                  disabled={
                                    Object.values(optionCounts[group.id] ?? {}).reduce((s, n) => s + n, 0) >= group.maxOptions &&
                                    count === 0
                                  }
                                >
                                  {isSelected ? <CircleCheckIcon size={12} /> : <PlusIcon size={12} />}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Search with no results */}
            {searchTerm.trim() && filteredGroups.length === 0 && (
              <p className="mt-6 text-center text-sm text-slate-400">
                Nenhum adicional encontrado para &ldquo;{searchTerm}&rdquo;.
              </p>
            )}

            {/* Observações */}
            <div className="mt-5 space-y-2 pb-48 lg:pb-6">
              <Label htmlFor="comment" className="text-base font-semibold text-slate-950">
                Observações
              </Label>
              <Textarea
                id="comment"
                placeholder="Ex: tirar cebola, ponto da carne, etc."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={200}
                className="min-h-[80px] rounded-xl border-slate-200 text-sm focus-visible:ring-destructive"
              />
              <p className="text-right text-xs text-slate-400">{comment.length}/200</p>
            </div>
          </ScrollArea>
        </div>

        {/* FOOTER — fixed on mobile, inline on desktop */}
        <div
          className="fixed bottom-0 left-0 w-full border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm lg:relative lg:border-none lg:bg-transparent lg:p-6 lg:pt-0"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto max-w-screen-xl space-y-2 lg:max-w-none">
            {!isOpen && (
              <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center text-sm font-semibold text-rose-600">
                O restaurante está fechado no momento.
              </p>
            )}
            {isOutOfStock && (
              <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-600">
                Produto temporariamente esgotado.
              </p>
            )}
            <Button
              className="h-12 w-full rounded-xl text-base font-bold shadow-lg shadow-destructive/20 transition hover:scale-[1.01] active:scale-[0.99]"
              onClick={handleAddToCart}
              disabled={!isOpen || isOutOfStock}
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
