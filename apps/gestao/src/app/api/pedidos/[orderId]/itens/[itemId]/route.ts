import {
  atualizarStatusItemPedido,
  buscarPedidoRecebimentoPorId,
  type OrderProductItemStatus,
} from "@fsw/db";
import { NextResponse } from "next/server";

import { notificarItemAtualizado } from "@/lib/notificar-item-atualizado";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ orderId: string; itemId: string }>;
}

const ITEM_STATUS_VALUES: OrderProductItemStatus[] = ["PENDING", "READY"];

const isItemStatus = (value: unknown): value is OrderProductItemStatus =>
  typeof value === "string" && ITEM_STATUS_VALUES.includes(value as OrderProductItemStatus);

export async function PATCH(request: Request, context: RouteContext) {
  const { orderId: orderIdStr, itemId } = await context.params;
  const orderId = Number(orderIdStr);

  if (Number.isNaN(orderId) || !itemId) {
    return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const itemStatus = body?.itemStatus;

  if (!isItemStatus(itemStatus)) {
    return NextResponse.json({ message: "Status de item inválido." }, { status: 400 });
  }

  const updated = await atualizarStatusItemPedido({ itemId, itemStatus });

  if (!updated) {
    return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  }

  const order = await buscarPedidoRecebimentoPorId(orderId);

  if (order) {
    await notificarItemAtualizado({
      orderId,
      itemId,
      restaurantSlug: order.restaurant.slug,
      itemStatus,
    });
  }

  return NextResponse.json(updated);
}
