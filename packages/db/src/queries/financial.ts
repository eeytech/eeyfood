import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "../client";
import {
  bankAccountsTable,
  bankStatementEntriesTable,
  bankStatementsTable,
  customerLedgerEntriesTable,
  customerLedgersTable,
  financialCategoriesTable,
  financialTransactionsTable,
  fiscalSettingsTable,
  ordersTable,
} from "../schema";
import type { FinancialCategory, FinancialTransaction, TransactionStatus } from "../types";
import { buscarRestaurantePorSlug } from "./index";

export const listarCategoriasFinanceirasPorSlug = async (
  slug: string,
): Promise<FinancialCategory[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(financialCategoriesTable)
    .where(eq(financialCategoriesTable.restaurantId, restaurant.id))
    .orderBy(asc(financialCategoriesTable.name));
};

export const criarTransacaoFinanceira = async (
  input: Omit<FinancialTransaction, "id" | "createdAt" | "updatedAt"> & { bankAccountId?: string | null },
): Promise<FinancialTransaction> => {
  const [transaction] = await db
    .insert(financialTransactionsTable)
    .values(input)
    .returning();

  if (!transaction) {
    throw new Error("Falha ao criar transação financeira.");
  }

  return transaction;
};

export const atualizarStatusTransacao = async (
  transactionId: string,
  status: TransactionStatus,
  paidAt?: Date | null,
): Promise<FinancialTransaction | null> => {
  const [updated] = await db
    .update(financialTransactionsTable)
    .set({
      status,
      paidAt: status === "PAID" ? paidAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(financialTransactionsTable.id, transactionId))
    .returning();

  return updated ?? null;
};

export const buscarDREBasico = async (
  slug: string,
  startDate: Date,
  endDate: Date,
) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const transactions = await db
    .select()
    .from(financialTransactionsTable)
    .where(
      and(
        eq(financialTransactionsTable.restaurantId, restaurant.id),
        gte(financialTransactionsTable.dueDate, startDate),
      ),
    );

  const revenue = transactions
    .filter((t) => t.type === "REVENUE" && t.status === "PAID")
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((acc, t) => acc + t.amount, 0);

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
  };
};

// ─── Contas Bancárias ─────────────────────────────────────────────────────────

export const listarContasBancariasPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(bankAccountsTable)
    .where(eq(bankAccountsTable.restaurantId, restaurant.id))
    .orderBy(asc(bankAccountsTable.name));
};

export const criarContaBancaria = async (
  input: Omit<typeof bankAccountsTable.$inferInsert, "id" | "createdAt" | "updatedAt">,
) => {
  const [account] = await db.insert(bankAccountsTable).values(input).returning();
  if (!account) throw new Error("Falha ao criar conta bancária.");
  return account;
};

export const atualizarContaBancaria = async (
  id: string,
  data: Partial<Omit<typeof bankAccountsTable.$inferInsert, "id" | "restaurantId" | "createdAt">>,
) => {
  const [account] = await db
    .update(bankAccountsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bankAccountsTable.id, id))
    .returning();
  if (!account) throw new Error("Conta bancária não encontrada.");
  return account;
};

export const excluirContaBancaria = async (id: string) => {
  await db.delete(bankAccountsTable).where(eq(bankAccountsTable.id, id));
};

// ─── Configurações Fiscais ────────────────────────────────────────────────────

export const buscarConfiguracoesFiscaisPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;
  const [settings] = await db
    .select()
    .from(fiscalSettingsTable)
    .where(eq(fiscalSettingsTable.restaurantId, restaurant.id))
    .limit(1);
  return settings ?? null;
};

