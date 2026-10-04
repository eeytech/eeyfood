"use server";

import type { ConsumptionMethod } from "@fsw/db";
import { headers } from "next/headers";

import { db, eq, ordersTable, restaurantsTable } from "@/lib/db";
import { normalizePhoneNumber } from "../helpers/phone";

interface CriarCheckoutInfinitePayInput {
  orderId: number | string;
  orderTotal?: number | string;
  orderSummary?: string;
  slug: string;
  consumptionMethod: ConsumptionMethod;
  phone: string;
  handle?: string | null;
}

export const criarCheckoutInfinitePay = async ({
  orderId,
  orderTotal,
  orderSummary,
  slug,
  consumptionMethod,
  phone,
  handle: explicitHandle,
}: CriarCheckoutInfinitePayInput) => {
  if (consumptionMethod === "DINE_IN") {
    throw new Error("Pagamento online não está disponível para consumo no local.");
  }

  const numericOrderId = Number(orderId);

  // Buscar pedido diretamente no banco para obter o total real
  let orderRecord: {
    id: number;
    total: number;
    paymentStatus: string;
    status: string;
  } | null = null;

  if (!Number.isNaN(numericOrderId)) {
    try {
      const [found] = await db
        .select({
          id: ordersTable.id,
          total: ordersTable.total,
          paymentStatus: ordersTable.paymentStatus,
          status: ordersTable.status,
        })
        .from(ordersTable)
        .where(eq(ordersTable.id, numericOrderId))
        .limit(1);

      if (found) {
        orderRecord = found;
      }
    } catch (err) {
      console.error(
        "Aviso: Não foi possível buscar o pedido no banco antes do checkout InfinitePay:",
        err,
      );
    }
  }

  // Determinar o total oficial
  const rawTotal =
    orderRecord !== null
      ? String(orderRecord.total ?? 0)
      : typeof orderTotal === "string"
        ? orderTotal.replace(",", ".")
        : String(orderTotal ?? 0);

  const numericUnitPrice = Number(Number(rawTotal).toFixed(2));

  // Se o pedido tiver valor zero ou negativo (gratuito)
  if (numericUnitPrice <= 0) {
    if (orderRecord && orderRecord.paymentStatus !== "PAID") {
      try {
        await db
          .update(ordersTable)
          .set({
            paymentStatus: "PAID",
            updatedAt: new Date(),
          })
          .where(eq(ordersTable.id, numericOrderId));
      } catch (err) {
        console.error("Falha ao confirmar status de pedido gratuito:", err);
      }
    }
    return { initPoint: null, isFree: true };
  }

  // Handle da InfinitePay (InfiniteTag)
  let restaurantHandle = explicitHandle;

  if (!restaurantHandle && slug) {
    try {
      const [rest] = await db
        .select({ infinitePayHandle: restaurantsTable.infinitePayHandle })
        .from(restaurantsTable)
        .where(eq(restaurantsTable.slug, slug))
        .limit(1);

      if (rest?.infinitePayHandle) {
        restaurantHandle = rest.infinitePayHandle;
      }
    } catch (err) {
      console.error(
        "Aviso: Não foi possível buscar o handle do restaurante no banco:",
        err,
      );
    }
  }

  const rawHandle =
    restaurantHandle ||
    process.env.INFINITEPAY_HANDLE ||
    process.env.INFINITE_PAY_HANDLE;

  if (!rawHandle) {
    throw new Error(
      "A InfiniteTag do estabelecimento não foi configurada nas opções de pagamento.",
    );
  }

  // Remove $ ou @ se tiver sido digitado
  const cleanHandle = rawHandle.replace(/^[$@]/, "").trim();

  const cabecalhos = await headers();
  const origin = cabecalhos.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const searchParams = new URLSearchParams();
  searchParams.set("consumptionMethod", consumptionMethod);
  searchParams.set("phone", normalizePhoneNumber(phone));

  const redirectUrl = `${origin}/orders?${searchParams.toString()}`;
  const webhookUrl =
    process.env.INFINITEPAY_WEBHOOK_URL ??
    (origin.startsWith("https://")
      ? `${origin}/api/webhooks/infinitepay`
      : undefined);

  // Valor em centavos para a InfinitePay (ex: R$ 45,90 = 4590)
  const amountInCents = Math.round(numericUnitPrice * 100);

  const payload: Record<string, unknown> = {
    handle: cleanHandle,
    items: [
      {
        name: `Pedido #${orderId}`,
        description: orderSummary?.trim() || `Pedido #${orderId} - ${slug}`,
        quantity: 1,
        unit_price: amountInCents,
      },
    ],
    order_nsu: String(orderId),
    redirect_url: redirectUrl,
  };

  if (webhookUrl) {
    payload.webhook_url = webhookUrl;
  }

  const response = await fetch("https://api.checkout.infinitepay.io/links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("Erro na API InfinitePay:", response.status, errorBody);

    let parsed: {
      error?: string;
      message?: string;
      redirect_url?: string;
    } | null = null;

    try {
      parsed = JSON.parse(errorBody);
    } catch {
      // Body não é JSON
    }

    if (parsed?.error === "external_checkout_not_enabled") {
      const redirectLink =
        parsed.redirect_url ||
        "https://app.infinitepay.io/external-checkout#configuracoes?enabled=true";
      throw new Error(
        `O Checkout Externo não está ativado na conta InfinitePay ($${cleanHandle}). Para ativar e receber pagamentos online, acesse as configurações da InfinitePay: ${redirectLink}`,
      );
    }

    if (
      parsed?.error === "merchant_not_found" ||
      parsed?.message?.toLowerCase().includes("merchant not found") ||
      parsed?.message?.toLowerCase().includes("handle not found")
    ) {
      throw new Error(
        `A InfiniteTag ($${cleanHandle}) informada não foi encontrada na InfinitePay. Verifique as configurações do estabelecimento.`,
      );
    }

    const message =
      parsed?.message ||
      (typeof parsed?.error === "string" ? parsed.error : null) ||
      errorBody ||
      response.statusText;

    throw new Error(
      `Não foi possível gerar o link de pagamento na InfinitePay: ${message}`,
    );
  }

  const data = await response.json();
  const checkoutUrl =
    data.url || data.link || data.checkout_url || data.init_point;

  if (!checkoutUrl) {
    throw new Error("A InfinitePay não retornou a URL de checkout.");
  }

  return { initPoint: checkoutUrl };
};
