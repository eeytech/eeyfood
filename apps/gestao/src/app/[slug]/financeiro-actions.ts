"use server";

import {
  buscarRestaurantePorSlug,
  criarTransacaoFinanceira,
  db,
  eq,
  financialCategoriesTable,
  financialTransactionsTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getNumberValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const transactionSchema = z.object({
  description: z.string().trim().min(3, "Informe uma descrição válida."),
  amount: z.number().min(0.01, "O valor deve ser maior que zero."),
  type: z.enum(["REVENUE", "EXPENSE"]),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
  dueDate: z.string().transform((str) => new Date(str)),
  categoryId: z.string().uuid("Selecione uma categoria válida.").optional(),
});

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export const createTransactionAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const parsedData = transactionSchema.safeParse({
    description: getStringValue(formData.get("description")),
    amount: getNumberValue(formData.get("amount")),
    type: formData.get("type"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    categoryId: getStringValue(formData.get("categoryId")) || undefined,
  });

  if (!parsedData.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsedData.error.flatten()));
  }

  await criarTransacaoFinanceira({
    description: parsedData.data.description,
    amount: parsedData.data.amount,
    type: parsedData.data.type,
    status: parsedData.data.status,
    dueDate: parsedData.data.dueDate,
    categoryId: parsedData.data.categoryId ?? null,
    restaurantId: restaurant.id,
    paidAt: parsedData.data.status === "PAID" ? new Date() : null,
    orderId: null,
  });


  revalidatePath(`/${slug}/financeiro`);
};

export const updateTransactionStatusAction = async (
  slug: string,
  transactionId: string,
  status: "PAID" | "CANCELLED" | "PENDING"
) => {
  await db
    .update(financialTransactionsTable)
    .set({
      status,
      paidAt: status === "PAID" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(financialTransactionsTable.id, transactionId));

  revalidatePath(`/${slug}/financeiro`);
};

export const createFinancialCategoryAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const name = getStringValue(formData.get("name"));
  const type = formData.get("type") as "REVENUE" | "EXPENSE";

  if (!name || name.length < 2) throw new Error("Nome inválido.");

  await db.insert(financialCategoriesTable).values({
    name,
    type,
    restaurantId: restaurant.id,
  });

  revalidatePath(`/${slug}/financeiro`);
};
