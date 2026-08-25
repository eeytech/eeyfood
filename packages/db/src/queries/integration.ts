import { and, eq, sql } from "drizzle-orm";

import { db } from "../client";
import { aiSettingsTable, marketingSpendTable, marketplaceIntegrationsTable } from "../schema";
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

// ─── Handoff Bot ──────────────────────────────────────────────────────────────

export const pausarBot = async (restaurantId: string, customerPhone: string): Promise<void> => {
  await db
    .update(aiSettingsTable)
    .set({
      isBotPaused: true,
      pausedAt: new Date(),
      pausedForPhone: customerPhone,
      conversationStatus: "HUMAN_REQUIRED",
      updatedAt: new Date(),
    })
    .where(eq(aiSettingsTable.restaurantId, restaurantId));
};

export const reativarBot = async (restaurantId: string): Promise<void> => {
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
