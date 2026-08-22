"use server";

import {
  buscarRestaurantePorSlug,
  criarFiado,
  atualizarFiado,
  registrarPagamentoFiado,
  db,
  eq,
  customerLedgersTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNumberValue, getStringValue } from "@/lib/admin-form-utils";

const fiadoSchema = z.object({
  customerName: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres."),
  customerPhone: z.string().trim().optional(),
  customerCpf: z.string().trim().optional(),
  creditLimit: z.number().min(0, "Limite deve ser positivo.").default(200),
  notes: z.string().trim().optional(),
});

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export const criarFiadoAction = async (slug: string, formData: FormData) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const parsed = fiadoSchema.safeParse({
    customerName: getStringValue(formData.get("customerName")),
    customerPhone: getStringValue(formData.get("customerPhone")) || undefined,
    customerCpf: getStringValue(formData.get("customerCpf")) || undefined,
    creditLimit: getNumberValue(formData.get("creditLimit")),
    notes: getStringValue(formData.get("notes")) || undefined,
  });

  if (!parsed.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsed.error.flatten()));
  }

  await criarFiado({ restaurantId: restaurant.id, ...parsed.data });
  revalidatePath(`/${slug}/financeiro/fiados`);
};

export const atualizarFiadoAction = async (
  slug: string,
  ledgerId: string,
  formData: FormData,
) => {
  const parsed = fiadoSchema.safeParse({
    customerName: getStringValue(formData.get("customerName")),
    customerPhone: getStringValue(formData.get("customerPhone")) || undefined,
    customerCpf: getStringValue(formData.get("customerCpf")) || undefined,
    creditLimit: getNumberValue(formData.get("creditLimit")),
    notes: getStringValue(formData.get("notes")) || undefined,
  });

  if (!parsed.success) {
    throw new Error("Dados inválidos: " + JSON.stringify(parsed.error.flatten()));
  }

  await atualizarFiado(ledgerId, parsed.data);
  revalidatePath(`/${slug}/financeiro/fiados`);
};

export const receberPagamentoFiadoAction = async (
  slug: string,
  ledgerId: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);

  const amount = getNumberValue(formData.get("amount"));
  const bankAccountId = getStringValue(formData.get("bankAccountId")) || undefined;
  const description = getStringValue(formData.get("description")) || "Pagamento de fiado";

  if (!amount || amount <= 0) throw new Error("Valor inválido.");

  const [ledger] = await db
    .select({ debtBalance: customerLedgersTable.debtBalance })
    .from(customerLedgersTable)
    .where(eq(customerLedgersTable.id, ledgerId))
    .limit(1);

  if (!ledger) throw new Error("Fiado não encontrado.");
  if (amount > (ledger.debtBalance ?? 0)) {
    throw new Error("Valor superior ao saldo devedor.");
  }

  await registrarPagamentoFiado({
    ledgerId,
    restaurantId: restaurant.id,
    bankAccountId,
    amount,
    description,
  });

  revalidatePath(`/${slug}/financeiro/fiados`);
};

export const inativarFiadoAction = async (slug: string, ledgerId: string) => {
  await atualizarFiado(ledgerId, { isActive: false });
  revalidatePath(`/${slug}/financeiro/fiados`);
};
