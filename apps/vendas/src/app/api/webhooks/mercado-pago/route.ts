import { MercadoPagoConfig, Payment } from "mercadopago";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { atualizarStatusPagamentoPedido } from "@/lib/db";

const getPaymentId = (
  payload: Record<string, unknown> | null,
  requestUrl: URL,
): number | null => {
  const payloadData =
    payload?.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : null;

  const rawId =
    payloadData?.id ??
    payload?.id ??
    requestUrl.searchParams.get("data.id") ??
    requestUrl.searchParams.get("id");

  const paymentId = Number(rawId);
  return Number.isNaN(paymentId) ? null : paymentId;
};

const getTopic = (
  payload: Record<string, unknown> | null,
  requestUrl: URL,
): string | null => {
  const rawTopic =
    payload?.type ??
    payload?.action ??
    requestUrl.searchParams.get("type") ??
    requestUrl.searchParams.get("topic");

  return typeof rawTopic === "string" ? rawTopic : null;
};

const mapearStatusPagamento = (status: string | undefined) => {
  if (status === "approved") {
    return "PAID" as const;
  }

  if (["cancelled", "rejected", "refunded", "charged_back"].includes(status ?? "")) {
    if (status === "refunded") {
      return "REFUNDED" as const;
    }

    if (status === "cancelled") {
      return "CANCELLED" as const;
    }

    return "FAILED" as const;
  }

  return null;
};

export async function POST(request: Request) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("A chave do Mercado Pago não foi configurada.");
  }

  const requestUrl = new URL(request.url);
  const payload = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  const topic = getTopic(payload, requestUrl);
  const paymentId = getPaymentId(payload, requestUrl);

  if (!paymentId || (topic !== "payment" && topic !== "payment.updated")) {
    return NextResponse.json({ received: true });
  }

  const client = new MercadoPagoConfig({
    accessToken,
  });

  const payment = new Payment(client);
  const paymentDetails = await payment.get({ id: paymentId });
  const paymentStatus = mapearStatusPagamento(paymentDetails.status);

  if (!paymentStatus) {
    return NextResponse.json({ received: true });
  }

  const orderId = Number(
    paymentDetails.external_reference ?? paymentDetails.metadata?.orderId,
  );

  if (Number.isNaN(orderId)) {
    return NextResponse.json({ received: true });
  }

  const updatedOrder = await atualizarStatusPagamentoPedido({
    orderId,
    paymentStatus,
  });

  if (updatedOrder) {
    revalidatePath(`/${updatedOrder.restaurantSlug}/menu`);
    revalidatePath(`/${updatedOrder.restaurantSlug}/orders`);
  }

  return NextResponse.json({
    received: true,
  });
}
