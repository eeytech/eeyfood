"use server";

import {
  buscarRestaurantePorSlug,
  criarExtratoImportado,
  criarLinhasExtrato,
  vincularLinhaExtratoTransacao,
  ignorarLinhaExtrato,
  criarTransacaoFinanceira,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import { getStringValue } from "@/lib/admin-form-utils";
import { parseOfx } from "@/lib/ofx-parser";

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export const importarExtratoOfxAction = async (
  slug: string,
  bankAccountId: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const file = formData.get("ofxFile") as File | null;
  if (!file) throw new Error("Arquivo OFX não enviado.");

  const raw = await file.text();
  const parsed = parseOfx(raw);

  if (parsed.entries.length === 0) {
    throw new Error("Nenhuma transação encontrada no arquivo OFX.");
  }

  const statement = await criarExtratoImportado({
    restaurantId: restaurant.id,
    bankAccountId,
    fileName: file.name,
    periodStart: parsed.periodStart,
    periodEnd: parsed.periodEnd,
    totalEntries: parsed.entries.length,
  });

  await criarLinhasExtrato(
    parsed.entries.map((e) => ({
      statementId: statement.id,
      restaurantId: restaurant.id,
      entryDate: e.date,
      description: e.description,
      amount: e.type === "DEBIT" ? -e.amount : e.amount,
    })),
  );

  revalidatePath(`/${slug}/financeiro/conciliacao`);
  return { statementId: statement.id, totalEntries: parsed.entries.length };
};

export const vincularTransacaoAction = async (
  slug: string,
  entryId: string,
  transactionId: string,
) => {
  await vincularLinhaExtratoTransacao(entryId, transactionId);
  revalidatePath(`/${slug}/financeiro/conciliacao`);
};

export const ignorarLancamentoExtratoAction = async (slug: string, entryId: string) => {
  await ignorarLinhaExtrato(entryId);
  revalidatePath(`/${slug}/financeiro/conciliacao`);
};

export const criarTransacaoDeExtratoAction = async (
  slug: string,
  entryId: string,
  bankAccountId: string,
  formData: FormData,
) => {
  const restaurant = await getRestaurantOrThrow(slug);
  const description = getStringValue(formData.get("description")) ?? "Lançamento de extrato";
  const rawAmount = parseFloat((formData.get("amount") as string) ?? "0");
  const type = rawAmount >= 0 ? "REVENUE" : "EXPENSE";

  const transaction = await criarTransacaoFinanceira({
    description,
    amount: Math.abs(rawAmount),
    type,
    status: "PAID",
    dueDate: new Date(getStringValue(formData.get("entryDate")) ?? new Date().toISOString()),
    paidAt: new Date(),
    categoryId: null,
    orderId: null,
    bankAccountId,
    restaurantId: restaurant.id,
  });

  await vincularLinhaExtratoTransacao(entryId, transaction.id);
  revalidatePath(`/${slug}/financeiro/conciliacao`);
};
