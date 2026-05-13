"use client";

import type {
  MenuCategory,
  Product,
  RestaurantComCategoriasEProdutos,
} from "@fsw/db";
import { ClockIcon } from "lucide-react";
import Image from "next/image";
import { useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/helpers/format-currency";

import { CartContext } from "../contexts/cart";
import CartPanel from "./cart-panel";
import CartSheet from "./cart-sheet";
import Products from "./products";

interface RestaurantCategoriesProps {
  restaurant: RestaurantComCategoriasEProdutos;
}

type MenuCategoriesWithProducts = MenuCategory & { products: Product[] };

const RestaurantCategories = ({ restaurant }: RestaurantCategoriesProps) => {
  const firstCategory = restaurant.menuCategories[0] ?? null;
  const [selectedCategory, setSelectedCategory] =
    useState<MenuCategoriesWithProducts | null>(firstCategory);
  const { products, total, toggleCart, totalQuantity } = useContext(CartContext);

  const handleCategoryClick = (category: MenuCategoriesWithProducts) => {
    setSelectedCategory(category);
  };

  if (!selectedCategory) {
    return (
      <div className="relative z-20 mt-[-1.5rem] rounded-t-[2rem] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma categoria disponível no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 mt-[-1.5rem] rounded-t-[2rem] bg-white">
      <div className="mx-auto max-w-[1600px] px-5 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
        <div className="flex flex-col gap-5 rounded-[32px] bg-slate-50 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Image
              src={restaurant.avatarImageUrl}
              alt={restaurant.name}
              height={56}
              width={56}
              className="rounded-2xl"
            />
            <div className="space-y-2">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {restaurant.name}
                </h2>
                <p className="max-w-2xl text-sm text-slate-600">
                  {restaurant.description}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <ClockIcon size={12} />
                Aberto e pronto para receber pedidos
              </div>
            </div>
          </div>

          <div className="hidden lg:block lg:w-[340px]">
            <div className="rounded-[28px] border bg-white px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Sacola atual
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold text-slate-950">
                    {formatCurrency(total)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {totalQuantity === 0
                      ? "Nenhum item selecionado"
                      : `${String(totalQuantity)} ${totalQuantity === 1 ? "item" : "itens"} na sacola`}
                  </p>
                </div>
                <Button
                  className="rounded-full"
                  disabled={products.length === 0}
                  onClick={toggleCart}
                >
                  Ver detalhes
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 lg:hidden">
          <ScrollArea className="w-full">
            <div className="flex w-max gap-3 pb-2">
              {restaurant.menuCategories.map((category) => {
                const isSelected = selectedCategory.id === category.id;

                return (
                  <Button
                    onClick={() => handleCategoryClick(category)}
                    key={category.id}
                    variant={isSelected ? "default" : "secondary"}
                    size="sm"
                    className="rounded-full px-4"
                  >
                    {category.name}
                  </Button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_340px] xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-3 rounded-[32px] border bg-white p-4 shadow-sm">
              <div className="px-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Categorias
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  Navegue pelo cardápio
                </h3>
              </div>

              <div className="space-y-2">
                {restaurant.menuCategories.map((category) => {
                  const isSelected = selectedCategory.id === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${isSelected ? "bg-slate-950 text-white shadow-lg" : "bg-slate-50 text-slate-800 hover:bg-slate-100"}`}
                    >
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p
                          className={`text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}
                        >
                          {String(category.products.length)}{" "}
                          {category.products.length === 1 ? "produto" : "produtos"}
                        </p>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-emerald-400" : "bg-slate-300"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Categoria em destaque
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {selectedCategory.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {String(selectedCategory.products.length)}{" "}
                    {selectedCategory.products.length === 1 ? "opção disponível" : "opções disponíveis"}
                  </p>
                </div>
              </div>
            </div>

            <Products products={selectedCategory.products} />
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <CartPanel />
            </div>
          </aside>
        </div>
      </div>

      {products.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t bg-white px-5 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] lg:hidden">
          <div>
            <p className="text-xs text-muted-foreground">Total do pedido</p>
            <p className="text-sm font-semibold">
              {formatCurrency(total)}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}
                / {String(totalQuantity)} {totalQuantity > 1 ? "itens" : "item"}
              </span>
            </p>
          </div>
          <Button className="rounded-full" onClick={toggleCart}>
            Ver sacola
          </Button>
        </div>
      )}

      <CartSheet />
    </div>
  );
};

export default RestaurantCategories;
