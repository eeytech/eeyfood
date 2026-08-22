"use server";

import {
  buscarRestaurantePorSlug,
  db,
  diningTablesTable,
  eq,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getBooleanValue,
  getNumberValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const tableSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da mesa."),
  seats: z.number().int().min(1, "Informe a capacidade da mesa."),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    throw new Error("Restaurante não encontrado.");
  }
  return restaurant;
};

export const createTableAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const parsedData = tableSchema.safeParse({
    name: getStringValue(formData.get("name")),
    seats: getNumberValue(formData.get("seats")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsedData.error.flatten()));
  }

  await db.insert(diningTablesTable).values({
    ...parsedData.data,
    restaurantId: restaurant.id,
  });

  revalidatePath(`/${slug}/mesas`);
};

export const updateTableAction = async (slug: string, formData: FormData) => {
  await getRestaurantOrThrow(slug);
  const tableId = getStringValue(formData.get("tableId"));

  const parsedData = tableSchema.safeParse({
    name: getStringValue(formData.get("name")),
    seats: getNumberValue(formData.get("seats")),
    displayOrder: getNumberValue(formData.get("displayOrder")),
    isActive: getBooleanValue(formData.get("isActive")),
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos.");
  }

  await db
    .update(diningTablesTable)
    .set({
      ...parsedData.data,
      updatedAt: new Date(),
    })
    .where(eq(diningTablesTable.id, tableId));

  revalidatePath(`/${slug}/mesas`);
};

export const deleteTableAction = async (slug: string, formData: FormData) => {
  const tableId = getStringValue(formData.get("tableId"));

  await db.delete(diningTablesTable).where(eq(diningTablesTable.id, tableId));

  revalidatePath(`/${slug}/mesas`);
};
