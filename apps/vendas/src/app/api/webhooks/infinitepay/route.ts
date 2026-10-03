import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { atualizarStatusPagamentoPedido } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    // A InfinitePay envia order_nsu no body (ou em query params)
    const rawOrderId =
      payload?.order_nsu ??
      payload?.orderId ??
      payload?.order_id ??
      requestUrl.searchParams.get("order_nsu") ??
      requestUrl.searchParams.get("orderId");

    const orderId = Number(rawOrderId);

    if (Number.isNaN(orderId) || !orderId) {
      console.warn("[InfinitePay Webhook] order_nsu inválido ou ausente:", payload);
      return NextResponse.json({ received: true, ignored: true });
    }

    // A notificação de webhook da InfinitePay é disparada quando o pagamento é concluído/aprovado
    const updatedOrder = await atualizarStatusPagamentoPedido({
      orderId,
      paymentStatus: "PAID",
    });

    if (updatedOrder) {
      revalidatePath("/menu");
      revalidatePath("/orders");
      if (updatedOrder.restaurantSlug) {
        revalidatePath(`/${updatedOrder.restaurantSlug}/menu`);
        revalidatePath(`/${updatedOrder.restaurantSlug}/orders`);
      }
    }

    return NextResponse.json({
      received: true,
      orderId,
      status: "PAID",
    });
  } catch (error) {
    console.error("[InfinitePay Webhook] Erro ao processar notificação:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook" },
      { status: 500 },
    );
  }
}
