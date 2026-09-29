import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../client";
import {
  aiCustomerHandoffTable,
  aiSettingsTable,
  marketingSpendTable,
  marketplaceIntegrationsTable,
} from "../schema";
import type { MarketplaceIntegration, MarketplaceType } from "../types";

export const buscarIntegracaoMarketplace = async (
  restaurantId: string,
  type: MarketplaceType,
): Promise<MarketplaceIntegration | null> => {
  const [integration] = await db
    .select()
    .from(marketplaceIntegrationsTable)
    .where(
      and(
        eq(marketplaceIntegrationsTable.restaurantId, restaurantId),
        eq(marketplaceIntegrationsTable.type, type),
      ),
    )
    .limit(1);
  return integration ?? null;
};

export const salvarIntegracaoMarketplace = async (
  restaurantId: string,
  type: MarketplaceType,
  data: { apiToken?: string; merchantId?: string; isActive?: boolean; menuMappings?: Record<string, string> },
): Promise<MarketplaceIntegration> => {
  const values = { restaurantId, type, ...data, updatedAt: new Date() };
  const [integration] = await db
    .insert(marketplaceIntegrationsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [marketplaceIntegrationsTable.restaurantId, marketplaceIntegrationsTable.type],
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  if (!integration) throw new Error("Falha ao salvar integração.");
  return integration;
};

// ─── Handoff Bot Multicliente ──────────────────────────────────────────────────

export interface ClientePausadoInfo {
  id?: string;
  customerPhone: string;
  customerName?: string | null;
  pausedAt: Date;
}

export const pausarBotParaCliente = async (
  restaurantId: string,
  customerPhone: string,
  customerName?: string,
): Promise<void> => {
  const cleanPhone = customerPhone.trim();
  const now = new Date();

  // 1. Registra na tabela de handoff multicliente
  try {
    await db
      .insert(aiCustomerHandoffTable)
      .values({
        restaurantId,
        customerPhone: cleanPhone,
        customerName: customerName || null,
        pausedAt: now,
        status: "WAITING_HUMAN",
        updatedAt: now,
      });
  } catch (err) {
    console.warn("Aviso ao registrar handoff em aiCustomerHandoffTable:", err);
  }

  // 2. Mantém compatibilidade com aiSettingsTable
  await db
    .update(aiSettingsTable)
    .set({
      isBotPaused: true,
      pausedAt: now,
      pausedForPhone: cleanPhone,
      conversationStatus: "HUMAN_REQUIRED",
      updatedAt: now,
    })
    .where(eq(aiSettingsTable.restaurantId, restaurantId));
};

export const reativarBotParaCliente = async (
  restaurantId: string,
  customerPhone: string,
): Promise<void> => {
  const cleanPhone = customerPhone.trim();

  // Marca este cliente como resolvido
  try {
    await db
      .update(aiCustomerHandoffTable)
      .set({
        status: "RESOLVED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiCustomerHandoffTable.restaurantId, restaurantId),
          eq(aiCustomerHandoffTable.customerPhone, cleanPhone),
          eq(aiCustomerHandoffTable.status, "WAITING_HUMAN"),
        ),
      );
  } catch (err) {
    console.warn("Aviso ao reativar cliente em aiCustomerHandoffTable:", err);
  }

  // Verifica se ainda resta algum cliente aguardando atendimento
  let hasRemaining = false;
  try {
    const remaining = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiCustomerHandoffTable)
      .where(
        and(
          eq(aiCustomerHandoffTable.restaurantId, restaurantId),
          eq(aiCustomerHandoffTable.status, "WAITING_HUMAN"),
        ),
      );
    hasRemaining = Number(remaining[0]?.count ?? 0) > 0;
  } catch {
    hasRemaining = false;
  }

  if (!hasRemaining) {
    await db
      .update(aiSettingsTable)
      .set({
        isBotPaused: false,
        pausedAt: null,
        pausedForPhone: null,
        conversationStatus: "BOT_ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(aiSettingsTable.restaurantId, restaurantId));
  }
};

export const reativarTodosClientes = async (restaurantId: string): Promise<void> => {
  try {
    await db
      .update(aiCustomerHandoffTable)
      .set({
        status: "RESOLVED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiCustomerHandoffTable.restaurantId, restaurantId),
          eq(aiCustomerHandoffTable.status, "WAITING_HUMAN"),
        ),
      );
  } catch (err) {
    console.warn("Aviso ao reativar todos em aiCustomerHandoffTable:", err);
  }

  await db
    .update(aiSettingsTable)
    .set({
      isBotPaused: false,
      pausedAt: null,
      pausedForPhone: null,
      conversationStatus: "BOT_ACTIVE",
      updatedAt: new Date(),
    })
    .where(eq(aiSettingsTable.restaurantId, restaurantId));
};

export const listarClientesPausados = async (
  restaurantId: string,
): Promise<ClientePausadoInfo[]> => {
  try {
    const list = await db
      .select({
        id: aiCustomerHandoffTable.id,
        customerPhone: aiCustomerHandoffTable.customerPhone,
        customerName: aiCustomerHandoffTable.customerName,
        pausedAt: aiCustomerHandoffTable.pausedAt,
      })
      .from(aiCustomerHandoffTable)
      .where(
        and(
          eq(aiCustomerHandoffTable.restaurantId, restaurantId),
          eq(aiCustomerHandoffTable.status, "WAITING_HUMAN"),
        ),
      )
      .orderBy(desc(aiCustomerHandoffTable.pausedAt));

    if (list.length > 0) {
      return list;
    }
  } catch (err) {
    console.warn("Aviso ao consultar aiCustomerHandoffTable:", err);
  }

  // Fallback caso a tabela ainda esteja vazia mas aiSettingsTable tenha dados
  const [settings] = await db
    .select({
      isBotPaused: aiSettingsTable.isBotPaused,
      pausedAt: aiSettingsTable.pausedAt,
      pausedForPhone: aiSettingsTable.pausedForPhone,
    })
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.restaurantId, restaurantId))
    .limit(1);

  if (settings?.isBotPaused && settings.pausedForPhone) {
    return [
      {
        customerPhone: settings.pausedForPhone,
        customerName: null,
        pausedAt: settings.pausedAt || new Date(),
      },
    ];
  }

  return [];
};

