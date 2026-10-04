"use server";

import type { ConsumptionMethod } from "@fsw/db";

import { revalidatePath } from "next/cache";

import { db, eq, ordersTable } from "@/lib/db";
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
  mercadoPagoAccessToken?: string | null;
}

export const criarCheckoutOnline = async (input: CriarCheckoutOnlineInput) => {
  try {
    if (input.gateway === "INFINITEPAY") {
      return await criarCheckoutInfinitePay({
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
    return await criarPreferenciaMercadoPago({
      orderId: input.orderId,
      orderTotal: input.orderTotal,
      orderSummary: input.orderSummary,
      slug: input.slug,
      consumptionMethod: input.consumptionMethod,
      phone: input.phone,
      accessToken: input.mercadoPagoAccessToken,
    });
  } catch (error) {
    const numericOrderId = Number(input.orderId);
    if (!Number.isNaN(numericOrderId) && numericOrderId > 0) {
      try {
        await db
          .update(ordersTable)
          .set({
            status: "CANCELLED",
            paymentStatus: "FAILED",
            updatedAt: new Date(),
          })
          .where(eq(ordersTable.id, numericOrderId));

        revalidatePath("/orders");
        if (input.slug) {
          revalidatePath(`/${input.slug}/orders`);
        }
      } catch (dbErr) {
        console.error(
          "Falha ao cancelar pedido após erro de checkout online:",
          dbErr,
        );
      }
    }
    throw error;
  }
};
