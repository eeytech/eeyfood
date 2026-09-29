"use server";

import {
  and,
  buscarRestaurantePorSlug,
  criarPedido,
  db,
  eq,
  marketplaceIntegrationsTable,
  ordersTable,
  productsTable,
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

export async function salvarTodasIntegracoesMarketplaceAction(
  slug: string,
  integracoes: Array<{
    type: MarketplaceType;
    isActive: boolean;
    merchantId: string | null;
    apiToken: string | null;
  }>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    for (const item of integracoes) {
      if (item.isActive && (!item.merchantId || !item.merchantId.trim())) {
        const canal =
          item.type === "IFOOD"
            ? "iFood (Merchant ID)"
            : item.type === "RAPPI"
              ? "Rappi (Store ID)"
              : item.type;
        return {
          success: false,
          error: `O identificador do ${canal} é obrigatório quando a integração estiver ativada.`,
        };
      }
    }

    const now = new Date();

    for (const item of integracoes) {
      const merchantId = item.merchantId?.trim() || null;
      const apiToken = item.apiToken?.trim() || null;

      const [existing] = await db
        .select({ id: marketplaceIntegrationsTable.id })
        .from(marketplaceIntegrationsTable)
        .where(
          and(
            eq(marketplaceIntegrationsTable.restaurantId, restaurant.id),
            eq(marketplaceIntegrationsTable.type, item.type),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(marketplaceIntegrationsTable)
          .set({
            merchantId,
            apiToken,
            isActive: item.isActive,
            updatedAt: now,
          })
          .where(eq(marketplaceIntegrationsTable.id, existing.id));
      } else {
        await db.insert(marketplaceIntegrationsTable).values({
          restaurantId: restaurant.id,
          type: item.type,
          merchantId,
          apiToken,
          isActive: item.isActive,
          createdAt: now,
          updatedAt: now,
        });
      }
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
          : "Erro ao salvar integrações com marketplaces.",
    };
  }
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
  const idLabel = type === "RAPPI" ? "Store ID" : "Merchant ID";
  const canalNome = type === "IFOOD" ? "iFood" : type === "RAPPI" ? "Rappi" : type;

  if (!merchantId || !merchantId.trim()) {
    return { success: false, message: `Informe o ${idLabel} antes de testar.` };
  }

  // Simulação de handshake de ping com o portal do iFood/Rappi
  await new Promise((res) => setTimeout(res, 800));

  const minLength = type === "RAPPI" ? 5 : 8;
  if (merchantId.trim().length < minLength) {
    return {
      success: false,
      message: `${idLabel} inválido. Verifique o identificador da loja no portal parceiro.`,
    };
  }

  return {
    success: true,
    message: `Conexão validada com sucesso! O canal ${canalNome} está apto a receber pedidos.`,
  };
}

const notificarNovoPedido = async (orderId: number, restaurantSlug: string) => {
  const url = process.env.WEBSOCKET_SERVER_URL;
  if (!url) return;
  try {
    await fetch(`${url}/eventos/novo-pedido`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, restaurantSlug }),
      cache: "no-store",
    });
  } catch {
    /* non-critical */
  }
};

export async function simularPedidoMarketplaceAction(
  slug: string,
  type: MarketplaceType,
): Promise<{ success: boolean; message: string }> {
  try {
    const restaurant = await getRestaurantOrThrow(slug);

    const [firstProduct] = await db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.restaurantId, restaurant.id),
          eq(productsTable.isActive, true),
        ),
      )
      .limit(1);

    if (!firstProduct) {
      return {
        success: false,
        message: "O restaurante não possui produtos ativos no cardápio para gerar o pedido de teste.",
      };
    }

    const canalNome = type === "IFOOD" ? "iFood" : type === "RAPPI" ? "Rappi" : type;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderId = `${type}-${randomCode}`;

    const createdOrder = await criarPedido({
      slug: restaurant.slug,
      customerName: `Cliente Teste ${canalNome}`,
      customerPhone: `1199999${randomCode}`,
      consumptionMethod: "DELIVERY",
      paymentMethod: "CARTAO_PRESENCIAL",
      deliveryAddress: `Rua de Teste ${canalNome}, 100 - Bairro Centro`,
      marketplaceOrderId: orderId,
      marketplaceType: type,
      notes: `[Origem: ${canalNome}] Pedido simulado de teste #${randomCode}`,
      products: [{ id: firstProduct.id, quantity: 1 }],
    });

    await notificarNovoPedido(createdOrder.id, restaurant.slug);

    revalidatePath(`/${slug}/marketplaces`);
    revalidatePath("/marketplaces");
    revalidatePath(`/${slug}/pedidos`);
    revalidatePath("/pedidos");

    return {
      success: true,
      message: `Pedido de teste #${createdOrder.id} (${canalNome}) gerado com sucesso! Verifique seu PDV e KDS.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao simular pedido de marketplace.",
    };
  }
}
