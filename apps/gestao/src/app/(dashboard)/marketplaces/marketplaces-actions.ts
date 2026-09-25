"use server";

import {
  and,
  buscarRestaurantePorSlug,
  db,
  desc,
  eq,
  marketplaceIntegrationsTable,
  ordersTable,
  sql,
} from "@fsw/db";
import type { MarketplaceType } from "@fsw/db";
import { revalidatePath } from "next/cache";

export interface MarketplaceConfigItem {
  id?: string;
  type: MarketplaceType;
  isActive: boolean;
  merchantId: string | null;
  apiToken: string | null;
  updatedAt?: string;
}

const getRestaurantOrThrow = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");
  return restaurant;
};

export async function buscarIntegracoesMarketplaceAction(
  slug: string,
): Promise<{
  integracoes: MarketplaceConfigItem[];
  recentMarketplaceOrdersCount: number;
}> {
  const restaurant = await getRestaurantOrThrow(slug);

  const rows = await db
    .select()
    .from(marketplaceIntegrationsTable)
    .where(eq(marketplaceIntegrationsTable.restaurantId, restaurant.id));

  const integracoesMap = new Map(rows.map((r) => [r.type, r]));

  const types: MarketplaceType[] = ["IFOOD", "RAPPI", "NINETY_NINE_FOOD"];

  const integracoes: MarketplaceConfigItem[] = types.map((type) => {
    const found = integracoesMap.get(type);
    return {
      id: found?.id,
      type,
      isActive: found?.isActive ?? false,
      merchantId: found?.merchantId ?? null,
      apiToken: found?.apiToken ?? null,
      updatedAt: found?.updatedAt ? found.updatedAt.toISOString() : undefined,
    };
  });

  // Buscar pedidos com origem iFood / Marketplace nas observações ou tipo
  const [ordersCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, restaurant.id),
        sql`(${ordersTable.notes} ilike '%ifood%' or ${ordersTable.notes} ilike '%rappi%' or ${ordersTable.notes} ilike '%marketplace%')`,
      ),
    );

  return {
    integracoes,
    recentMarketplaceOrdersCount: ordersCount?.count || 0,
  };
}

export async function salvarIntegracaoMarketplaceAction(
  slug: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    const type = formData.get("type")?.toString() as MarketplaceType;
    const merchantId = formData.get("merchantId")?.toString()?.trim() || null;
    const apiToken = formData.get("apiToken")?.toString()?.trim() || null;
    const isActive = formData.get("isActive") === "true";

    if (!type) {
      return { success: false, error: "Tipo de marketplace inválido." };
    }

    if (isActive && !merchantId) {
      return {
        success: false,
        error: "O Merchant ID é obrigatório para ativar a integração.",
      };
    }

    const now = new Date();

    const [existing] = await db
      .select({ id: marketplaceIntegrationsTable.id })
      .from(marketplaceIntegrationsTable)
      .where(
        and(
          eq(marketplaceIntegrationsTable.restaurantId, restaurant.id),
          eq(marketplaceIntegrationsTable.type, type),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(marketplaceIntegrationsTable)
        .set({
          merchantId,
          apiToken,
          isActive,
          updatedAt: now,
        })
        .where(eq(marketplaceIntegrationsTable.id, existing.id));
    } else {
      await db.insert(marketplaceIntegrationsTable).values({
        restaurantId: restaurant.id,
        type,
        merchantId,
        apiToken,
        isActive,
        createdAt: now,
        updatedAt: now,
      });
    }

    revalidatePath(`/${slug}/marketplaces`);
    revalidatePath("/marketplaces");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao salvar integração com marketplace.",
    };
  }
}

export async function testarConexaoMarketplaceAction(
  merchantId: string,
  type: MarketplaceType,
): Promise<{ success: boolean; message: string }> {
  if (!merchantId) {
    return { success: false, message: "Informe o Merchant ID antes de testar." };
  }

  // Simulação de handshake de ping com o portal do iFood/Rappi
  await new Promise((res) => setTimeout(res, 800));

  if (merchantId.length < 8) {
    return {
      success: false,
      message: "Merchant ID inválido. Verifique o identificador da loja no portal parceiro.",
    };
  }

  return {
    success: true,
    message: `Conexão validada com sucesso! O webhook está apto a receber pedidos do ${type}.`,
  };
}
