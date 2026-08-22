"use server";

import { type ConsumptionMethod } from "@fsw/db";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { headers } from "next/headers";

import { normalizePhoneNumber } from "../helpers/phone";

interface CriarPreferenciaMercadoPagoInput {
  orderId: number;
  orderTotal: number;
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
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("A chave do Mercado Pago nao foi configurada.");
  }

  const cabecalhos = await headers();
  const origin = cabecalhos.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!origin) {
    throw new Error("Nao foi possivel determinar a URL base da aplicacao.");
  }

  const searchParams = new URLSearchParams();
  searchParams.set("consumptionMethod", consumptionMethod);
  searchParams.set("phone", normalizePhoneNumber(phone));

  const client = new MercadoPagoConfig({
    accessToken,
  });

  const preference = new Preference(client);
  const response = await preference.create({
    body: {
      external_reference: String(orderId),
      notification_url:
        process.env.MERCADO_PAGO_WEBHOOK_URL ??
        `${origin}/api/webhooks/mercado-pago`,
      back_urls: {
        success: `${origin}/${slug}/orders?${searchParams.toString()}`,
        failure: `${origin}/${slug}/orders?${searchParams.toString()}`,
        pending: `${origin}/${slug}/orders?${searchParams.toString()}`,
      },
      auto_return: "approved",
      metadata: {
        orderId,
        restaurantSlug: slug,
      },
      items: [
        {
          id: String(orderId),
          title: `Pedido #${String(orderId)}`,
          description: orderSummary,
          quantity: 1,
          currency_id: "BRL",
          unit_price: orderTotal,
        },
      ],
    },
  });

  const initPoint = response.init_point ?? response.sandbox_init_point;

  if (!initPoint) {
    throw new Error("O Mercado Pago nao retornou uma URL de pagamento.");
  }

  return { initPoint };
};
