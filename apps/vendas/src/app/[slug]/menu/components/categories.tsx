"use client";

import type {
  MenuCategory,
  Product,
  RestaurantComCategoriasEProdutos,
} from "@fsw/db";
import { ClockIcon, SearchIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import { useContext, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/helpers/format-currency";
import {
  getNextOpeningTime,
  isRestaurantOpen,
} from "@/helpers/restaurant-status";
import type { ProductComRestaurante } from "@/lib/db";

import { CartContext } from "../contexts/cart";
import { useIntersectionObserver } from "../hooks/use-intersection-observer";
import CartPanel from "./cart-panel";
import CartSheet from "./cart-sheet";
import ProductSearch from "./product-search";
import ProductSheet from "./product-sheet";
import Products from "./products";

interface RestaurantCategoriesProps {
  restaurant: RestaurantComCategoriasEProdutos & {
    rating: number;
    ratingCount: number;
  };
}

type MenuCategoryWithProducts = MenuCategory & { products: Product[] };

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="rounded bg-amber-200 px-0.5 text-slate-950 not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SearchEmptyState() {
  return (
    <div
      className="rounded-[32px] border border-dashed bg-slate-50 px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <SearchIcon size={24} className="text-slate-400" aria-hidden="true" />
      </div>
      <p className="text-base font-medium text-slate-950">
        Ops! Não encontramos nenhum item com esse nome.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Tente outro termo ou navegue pelas categorias do cardápio.
      </p>
    </div>
  );
}

interface SearchProductCardProps {
  product: Product & { isBestseller?: boolean };
  restaurant: RestaurantComCategoriasEProdutos;
  query: string;
  onSelect: (product: ProductComRestaurante) => void;
}

function SearchProductCard({
  product,
  restaurant,
  query,
  onSelect,
}: SearchProductCardProps) {
  return (
    <button
      onClick={() => onSelect({ ...product, restaurant })}
      className="group flex flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
      aria-label={`Ver detalhes de ${product.name}`}
      role="listitem"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <Image
          src={product.imageUrl}
          alt=""
          fill
          className="object-contain p-4 transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold tracking-tight text-slate-950">
            <Highlight text={product.name} query={query} />
          </h3>
          <p className="line-clamp-3 text-xs leading-5 text-slate-600">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              A partir de
            </p>
            <p className="text-base font-semibold text-slate-950">
              {formatCurrency(product.price)}
            </p>
          </div>
          <span
            className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition group-hover:bg-primary"
            aria-hidden="true"
          >
            Ver produto
          </span>
        </div>
      </div>
    </button>
  );
}

const RestaurantCategories = ({ restaurant }: RestaurantCategoriesProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchProduct, setSelectedSearchProduct] =
    useState<ProductComRestaurante | null>(null);
  const { products, total, toggleCart, totalQuantity } =
    useContext(CartContext);

  const { isOpen, closeTime } = isRestaurantOpen(restaurant.status, restaurant.operatingHours);
  const nextOpening = getNextOpeningTime(restaurant.operatingHours);

  const categoryIds = useMemo(
    () => restaurant.menuCategories.map((c) => c.id),
    [restaurant.menuCategories],
  );

  const isSearchActive = searchQuery.trim().length > 0;
  const activeCategoryId = useIntersectionObserver(
    categoryIds,
    !isSearchActive,
  );

  const searchResults = useMemo<MenuCategoryWithProducts["products"]>(() => {
    if (!isSearchActive) return [];
    const q = searchQuery.toLowerCase();
    return restaurant.menuCategories.flatMap((cat) =>
      cat.products.filter((p) => p.name.toLowerCase().includes(q)),
    );
  }, [searchQuery, isSearchActive, restaurant.menuCategories]);

  const handleNavClick = (categoryId: string) => {
    document
      .getElementById(`category-${categoryId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (restaurant.menuCategories.length === 0) {
    return (
      <div className="relative z-20 mt-[-1.5rem] rounded-t-[2rem] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma categoria disponível no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 mt-[-1.5rem] rounded-t-[2rem] bg-white">
      <div className="mx-auto max-w-[1600px] px-5 py-4 pb-20 sm:px-6 lg:px-8 lg:py-6 lg:pb-6">
        {/* Restaurant info card */}
        <div className="flex flex-col gap-4 rounded-[32px] bg-slate-50 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Image
              src={restaurant.avatarImageUrl}
              alt={restaurant.name}
              height={48}
              width={48}
              className="rounded-xl"
            />
            <div className="space-y-1.5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {restaurant.name}
                  </h2>
                  {restaurant.ratingCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                      <StarIcon size={12} className="fill-amber-600" />
                      <span className="text-xs font-bold">
                        {restaurant.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="max-w-2xl text-xs text-slate-600">
                  {restaurant.description}
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-medium ${
                  isOpen
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <ClockIcon size={12} />
                {isOpen ? (
                  closeTime ? `Aberto • Fecha às ${closeTime}` : "Aberto e pronto para receber pedidos"
                ) : nextOpening ? (
                  `Fechado • Abre ${
                    nextOpening.dayOfWeek === new Date().getDay()
                      ? "às "
                      : [
                          "Domingo",
                          "Segunda",
                          "Terça",
                          "Quarta",
                          "Quinta",
                          "Sexta",
                          "Sábado",
                        ][nextOpening.dayOfWeek] + " às "
                  }${nextOpening.openTime}`
                ) : (
                  "Fechado no momento"
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:block lg:w-[320px]">
            <div className="rounded-[28px] border bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Pedido atual
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold text-slate-950">
                    {formatCurrency(total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalQuantity === 0
                      ? "Nenhum item selecionado"
                      : `${String(totalQuantity)} ${totalQuantity === 1 ? "item" : "itens"} no pedido`}
                  </p>
                </div>
                <Button
                  className="rounded-full h-9 text-sm"
                  disabled={products.length === 0}
                  onClick={toggleCart}
                >
                  Ver detalhes
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-5">
          <ProductSearch onSearchQueryChange={setSearchQuery} />
        </div>

        {/* Mobile category nav — sticky for scroll spy feedback */}
        <div className="sticky top-0 z-30 -mx-5 mt-4 bg-white px-5 pb-3 pt-2 shadow-[0_4px_12px_rgba(15,23,42,0.06)] sm:-mx-6 sm:px-6 lg:hidden">
          <ScrollArea className="w-full">
            <nav
              className="flex w-max gap-3 pb-1"
              aria-label="Categorias do cardápio"
            >
              {restaurant.menuCategories.map((category) => {
                const isActive =
                  !isSearchActive && activeCategoryId === category.id;

                return (
                  <Button
                    onClick={() => handleNavClick(category.id)}
                    key={category.id}
                    variant={isActive ? "default" : "secondary"}
                    size="sm"
                    className="rounded-full px-4"
                    aria-current={isActive ? "page" : undefined}
                  >
                    {category.name}
                  </Button>
                );
              })}
            </nav>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Main three-column layout */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_340px] xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          {/* Desktop sidebar nav */}
          <aside className="hidden lg:block">
            <nav
              className="sticky top-4 space-y-2 rounded-[32px] border bg-white p-3 shadow-sm"
              aria-label="Categorias do cardápio"
            >
              <div className="px-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Categorias
                </p>
                <h3 className="mt-1.5 text-base font-semibold text-slate-950">
                  Navegue pelo cardápio
                </h3>
              </div>

              <div className="space-y-1.5">
                {restaurant.menuCategories.map((category) => {
                  const isActive =
                    !isSearchActive && activeCategoryId === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleNavClick(category.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition ${
                        isActive
                          ? "bg-slate-950 text-white shadow-lg"
                          : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p
                          className={`text-[10px] ${isActive ? "text-slate-300" : "text-slate-500"}`}
                        >
                          {String(category.products.length)}{" "}
                          {category.products.length === 1
                            ? "produto"
                            : "produtos"}
                        </p>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-300"}`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <section className="min-w-0 space-y-8">
            {isSearchActive ? (
              <>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Resultados da busca
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    &ldquo;{searchQuery}&rdquo;
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {searchResults.length === 0
                      ? "Nenhum resultado encontrado"
                      : `${String(searchResults.length)} ${searchResults.length === 1 ? "resultado" : "resultados"}`}
                  </p>
                </div>

                {searchResults.length === 0 ? (
                  <SearchEmptyState />
                ) : (
                  <div
                    className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
                    role="list"
                  >
                    {searchResults.map((product) => (
                      <SearchProductCard
                        key={product.id}
                        product={product}
                        restaurant={restaurant}
                        query={searchQuery}
                        onSelect={setSelectedSearchProduct}
                      />
                    ))}
                  </div>
                )}

                <ProductSheet
                  product={selectedSearchProduct}
                  isOpen={!!selectedSearchProduct}
                  onOpenChange={(open) =>
                    !open && setSelectedSearchProduct(null)
                  }
                />
              </>
            ) : (
              restaurant.menuCategories.map((category) => (
                <div
                  key={category.id}
                  id={`category-${category.id}`}
                  className="scroll-mt-16 space-y-4"
                >
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {category.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {String(category.products.length)}{" "}
                      {category.products.length === 1
                        ? "opção disponível"
                        : "opções disponíveis"}
                    </p>
                  </div>
                  <Products
                    products={category.products}
                    restaurant={restaurant}
                  />
                </div>
              ))
            )}
          </section>

          {/* Desktop cart panel */}
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <CartPanel restaurant={restaurant} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile floating cart bar */}
      {products.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t bg-white px-5 py-2.5 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] lg:hidden">
          <div>
            <p className="text-[10px] text-muted-foreground">Total do pedido</p>
            <p className="text-sm font-semibold">
              {formatCurrency(total)}
              <span className="text-[10px] font-normal text-muted-foreground">
                {" "}
                / {String(totalQuantity)}{" "}
                {totalQuantity > 1 ? "itens" : "item"}
              </span>
            </p>
          </div>
          <Button className="rounded-full h-9 text-sm" onClick={toggleCart}>
            Ver sacola
          </Button>
        </div>
      )}

      <CartSheet restaurant={restaurant} />
    </div>
  );
};

export default RestaurantCategories;
