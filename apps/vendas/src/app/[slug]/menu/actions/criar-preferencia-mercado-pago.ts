"use server";

import { type ConsumptionMethod,inArray, productsTable } from "@fsw/db";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { headers } from "next/headers";

import { db } from "@/lib/db";

import { CartProduct } from "../contexts/cart";
import { removeCpfPunctuation } from "../helpers/cpf";

interface CriarPreferenciaMercadoPagoInput {
  products: CartProduct[];
  orderId: number;
  slug: string;
  consumptionMethod: ConsumptionMethod;
  cpf: string;
}

export const criarPreferenciaMercadoPago = async ({
  orderId,
  products,
  slug,
  consumptionMethod,
  cpf,
}: CriarPreferenciaMercadoPagoInput) => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("A chave do Mercado Pago não foi configurada.");
  }

  const cabecalhos = await headers();
  const origin =
    cabecalhos.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!origin) {
    throw new Error("Não foi possível determinar a URL base da aplicação.");
  }

  const productsWithPrices = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, products.map((product) => product.id)));

  const productsMap = new Map(
    productsWithPrices.map((product) => [product.id, product.price]),
  );

  const searchParams = new URLSearchParams();
  searchParams.set("consumptionMethod", consumptionMethod);
  searchParams.set("cpf", removeCpfPunctuation(cpf));

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
      items: products.map((product) => ({
        id: product.id,
        title: product.name,
        picture_url: product.imageUrl,
        quantity: product.quantity,
        currency_id: "BRL",
        unit_price: productsMap.get(product.id) ?? product.price,
      })),
    },
  });

  const initPoint = response.init_point ?? response.sandbox_init_point;

  if (!initPoint) {
    throw new Error("O Mercado Pago não retornou uma URL de pagamento.");
  }

  return { initPoint };
};
