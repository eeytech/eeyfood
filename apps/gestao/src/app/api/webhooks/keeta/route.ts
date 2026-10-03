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

interface KeetaWebhookItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
}

interface KeetaWebhookPayload {
  eventType?: string;
  action?: string;
  storeId?: string;
  merchantId?: string;
  orderId?: string;
  timestamp?: number;
  data?: {
    orderId?: string;
    displayId?: string;
    storeId?: string;
    merchantId?: string;
    status?: string;
    customer?: {
      name?: string;
      phone?: string;
    };
    items?: KeetaWebhookItem[];
    delivery?: {
      address?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      notes?: string;
    };
    payment?: {
      method?: string;
      total?: number;
    };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");

  if (challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: "ok",
    service: "eeyfood-keeta-webhook",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    console.log("[Keeta Webhook] Payload recebido:", JSON.stringify(rawBody, null, 2));

    const events: KeetaWebhookPayload[] = Array.isArray(rawBody) ? rawBody : [rawBody];

    for (const event of events) {
      const storeId =
        event.storeId ||
        event.merchantId ||
        event.data?.storeId ||
        event.data?.merchantId;

      if (!storeId) {
        console.warn("[Keeta Webhook] Evento ignorado: sem storeId/merchantId", event);
        continue;
      }

      const [integration] = await db
        .select()
        .from(marketplaceIntegrationsTable)
        .where(
          and(
            eq(marketplaceIntegrationsTable.merchantId, storeId),
            eq(marketplaceIntegrationsTable.type, "KEETA"),
          ),
        )
        .limit(1);

      if (!integration || !integration.isActive) {
        console.warn(
          `[Keeta Webhook] Integração não encontrada ou inativa para storeId: ${storeId}`,
        );
        continue;
      }

      const restaurantRecord = await db.query.restaurantsTable.findFirst({
        where: (t, { eq: eqFn }) => eqFn(t.id, integration.restaurantId),
        columns: { slug: true },
      });

      if (!restaurantRecord?.slug) {
        console.warn("[Keeta Webhook] Restaurante não encontrado para id:", integration.restaurantId);
        continue;
      }

      const restaurant = await buscarRestaurantePorSlug(restaurantRecord.slug);
      if (!restaurant) {
        console.warn("[Keeta Webhook] Restaurante não encontrado por slug:", restaurantRecord.slug);
        continue;
      }

      const eventType = (event.eventType || event.action || event.data?.status || "NEW_ORDER").toUpperCase();
      const isNewOrder =
        eventType.includes("NEW") ||
        eventType.includes("ORDER") ||
        eventType.includes("PLACED") ||
        eventType.includes("CONFIRM") ||
        eventType === "ORDER_CREATED";

      if (!isNewOrder) {
        console.log(`[Keeta Webhook] Evento ${eventType} recebido (não é novo pedido).`);
        continue;
      }

      // Buscar primeiro produto ativo do cardápio para fallback
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

      const orderData = event.data;
      const orderId =
        orderData?.orderId ||
        orderData?.displayId ||
        event.orderId ||
        `KEETA-${Date.now().toString().slice(-6)}`;

      const customerName = orderData?.customer?.name || "Cliente Keeta";
      const customerPhone = orderData?.customer?.phone || "11999990000";

      let deliveryAddress = "Endereço via Keeta Brasil";
      if (orderData?.delivery?.address) {
        deliveryAddress = orderData.delivery.address;
      } else if (orderData?.delivery?.street) {
        deliveryAddress = `${orderData.delivery.street}, ${orderData.delivery.number || "S/N"} - ${orderData.delivery.neighborhood || "Bairro"}`;
      }

      // Mapeamento de produtos
      const rawItems = orderData?.items || [];
      const orderProducts: Array<{ id: string; quantity: number }> = [];

      for (const item of rawItems) {
        if (!item.name) continue;
        const [matched] = await db
          .select({ id: productsTable.id })
          .from(productsTable)
          .where(
            and(
              eq(productsTable.restaurantId, restaurant.id),
              eq(productsTable.name, item.name),
              eq(productsTable.isActive, true),
            ),
          )
          .limit(1);

        if (matched) {
          orderProducts.push({
            id: matched.id,
            quantity: Math.max(1, Number(item.quantity) || 1),
          });
        }
      }

      if (orderProducts.length === 0 && firstProduct) {
        orderProducts.push({
          id: firstProduct.id,
          quantity: 1,
        });
      }

      if (orderProducts.length === 0) {
        console.error("[Keeta Webhook] Nenhum produto ativo encontrado no restaurante para associar ao pedido.");
        continue;
      }

      const createdOrder = await criarPedido({
        slug: restaurant.slug,
        customerName,
        customerPhone,
        consumptionMethod: "DELIVERY",
        paymentMethod: "CARTAO_PRESENCIAL",
        deliveryAddress,
        marketplaceOrderId: orderId,
        marketplaceType: "KEETA",
        notes: `[Origem: Keeta Brasil (Meituan)] Pedido #${orderId}`,
        products: orderProducts,
      });

      console.log(`[Keeta Webhook] Pedido #${createdOrder.id} criado com sucesso a partir do Keeta #${orderId}.`);
      await notificarNovoPedido(createdOrder.id, restaurant.slug);
    }

    return NextResponse.json({ status: "success", received: true }, { status: 200 });
  } catch (error) {
    console.error("[Keeta Webhook] Erro crítico:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook do Keeta Brasil." },
      { status: 500 },
    );
  }
}
