import { MercadoPagoConfig, Payment } from "mercadopago";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  atualizarStatusPagamentoPedido,
  db,
  eq,
  restaurantsTable,
} from "@/lib/db";

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
  const requestUrl = new URL(request.url);
  const payload = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  const topic = getTopic(payload, requestUrl);
  const paymentId = getPaymentId(payload, requestUrl);

  if (!paymentId || (topic !== "payment" && topic !== "payment.updated")) {
    return NextResponse.json({ received: true });
  }

  // 1. Tentar obter o token do restaurante via restaurantSlug da URL
  let accessToken: string | null = null;
  const restaurantSlug = requestUrl.searchParams.get("restaurantSlug");

  if (restaurantSlug) {
    try {
      const [rest] = await db
        .select({
          mercadoPagoAccessToken: restaurantsTable.mercadoPagoAccessToken,
        })
        .from(restaurantsTable)
        .where(eq(restaurantsTable.slug, restaurantSlug))
        .limit(1);

      if (rest?.mercadoPagoAccessToken) {
        accessToken = rest.mercadoPagoAccessToken;
      }
    } catch (err) {
      console.error(
        "[Mercado Pago Webhook] Erro ao buscar token do restaurante por slug:",
        err,
      );
    }
  }

  // 2. Fallback para variáveis de ambiente
  if (!accessToken) {
    accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN ??
      process.env.MERCADOPAGO_ACCESS_TOKEN ??
      null;
  }

  // 3. Fallback: procurar restaurante configurado com gateway MERCADO_PAGO
  if (!accessToken) {
    try {
      const [rest] = await db
        .select({
          mercadoPagoAccessToken: restaurantsTable.mercadoPagoAccessToken,
        })
        .from(restaurantsTable)
        .where(eq(restaurantsTable.onlinePaymentGateway, "MERCADO_PAGO"))
        .limit(1);

      if (rest?.mercadoPagoAccessToken) {
        accessToken = rest.mercadoPagoAccessToken;
      }
    } catch {
      // ignorar erro em fallback secundário
    }
  }

  if (!accessToken) {
    console.error(
      "[Mercado Pago Webhook] Nenhum Access Token do Mercado Pago encontrado para validar o pagamento.",
    );
    return NextResponse.json(
      { error: "Access token não configurado" },
      { status: 500 },
    );
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
    revalidatePath("/menu");
    revalidatePath("/orders");
    if (updatedOrder.restaurantSlug) {
      revalidatePath(`/${updatedOrder.restaurantSlug}/menu`);
      revalidatePath(`/${updatedOrder.restaurantSlug}/orders`);
    }
  }

  return NextResponse.json({
    received: true,
  });
}
