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

interface IFoodWebhookItem {
  id: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
}

interface IFoodWebhookPayload {
  orderId?: string;
  orderStatus?: string;
  restaurantId?: string;
  merchantId?: string;
  code?: string;
  fullCode?: string;
  order?: {
    id: string;
    displayId?: string;
    type?: string;
    status?: string;
    customer?: {
      name: string;
      phone?: { number: string };
    };
    items?: IFoodWebhookItem[];
    payments?: {
      methods?: Array<{ method: string; value: number }>;
    };
    delivery?: {
      deliveryAddress?: {
        streetName?: string;
        streetNumber?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        coordinates?: { latitude: number; longitude: number };
      };
    };
    total?: { orderAmount: number };
    notes?: string;
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    console.log("[iFood Webhook] Payload recebido:", JSON.stringify(rawBody, null, 2));

    const events: IFoodWebhookPayload[] = Array.isArray(rawBody) ? rawBody : [rawBody];

    for (const event of events) {
      const eventCode = (event.fullCode || event.code || event.orderStatus || "").toUpperCase();

      // Keepalive de verificação do iFood (não possui merchantId nem dados de pedido)
      if (eventCode === "KEEPALIVE" || eventCode === "KEEP_ALIVE") {
        console.log("[iFood Webhook] Keepalive recebido e confirmado.");
        continue;
      }

      const merchantId =
        event.merchantId ??
        event.restaurantId ??
        (event as any).merchant?.id;

      if (!merchantId) {
        console.warn("[iFood Webhook] Evento ignorado: sem merchantId", event);
        continue;
      }

      const [integration] = await db
        .select()
        .from(marketplaceIntegrationsTable)
        .where(eq(marketplaceIntegrationsTable.merchantId, merchantId))
        .limit(1);

      if (!integration || !integration.isActive) {
        console.warn(
          `[iFood Webhook] Integração não encontrada ou inativa para merchantId: ${merchantId}`,
        );
        continue;
      }

      const restaurantRecord = await db.query.restaurantsTable.findFirst({
        where: (t, { eq: eqFn }) => eqFn(t.id, integration.restaurantId),
        columns: { slug: true },
      });

      if (!restaurantRecord?.slug) {
        console.warn("[iFood Webhook] Restaurante não encontrado para id:", integration.restaurantId);
        continue;
      }

      const restaurant = await buscarRestaurantePorSlug(restaurantRecord.slug);
      if (!restaurant) {
        console.warn("[iFood Webhook] Restaurante não encontrado por slug:", restaurantRecord.slug);
        continue;
      }

      const isPlacedEvent =
        eventCode.includes("PLACED") ||
        eventCode.includes("CONFIRMED") ||
        eventCode === "PLC" ||
        event.order?.status === "PLACED";

      if (!isPlacedEvent) {
        console.log(`[iFood Webhook] Evento ${eventCode} recebido (não é novo pedido).`);
        continue;
      }

      // Buscar primeiro produto ativo do restaurante como fallback para testes de sandbox
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

      const orderData = event.order;
      const orderId = orderData?.id || event.orderId || `IFOOD-${Date.now().toString().slice(-6)}`;
      const customerName = orderData?.customer?.name || "Cliente iFood (Sandbox)";
      const customerPhone =
        orderData?.customer?.phone?.number?.replace(/\D/g, "") ||
        `IFOOD-${orderId.replace(/\D/g, "").slice(0, 8) || "99999999"}`;

      const delivery = orderData?.delivery?.deliveryAddress;
      const addressStr = delivery
        ? [
            delivery.streetName,
            delivery.streetNumber,
            delivery.neighborhood,
            delivery.city,
            delivery.state,
          ]
            .filter(Boolean)
            .join(", ")
        : "Endereço iFood Sandbox (Entrega Simulada)";

      // Mapeamento dos produtos: tenta casar com o banco ou usa o primeiro produto ativo da loja
      const mappings = (integration.menuMappings as Record<string, string>) ?? {};
      let finalProducts: Array<{ id: string; quantity: number }> = [];

      if (orderData?.items && orderData.items.length > 0) {
        // Obter IDs dos produtos cadastrados no restaurante para validação
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

        finalProducts = orderData.items.map((item) => {
          const mappedId = mappings[item.id] ?? item.id;
          if (existingIds.has(mappedId)) {
            return { id: mappedId, quantity: item.quantity || 1 };
          }
          // Fallback para primeiro produto do catálogo se o ID do sandbox não existir localmente
          return {
            id: firstProduct?.id || mappedId,
            quantity: item.quantity || 1,
          };
        });
      } else if (firstProduct) {
        // Quando o iFood envia evento de sandbox apenas com orderId (sem payload de order)
        finalProducts = [{ id: firstProduct.id, quantity: 1 }];
      }

      if (finalProducts.length === 0) {
        console.error(
          "[iFood Webhook] Não foi possível criar o pedido: nenhum produto ativo encontrado no restaurante.",
        );
        continue;
      }

      const notes = [
        orderData?.notes,
        `[Origem: iFood] ID Externo: ${orderId}`,
        orderData?.items?.length
          ? `Itens iFood: ${orderData.items.map((i) => `${i.name || i.id} (x${i.quantity})`).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

      try {
        console.log(`[iFood Webhook] Criando pedido no sistema para ${restaurant.slug}...`);
        const createdOrder = await criarPedido({
          slug: restaurant.slug,
          customerName,
          customerPhone,
          consumptionMethod: "DELIVERY",
          paymentMethod: "CARTAO_PRESENCIAL",
          deliveryAddress: addressStr,
          deliveryLatitude: delivery?.coordinates?.latitude,
          deliveryLongitude: delivery?.coordinates?.longitude,
          marketplaceOrderId: orderId,
          marketplaceType: "IFOOD",
          notes,
          products: finalProducts,
        });

        console.log(`[iFood Webhook] Pedido #${createdOrder.id} criado com sucesso! Notificando via WebSocket...`);
        await notificarNovoPedido(createdOrder.id, restaurant.slug);
      } catch (err) {
        console.error("[iFood Webhook] Erro ao executar criarPedido:", err);
      }
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (error) {
    console.error("[iFood Webhook] Erro crítico no handler:", error);
    return NextResponse.json({ ok: true });
  }
}
