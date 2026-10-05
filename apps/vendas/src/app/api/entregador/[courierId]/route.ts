import {
  atualizarLocalizacaoEntregador,
  buscarPedidosParaEntregador,
  couriersTable,
  db,
  eq,
  ordersTable,
  registrarComprovanteEntrega,
  restaurantsTable,
} from "@fsw/db";
import { NextResponse } from "next/server";

const notificarLocalizacao = async (
  courierId: string,
  restaurantSlug: string,
  latitude: number,
  longitude: number,
) => {
  const url =
    process.env.WEBSOCKET_SERVER_URL ||
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
    "http://localhost:4000";
  try {
    await fetch(`${url}/eventos/localizacao-entregador`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courierId, restaurantSlug, latitude, longitude }),
      cache: "no-store",
    });
  } catch { /* non-critical */ }
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courierId: string }> },
) {
  const { courierId } = await params;

  const [result] = await db
    .select({
      courier: couriersTable,
      restaurantSlug: restaurantsTable.slug,
    })
    .from(couriersTable)
    .innerJoin(restaurantsTable, eq(restaurantsTable.id, couriersTable.restaurantId))
    .where(eq(couriersTable.id, courierId))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "Entregador não encontrado." }, { status: 404 });
  }

  const orders = await buscarPedidosParaEntregador(courierId);
  return NextResponse.json({
    courier: result.courier,
    restaurantSlug: result.restaurantSlug,
    orders,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courierId: string }> },
) {
  const { courierId } = await params;
  const body = (await request.json()) as {
    action: "update_location" | "toggle_availability" | "claim_order" | "deliver_order";
    latitude?: number;
    longitude?: number;
    isAvailable?: boolean;
    orderId?: number;
    proofUrl?: string;
    restaurantSlug?: string;
  };

  const [courier] = await db
    .select({
      id: couriersTable.id,
      restaurantId: couriersTable.restaurantId,
      restaurantSlug: restaurantsTable.slug,
    })
    .from(couriersTable)
    .innerJoin(restaurantsTable, eq(restaurantsTable.id, couriersTable.restaurantId))
    .where(eq(couriersTable.id, courierId))
    .limit(1);

  if (!courier) {
    return NextResponse.json({ error: "Entregador não encontrado." }, { status: 404 });
  }

  if (body.action === "update_location" && body.latitude !== undefined && body.longitude !== undefined) {
    await atualizarLocalizacaoEntregador(courierId, body.latitude, body.longitude);
    const targetSlug = body.restaurantSlug || courier.restaurantSlug;
    if (targetSlug) {
      await notificarLocalizacao(courierId, targetSlug, body.latitude, body.longitude);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle_availability" && body.isAvailable !== undefined) {
    await db
      .update(couriersTable)
      .set({ isAvailable: body.isAvailable, updatedAt: new Date() })
      .where(eq(couriersTable.id, courierId));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "claim_order" && body.orderId !== undefined) {
    await db
      .update(ordersTable)
      .set({
        courierId,
        status: "OUT_FOR_DELIVERY",
        dispatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, body.orderId));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "deliver_order" && body.orderId !== undefined && body.proofUrl) {
    await registrarComprovanteEntrega(
      body.orderId,
      body.proofUrl,
      body.latitude,
      body.longitude,
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
