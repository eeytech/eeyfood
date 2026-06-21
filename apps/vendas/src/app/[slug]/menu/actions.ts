"use server";

import {
  buscarProdutoDoRestaurante,
  buscarProdutosPorCategoria,
  buscarRestaurantePorSlug,
  buscarUltimoPedidoPorTelefone,
  db,
  eq,
} from "@/lib/db";
import { diningTablesTable } from "@fsw/db";
import { notificarGarcom } from "@/lib/notificar-garcom";

export async function fetchProductWithOptions(slug: string, productId: string) {
  return buscarProdutoDoRestaurante({ slug, productId });
}

export async function fetchCategoryProductsAction(slug: string, categoryId: string) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return buscarProdutosPorCategoria(categoryId, restaurant.id);
}

export async function chamarGarcomAction(
  slug: string,
  tableId: string,
): Promise<{ success: boolean; error?: string }> {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return { success: false, error: "Restaurante não encontrado." };

  const [table] = await db
    .select({ id: diningTablesTable.id, name: diningTablesTable.name })
    .from(diningTablesTable)
    .where(eq(diningTablesTable.id, tableId))
    .limit(1);

  if (!table) return { success: false, error: "Mesa não encontrada." };

  await notificarGarcom({
    restaurantSlug: slug,
    tableId: table.id,
    tableName: table.name,
  });

  return { success: true };
}

export async function fetchLastOrderAction(slug: string, customerPhone: string) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;
  return buscarUltimoPedidoPorTelefone(customerPhone, restaurant.id);
}
