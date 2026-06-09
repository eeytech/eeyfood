"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";

import { db, productsTable, restaurantsTable, menuCategoriesTable } from "@fsw/db";

export const getUpsellRecommendations = async (slug: string, cartProductIds: string[]) => {
  const restaurant = await db.query.restaurantsTable.findFirst({
    where: eq(restaurantsTable.slug, slug),
  });

  if (!restaurant) return [];

  // Categorias que geralmente são de upselling (Bebidas, Sobremesas, Acompanhamentos)
  const upsellCategories = ["bebidas", "sobremesas", "acompanhamentos", "entradas", "drinks", "sobremesa", "bebida"];

  // 1. Buscar categorias do restaurante que batem com os nomes acima
  const categories = await db.query.menuCategoriesTable.findMany({
    where: and(
      eq(menuCategoriesTable.restaurantId, restaurant.id),
      eq(menuCategoriesTable.isActive, true)
    ),
  });

  const targetCategoryIds = categories
    .filter(cat => upsellCategories.some(name => cat.name.toLowerCase().includes(name)))
    .map(cat => cat.id);

  if (targetCategoryIds.length === 0) {
    // Se não achar categorias específicas, pega os produtos mais vendidos/populares (simulado por displayOrder)
    return db.query.productsTable.findMany({
      where: and(
        eq(productsTable.restaurantId, restaurant.id),
        eq(productsTable.isActive, true),
        cartProductIds.length > 0 ? notInArray(productsTable.id, cartProductIds) : undefined
      ),
      limit: 4,
      orderBy: (products, { asc }) => [asc(products.price)],
    });
  }

  // 2. Buscar produtos nessas categorias que não estão no carrinho
  const recommendations = await db.query.productsTable.findMany({
    where: and(
      eq(productsTable.restaurantId, restaurant.id),
      eq(productsTable.isActive, true),
      inArray(productsTable.menuCategoryId, targetCategoryIds),
      cartProductIds.length > 0 ? notInArray(productsTable.id, cartProductIds) : undefined
    ),
    limit: 5,
  });

  return recommendations;
};