export const isClientePausado = async (
  restaurantId: string,
  customerPhone: string,
): Promise<boolean> => {
  const cleanPhone = customerPhone.trim();

  try {
    const [found] = await db
      .select({ id: aiCustomerHandoffTable.id })
      .from(aiCustomerHandoffTable)
      .where(
        and(
          eq(aiCustomerHandoffTable.restaurantId, restaurantId),
          eq(aiCustomerHandoffTable.customerPhone, cleanPhone),
          eq(aiCustomerHandoffTable.status, "WAITING_HUMAN"),
        ),
      )
      .limit(1);

    if (found) return true;
  } catch {
    // fallback
  }

  // Fallback para aiSettingsTable
  const [settings] = await db
    .select({
      isBotPaused: aiSettingsTable.isBotPaused,
      pausedForPhone: aiSettingsTable.pausedForPhone,
    })
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.restaurantId, restaurantId))
    .limit(1);

  return Boolean(
    settings?.isBotPaused && settings.pausedForPhone === cleanPhone,
  );
};

// Wrappers para compatibilidade legada
export const pausarBot = async (restaurantId: string, customerPhone: string): Promise<void> => {
  await pausarBotParaCliente(restaurantId, customerPhone);
};

export const reativarBot = async (restaurantId: string): Promise<void> => {
  await reativarTodosClientes(restaurantId);
};

export const buscarStatusHandoff = async (restaurantId: string) => {
  const [settings] = await db
    .select({
      isBotPaused: aiSettingsTable.isBotPaused,
      pausedAt: aiSettingsTable.pausedAt,
      pausedForPhone: aiSettingsTable.pausedForPhone,
      conversationStatus: aiSettingsTable.conversationStatus,
    })
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.restaurantId, restaurantId))
    .limit(1);
  return settings ?? null;
};

// ─── Marketing Spend ──────────────────────────────────────────────────────────

export interface CriarGastoMarketingInput {
  restaurantId: string;
  referenceMonth: string;
  channel: "META_ADS" | "GOOGLE_ADS" | "OTHER";
  amountSpent: number;
  notes?: string;
}

export const criarGastoMarketing = async (
  input: CriarGastoMarketingInput,
): Promise<void> => {
  await db.insert(marketingSpendTable).values(input);
};

export const listarGastosMarketing = async (restaurantId: string) => {
  return db
    .select()
    .from(marketingSpendTable)
    .where(eq(marketingSpendTable.restaurantId, restaurantId))
    .orderBy(sql`${marketingSpendTable.referenceMonth} desc`);
};

export const excluirGastoMarketing = async (id: string): Promise<void> => {
  await db.delete(marketingSpendTable).where(eq(marketingSpendTable.id, id));
};
