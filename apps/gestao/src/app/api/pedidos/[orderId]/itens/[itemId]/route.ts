import { atualizarStatusItemPedido, buscarPedidoRecebimentoPorId } from "@fsw/db";
import type { OrderProductItemStatus } from "@fsw/db";
import { NextResponse } from "next/server";

import { notificarItemAtualizado } from "@/lib/notificar-item-atualizado";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ orderId: string; itemId: string }>;
}

const ITEM_STATUS_VALUES: OrderProductItemStatus[] = ["PENDING", "READY"];

const isItemStatus = (value: unknown): value is OrderProductItemStatus =>
  typeof value === "string" && ITEM_STATUS_VALUES.includes(value as OrderProductItemStatus);

// Extrai o slug do restaurante autenticado injetado pelo middleware JWT
const getCompanySlug = (request: Request): string | null => {
  const raw = request.headers.get("x-user-data");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { companySlug?: unknown };
    return typeof parsed.companySlug === "string" ? parsed.companySlug : null;
  } catch {
    return null;
  }
};

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

  // IDOR: busca o pedido para validar pertença ao restaurante e ao orderId da URL
  const order = await buscarPedidoRecebimentoPorId(orderId);

  if (!order) {
    return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }

  const companySlug = getCompanySlug(request);
  if (companySlug && order.restaurant.slug !== companySlug) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  // Garante que o item informado pertence ao pedido da URL
  const itemBelongsToOrder = order.orderProducts.some((p) => p.id === itemId);
  if (!itemBelongsToOrder) {
    return NextResponse.json(
      { message: "Item não encontrado neste pedido." },
      { status: 404 },
    );
  }

  const updated = await atualizarStatusItemPedido({ itemId, itemStatus });

  if (!updated) {
    return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  }

  // Reutiliza os dados do pedido já carregados para notificação (evita query dupla)
  await notificarItemAtualizado({
    orderId,
    itemId,
    restaurantSlug: order.restaurant.slug,
    itemStatus,
  });

  return NextResponse.json(updated);
}
