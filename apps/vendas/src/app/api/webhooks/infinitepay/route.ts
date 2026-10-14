import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { atualizarStatusPagamentoPedido, db, eq, ordersTable } from "@/lib/db";
import { verifyOrderWebhookToken } from "@/lib/webhook-signature";

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

    // Validação estrita de autenticidade: Token HMAC ou secret header
    const token =
      requestUrl.searchParams.get("token") ||
      (typeof payload?.token === "string" ? payload.token : null);
    const secret =
      request.headers.get("x-webhook-secret") ||
      requestUrl.searchParams.get("secret");

    const isValid = verifyOrderWebhookToken(orderId, token, secret);
    if (!isValid) {
      console.warn(
        `[InfinitePay Webhook] Rejeitada tentativa de webhook não autorizada para o pedido #${orderId}`,
      );
      return NextResponse.json(
        { error: "Assinatura ou chave de webhook inválida." },
        { status: 401 },
      );
    }

    // Verificar se o pedido existe e qual seu status atual
    const [existingOrder] = await db
      .select({ id: ordersTable.id, paymentStatus: ordersTable.paymentStatus })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (existingOrder.paymentStatus === "PAID") {
      return NextResponse.json({ received: true, alreadyPaid: true });
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
