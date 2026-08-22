"use server";

import {
  buscarRestaurantePorSlug,
  criarContaBancaria,
  atualizarContaBancaria,
  excluirContaBancaria,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNumberValue, getStringValue } from "@/lib/admin-form-utils";

const contaSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres."),
  type: z.enum(["CHECKING", "SAVINGS", "INTERNAL", "DIGITAL"]),
  bankName: z.string().trim().optional(),
  agency: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  currentBalance: z.number().default(0),
});

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export const criarContaBancariaAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const parsed = contaSchema.safeParse({
    name: getStringValue(formData.get("name")),
    type: formData.get("type"),
    bankName: getStringValue(formData.get("bankName")) || undefined,
    agency: getStringValue(formData.get("agency")) || undefined,
    accountNumber: getStringValue(formData.get("accountNumber")) || undefined,
    currentBalance: getNumberValue(formData.get("currentBalance")),
  });

  if (!parsed.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsed.error.flatten()));
  }

  await criarContaBancaria({ restaurantId: restaurant.id, ...parsed.data });
  revalidatePath(`/${slug}/financeiro/contas-bancarias`);
};

export const atualizarContaBancariaAction = async (
  slug: string,
  contaId: string,
  formData: FormData,
) => {
  const parsed = contaSchema.safeParse({
    name: getStringValue(formData.get("name")),
    type: formData.get("type"),
    bankName: getStringValue(formData.get("bankName")) || undefined,
    agency: getStringValue(formData.get("agency")) || undefined,
    accountNumber: getStringValue(formData.get("accountNumber")) || undefined,
    currentBalance: getNumberValue(formData.get("currentBalance")),
  });

  if (!parsed.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsed.error.flatten()));
  }

  await atualizarContaBancaria(contaId, parsed.data);
  revalidatePath(`/${slug}/financeiro/contas-bancarias`);
};

export const excluirContaBancariaAction = async (slug: string, contaId: string) => {
  await excluirContaBancaria(contaId);
  revalidatePath(`/${slug}/financeiro/contas-bancarias`);
};
