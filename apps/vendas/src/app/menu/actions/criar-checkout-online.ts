"use server";

import type { ConsumptionMethod } from "@fsw/db";

import { criarCheckoutInfinitePay } from "./criar-checkout-infinitepay";
import { criarPreferenciaMercadoPago } from "./criar-preferencia-mercado-pago";

export interface CriarCheckoutOnlineInput {
  gateway?: "MERCADO_PAGO" | "INFINITEPAY" | string;
  orderId: number | string;
  orderTotal?: number | string;
  orderSummary?: string;
  slug: string;
  consumptionMethod: ConsumptionMethod;
  phone: string;
  infinitePayHandle?: string | null;
}

export const criarCheckoutOnline = async (input: CriarCheckoutOnlineInput) => {
  if (input.gateway === "INFINITEPAY") {
    return criarCheckoutInfinitePay({
      orderId: input.orderId,
      orderTotal: input.orderTotal,
      orderSummary: input.orderSummary,
      slug: input.slug,
      consumptionMethod: input.consumptionMethod,
      phone: input.phone,
      handle: input.infinitePayHandle,
    });
  }

  // Padrão: Mercado Pago
  return criarPreferenciaMercadoPago({
    orderId: input.orderId,
    orderTotal: input.orderTotal,
    orderSummary: input.orderSummary,
    slug: input.slug,
    consumptionMethod: input.consumptionMethod,
    phone: input.phone,
  });
};
