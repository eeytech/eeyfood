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

export const createTableAction = async (
  slug: string,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> => {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    const parsedData = tableSchema.safeParse({
      name: getStringValue(formData.get("name")),
      seats: getNumberValue(formData.get("seats")),
      displayOrder: getNumberValue(formData.get("displayOrder")),
      isActive: getBooleanValue(formData.get("isActive")),
    });

    if (!parsedData.success) {
      const errorMsg = parsedData.error.issues.map((i) => i.message).join(", ");
      return { error: `Dados inválidos: ${errorMsg}` };
    }

    await db.insert(diningTablesTable).values({
      ...parsedData.data,
      restaurantId: restaurant.id,
    });

    revalidatePath(`/${slug}/mesas`);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao cadastrar mesa.",
    };
  }
};

export const updateTableAction = async (
  slug: string,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> => {
  try {
    await getRestaurantOrThrow(slug);
    const tableId = getStringValue(formData.get("tableId"));

    if (!tableId) {
      return { error: "Identificador da mesa não informado." };
    }

    const parsedData = tableSchema.safeParse({
      name: getStringValue(formData.get("name")),
      seats: getNumberValue(formData.get("seats")),
      displayOrder: getNumberValue(formData.get("displayOrder")),
      isActive: getBooleanValue(formData.get("isActive")),
    });

    if (!parsedData.success) {
      const errorMsg = parsedData.error.issues.map((i) => i.message).join(", ");
      return { error: `Dados inválidos: ${errorMsg}` };
    }

    await db
      .update(diningTablesTable)
      .set({
        ...parsedData.data,
        updatedAt: new Date(),
      })
      .where(eq(diningTablesTable.id, tableId));

    revalidatePath(`/${slug}/mesas`);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao atualizar mesa.",
    };
  }
};

export const alternarStatusMesaAction = async (
  tableId: string,
  isActive: boolean,
  slug: string,
): Promise<{ error?: string; success?: boolean }> => {
  try {
    await db
      .update(diningTablesTable)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(diningTablesTable.id, tableId));

    revalidatePath(`/${slug}/mesas`);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Erro ao alterar status da mesa.",
    };
  }
};

export const deleteTableAction = async (
  slug: string,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> => {
  try {
    const tableId = getStringValue(formData.get("tableId"));

    if (!tableId) {
      return { error: "Identificador da mesa não informado." };
    }

    await db.delete(diningTablesTable).where(eq(diningTablesTable.id, tableId));

    revalidatePath(`/${slug}/mesas`);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao excluir mesa.",
    };
  }
};
