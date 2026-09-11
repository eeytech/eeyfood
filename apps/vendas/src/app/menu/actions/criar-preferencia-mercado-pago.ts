"use server";

import type { ConsumptionMethod } from "@fsw/db";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { headers } from "next/headers";

import { normalizePhoneNumber } from "../helpers/phone";

interface CriarPreferenciaMercadoPagoInput {
  orderId: number | string;
  orderTotal: number | string;
  orderSummary: string;
  slug: string;
  consumptionMethod: ConsumptionMethod;
  phone: string;
}

export const criarPreferenciaMercadoPago = async ({
  orderId,
  orderTotal,
  orderSummary,
  slug,
  consumptionMethod,
  phone,
}: CriarPreferenciaMercadoPagoInput) => {
  const accessToken =
    process.env.MERCADO_PAGO_ACCESS_TOKEN ??
    process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("A chave do Mercado Pago não foi configurada.");
  }

  const cabecalhos = await headers();
  const origin = cabecalhos.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!origin) {
    throw new Error("Não foi possível determinar a URL base da aplicação.");
  }

  const rawTotal =
    typeof orderTotal === "string"
      ? orderTotal.replace(",", ".")
      : String(orderTotal ?? 0);
  const numericUnitPrice = Number(Number(rawTotal).toFixed(2));

  if (Number.isNaN(numericUnitPrice) || numericUnitPrice <= 0) {
    throw new Error(
      `Valor total do pedido inválido para pagamento via Mercado Pago: ${orderTotal}`
    );
  }

  const searchParams = new URLSearchParams();
  searchParams.set("consumptionMethod", consumptionMethod);
  searchParams.set("phone", normalizePhoneNumber(phone));

  const client = new MercadoPagoConfig({
    accessToken,
  });

  const preference = new Preference(client);

  const notificationUrl =
    process.env.MERCADO_PAGO_WEBHOOK_URL ??
    (origin.startsWith("https://")
      ? `${origin}/api/webhooks/mercado-pago`
      : undefined);

  try {
    const response = await preference.create({
      body: {
        external_reference: String(orderId),
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        back_urls: {
          success: `${origin}/orders?${searchParams.toString()}`,
          failure: `${origin}/orders?${searchParams.toString()}`,
          pending: `${origin}/orders?${searchParams.toString()}`,
        },
        auto_return: "approved",
        metadata: {
          orderId: Number(orderId),
          restaurantSlug: slug,
        },
        items: [
          {
            id: String(orderId),
            title: `Pedido #${String(orderId)}`,
            description: orderSummary?.trim() || `Pedido #${String(orderId)}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: numericUnitPrice,
          },
        ],
      },
    });

    const initPoint = response.init_point ?? response.sandbox_init_point;

    if (!initPoint) {
      throw new Error("O Mercado Pago não retornou uma URL de pagamento.");
    }

    return { initPoint };
  } catch (error) {
    console.error("Erro ao criar preferência do Mercado Pago:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Não foi possível gerar o link de pagamento do Mercado Pago.");
  }
};