export const salvarConfiguracoesFiscais = async (
  restaurantId: string,
  data: Omit<typeof fiscalSettingsTable.$inferInsert, "id" | "restaurantId" | "createdAt" | "updatedAt">,
) => {
  const [settings] = await db
    .insert(fiscalSettingsTable)
    .values({ restaurantId, ...data })
    .onConflictDoUpdate({
      target: fiscalSettingsTable.restaurantId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  if (!settings) throw new Error("Falha ao salvar configurações fiscais.");
  return settings;
};

export const atualizarStatusFiscalPedido = async (
  orderId: number,
  data: {
    nfeStatus?: "PENDING" | "ISSUED" | "REJECTED" | "CANCELLED";
    nfeAccessKey?: string | null;
    nfeDanfeUrl?: string | null;
    nfeRejectionReason?: string | null;
  },
) => {
  await db
    .update(ordersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
};

// ─── Livro de Fiados ─────────────────────────────────────────────────────────

export const listarFiadosPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(customerLedgersTable)
    .where(
      and(
        eq(customerLedgersTable.restaurantId, restaurant.id),
        eq(customerLedgersTable.isActive, true),
      ),
    )
    .orderBy(asc(customerLedgersTable.customerName));
};

export const criarFiado = async (
  input: Omit<typeof customerLedgersTable.$inferInsert, "id" | "createdAt" | "updatedAt" | "debtBalance">,
) => {
  const [ledger] = await db.insert(customerLedgersTable).values({ ...input, debtBalance: 0 }).returning();
  if (!ledger) throw new Error("Falha ao criar cadastro de fiado.");
  return ledger;
};

export const atualizarFiado = async (
  id: string,
  data: Partial<Pick<typeof customerLedgersTable.$inferInsert, "customerName" | "customerPhone" | "customerCpf" | "creditLimit" | "isActive" | "notes">>,
) => {
  const [ledger] = await db
    .update(customerLedgersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customerLedgersTable.id, id))
    .returning();
  if (!ledger) throw new Error("Fiado não encontrado.");
  return ledger;
};

export const listarLancamentosFiado = async (ledgerId: string) => {
  return db
    .select()
    .from(customerLedgerEntriesTable)
    .where(eq(customerLedgerEntriesTable.ledgerId, ledgerId))
    .orderBy(desc(customerLedgerEntriesTable.createdAt));
};

export const registrarDebitoFiado = async (input: {
  ledgerId: string;
  restaurantId: string;
  orderId: number;
  amount: number;
  description: string;
}) => {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(customerLedgerEntriesTable)
      .values({ ...input, type: "DEBIT" })
      .returning();

    await tx
      .update(customerLedgersTable)
      .set({
        debtBalance: sql`${customerLedgersTable.debtBalance} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(customerLedgersTable.id, input.ledgerId));

    return entry;
  });
};

export const registrarPagamentoFiado = async (input: {
  ledgerId: string;
  restaurantId: string;
  bankAccountId?: string;
  amount: number;
  description: string;
}) => {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(customerLedgerEntriesTable)
      .values({ ...input, type: "CREDIT" })
      .returning();

    await tx
      .update(customerLedgersTable)
      .set({
        debtBalance: sql`GREATEST(0, ${customerLedgersTable.debtBalance} - ${input.amount})`,
        updatedAt: new Date(),
      })
      .where(eq(customerLedgersTable.id, input.ledgerId));

    if (input.bankAccountId) {
      await tx
        .update(bankAccountsTable)
        .set({
          currentBalance: sql`${bankAccountsTable.currentBalance} + ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(bankAccountsTable.id, input.bankAccountId));
    }

    return entry;
  });
};

// ─── Conciliação Bancária (OFX) ───────────────────────────────────────────────

export const criarExtratoImportado = async (input: {
  restaurantId: string;
  bankAccountId: string;
  fileName: string;
  periodStart?: string;
  periodEnd?: string;
  totalEntries: number;
}) => {
  const [statement] = await db.insert(bankStatementsTable).values(input).returning();
  if (!statement) throw new Error("Falha ao importar extrato.");
  return statement;
};

export const listarExtratosPorConta = async (bankAccountId: string) => {
  return db
    .select()
    .from(bankStatementsTable)
    .where(eq(bankStatementsTable.bankAccountId, bankAccountId))
    .orderBy(desc(bankStatementsTable.createdAt));
};

export const criarLinhasExtrato = async (
  entries: Array<Omit<typeof bankStatementEntriesTable.$inferInsert, "id" | "createdAt" | "updatedAt">>,
) => {
  if (entries.length === 0) return [];
  return db.insert(bankStatementEntriesTable).values(entries).returning();
};

export const listarLinhasExtrato = async (statementId: string) => {
  return db
    .select()
    .from(bankStatementEntriesTable)
    .where(eq(bankStatementEntriesTable.statementId, statementId))
    .orderBy(asc(bankStatementEntriesTable.entryDate));
};

export const vincularLinhaExtratoTransacao = async (
  entryId: string,
  transactionId: string | null,
) => {
  const [entry] = await db
    .update(bankStatementEntriesTable)
    .set({
      matchedTransactionId: transactionId,
      status: transactionId ? "MATCHED" : "PENDING",
      updatedAt: new Date(),
    })
    .where(eq(bankStatementEntriesTable.id, entryId))
    .returning();

  if (entry && transactionId) {
    await db
      .update(bankStatementsTable)
      .set({
        matchedEntries: sql`${bankStatementsTable.matchedEntries} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(bankStatementsTable.id, entry.statementId));
  }

  return entry ?? null;
};

export const ignorarLinhaExtrato = async (entryId: string) => {
  await db
    .update(bankStatementEntriesTable)
    .set({ status: "IGNORED", updatedAt: new Date() })
    .where(eq(bankStatementEntriesTable.id, entryId));
};
