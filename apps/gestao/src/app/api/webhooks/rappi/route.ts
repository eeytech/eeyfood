import {
  and,
  buscarRestaurantePorSlug,
  criarPedido,
  db,
  eq,
  marketplaceIntegrationsTable,
  productsTable,
} from "@fsw/db";
import { NextResponse } from "next/server";

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

interface RappiWebhookItem {
  id?: string;
  sku?: string;
  name?: string;
  quantity: number;
  price?: number;
  unit_price?: number;
}

interface RappiWebhookPayload {
  order_id?: string;
  orderId?: string;
  store_id?: string;
  storeId?: string;
  status?: string;
  customer?: {
    name?: string;
    phone?: string;
  };
  delivery_address?: {
    description?: string;
    street_name?: string;
    street_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  items?: RappiWebhookItem[];
  cooking_instructions?: string;
  notes?: string;
  total?: number;
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as RappiWebhookPayload;
    console.log("[Rappi Webhook] Payload recebido:", JSON.stringify(rawBody, null, 2));

    const storeId = rawBody.store_id || rawBody.storeId;
    if (!storeId) {
      console.warn("[Rappi Webhook] Evento ignorado: sem store_id/storeId");
      return NextResponse.json({ ok: true, message: "Missing store_id" });
    }

    const [integration] = await db
      .select()
      .from(marketplaceIntegrationsTable)
      .where(
        and(
          eq(marketplaceIntegrationsTable.merchantId, storeId),
          eq(marketplaceIntegrationsTable.type, "RAPPI"),
        ),
      )
      .limit(1);

    if (!integration || !integration.isActive) {
      console.warn(`[Rappi Webhook] Integração Rappi inativa ou inexistente para storeId: ${storeId}`);
      return NextResponse.json({ ok: true, message: "Integration not active" });
    }

    const restaurantRecord = await db.query.restaurantsTable.findFirst({
      where: (t, { eq: eqFn }) => eqFn(t.id, integration.restaurantId),
      columns: { slug: true },
    });

    if (!restaurantRecord?.slug) {
      console.warn("[Rappi Webhook] Restaurante não encontrado para id:", integration.restaurantId);
      return NextResponse.json({ ok: true });
    }

    const restaurant = await buscarRestaurantePorSlug(restaurantRecord.slug);
    if (!restaurant) {
      console.warn("[Rappi Webhook] Restaurante não encontrado por slug:", restaurantRecord.slug);
      return NextResponse.json({ ok: true });
    }

    // Buscar primeiro produto ativo do catálogo para testes ou fallback de mapeamento
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

    const orderId = rawBody.order_id || rawBody.orderId || `RAPPI-${Date.now().toString().slice(-6)}`;
    const customerName = rawBody.customer?.name || "Cliente Rappi";
    const customerPhone =
      rawBody.customer?.phone?.replace(/\D/g, "") ||
      `RAPPI-${orderId.replace(/\D/g, "").slice(0, 8) || "88888888"}`;

    const delivery = rawBody.delivery_address;
    const addressStr = delivery?.description
      ? delivery.description
      : [
          delivery?.street_name,
          delivery?.street_number,
          delivery?.neighborhood,
          delivery?.city,
          delivery?.state,
        ]
          .filter(Boolean)
          .join(", ") || "Endereço Rappi (Entrega Parceira)";

    const mappings = (integration.menuMappings as Record<string, string>) ?? {};
    let finalProducts: Array<{ id: string; quantity: number }> = [];

    if (rawBody.items && rawBody.items.length > 0) {
      const existingProducts = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.restaurantId, restaurant.id),
            eq(productsTable.isActive, true),
          ),
        );
      const existingIds = new Set(existingProducts.map((p) => p.id));

      finalProducts = rawBody.items.map((item) => {
        const itemId = item.id || item.sku || "";
        const mappedId = mappings[itemId] ?? itemId;
        if (existingIds.has(mappedId)) {
          return { id: mappedId, quantity: item.quantity || 1 };
        }
        return {
          id: firstProduct?.id || mappedId,
          quantity: item.quantity || 1,
        };
      });
    } else if (firstProduct) {
      finalProducts = [{ id: firstProduct.id, quantity: 1 }];
    }

    if (finalProducts.length === 0) {
      console.error("[Rappi Webhook] Nenhum produto ativo encontrado para criar o pedido.");
      return NextResponse.json({ ok: true });
    }

    const notes = [
      rawBody.cooking_instructions || rawBody.notes,
      `[Origem: Rappi] ID Externo: ${orderId}`,
      rawBody.items?.length
        ? `Itens Rappi: ${rawBody.items.map((i) => `${i.name || i.id} (x${i.quantity})`).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" | ");

    try {
      console.log(`[Rappi Webhook] Criando pedido no sistema para ${restaurant.slug}...`);
      const createdOrder = await criarPedido({
        slug: restaurant.slug,
        customerName,
        customerPhone,
        consumptionMethod: "DELIVERY",
        paymentMethod: "CARTAO_PRESENCIAL",
        deliveryAddress: addressStr,
        deliveryLatitude: delivery?.latitude,
        deliveryLongitude: delivery?.longitude,
        marketplaceOrderId: orderId,
        marketplaceType: "RAPPI",
        notes,
        products: finalProducts,
      });

      console.log(`[Rappi Webhook] Pedido #${createdOrder.id} criado com sucesso! Notificando via WebSocket...`);
      await notificarNovoPedido(createdOrder.id, restaurant.slug);
    } catch (err) {
      console.error("[Rappi Webhook] Erro ao executar criarPedido:", err);
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (error) {
    console.error("[Rappi Webhook] Erro no handler:", error);
    return NextResponse.json({ ok: true });
  }
}
