import { and, asc, eq } from "drizzle-orm";

import { db } from "../client";
import { restaurantPrintersTable } from "../schema";
import type { NewRestaurantPrinter, RestaurantPrinter } from "../types";
import { buscarRestaurantePorSlug } from "./index";

export const buscarImpressorasPorSlug = async (
  slug: string,
): Promise<RestaurantPrinter[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(restaurantPrintersTable)
    .where(eq(restaurantPrintersTable.restaurantId, restaurant.id))
    .orderBy(asc(restaurantPrintersTable.createdAt));
};

export const buscarImpressorasAtivasPorSlug = async (
  slug: string,
): Promise<RestaurantPrinter[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(restaurantPrintersTable)
    .where(
      and(
        eq(restaurantPrintersTable.restaurantId, restaurant.id),
        eq(restaurantPrintersTable.isActive, true),
      ),
    )
    .orderBy(asc(restaurantPrintersTable.createdAt));
};

export const buscarImpressoraPorId = async (
  id: string,
  restaurantId: string,
): Promise<RestaurantPrinter | null> => {
  const [printer] = await db
    .select()
    .from(restaurantPrintersTable)
    .where(
      and(
        eq(restaurantPrintersTable.id, id),
        eq(restaurantPrintersTable.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  return printer || null;
};

export const criarImpressora = async (
  input: Omit<NewRestaurantPrinter, "id" | "createdAt" | "updatedAt">,
): Promise<RestaurantPrinter> => {
  const [printer] = await db
    .insert(restaurantPrintersTable)
    .values(input)
    .returning();

  if (!printer) {
    throw new Error("Falha ao cadastrar impressora.");
  }

  return printer;
};

export const atualizarImpressora = async (
  id: string,
  restaurantId: string,
  data: Partial<Omit<NewRestaurantPrinter, "id" | "restaurantId" | "createdAt" | "updatedAt">>,
): Promise<RestaurantPrinter> => {
  const [printer] = await db
    .update(restaurantPrintersTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(restaurantPrintersTable.id, id),
        eq(restaurantPrintersTable.restaurantId, restaurantId),
      ),
    )
    .returning();

  if (!printer) {
    throw new Error("Impressora não encontrada ou não atualizada.");
  }

  return printer;
};

export const alternarStatusImpressora = async (
  id: string,
  restaurantId: string,
  isActive: boolean,
): Promise<RestaurantPrinter> => {
  return atualizarImpressora(id, restaurantId, { isActive });
};

export const excluirImpressora = async (
  id: string,
  restaurantId: string,
): Promise<boolean> => {
  const res = await db
    .delete(restaurantPrintersTable)
    .where(
      and(
        eq(restaurantPrintersTable.id, id),
        eq(restaurantPrintersTable.restaurantId, restaurantId),
      ),
    )
    .returning();

  return res.length > 0;
};
