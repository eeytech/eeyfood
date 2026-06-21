import {
  criarPedido,
  db,
  eq,
  marketplaceIntegrationsTable,
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
  } catch { /* non-critical */ }
};

interface IFoodWebhookPayload {
  orderId: string;
  orderStatus?: string;
  restaurantId?: string;
  merchantId?: string;
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
    items?: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
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
    const body = (await request.json()) as IFoodWebhookPayload;

    const merchantId = body.merchantId ?? body.restaurantId;
    if (!merchantId) {
      return NextResponse.json({ ok: true });
    }

    const [integration] = await db
      .select()
      .from(marketplaceIntegrationsTable)
      .where(eq(marketplaceIntegrationsTable.merchantId, merchantId))
      .limit(1);

    if (!integration || !integration.isActive) {
      return NextResponse.json({ ok: true });
    }

    const restaurant = await buscarRestaurantePorSlug(
      (await db.query.restaurantsTable.findFirst({
        where: (t, { eq: eqFn }) => eqFn(t.id, integration.restaurantId),
        columns: { slug: true },
      }))?.slug ?? "",
    );

    if (!restaurant) {
      return NextResponse.json({ ok: true });
    }

    const eventCode = body.fullCode ?? body.orderStatus ?? "";

    if (
      eventCode.includes("PLACED") ||
      eventCode.includes("CONFIRMED") ||
      body.order?.status === "PLACED"
    ) {
      const order = body.order;
      if (!order) return NextResponse.json({ ok: true });

      const customerName = order.customer?.name ?? "Cliente iFood";
      const customerPhone =
        order.customer?.phone?.number?.replace(/\D/g, "") ?? `IFOOD-${order.id.slice(0, 8)}`;

      const delivery = order.delivery?.deliveryAddress;
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
        : undefined;

      const mappings = (integration.menuMappings as Record<string, string>) ?? {};
      const products = (order.items ?? []).map((item) => ({
        id: mappings[item.id] ?? item.id,
        quantity: item.quantity,
      }));

      if (products.length > 0) {
        try {
          const createdOrder = await criarPedido({
            slug: restaurant.slug,
            customerName,
            customerPhone,
            consumptionMethod: "DELIVERY",
            paymentMethod: "CARTAO_PRESENCIAL",
            deliveryAddress: addressStr,
            deliveryLatitude: delivery?.coordinates?.latitude,
            deliveryLongitude: delivery?.coordinates?.longitude,
            marketplaceOrderId: order.id,
            marketplaceType: "IFOOD",
            notes: order.notes,
            products,
          });

          await notificarNovoPedido(createdOrder.id, restaurant.slug);
        } catch {
          // Log silently — iFood must get 200 to avoid retries
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
