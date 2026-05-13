"use server";

import { revalidatePath } from "next/cache";

import { type ConsumptionMethod, criarPedido, type PaymentMethod } from "@/lib/db";
import { notificarNovoPedido } from "@/lib/notificar-novo-pedido";

import { normalizePhoneNumber } from "../helpers/phone";

interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  products: Array<{
    id: string;
    quantity: number;
  }>;
  consumptionMethod: ConsumptionMethod;
  paymentMethod: PaymentMethod;
  changeFor?: number;
  slug: string;
}

export const createOrder = async (input: CreateOrderInput) => {
  const order = await criarPedido({
    ...input,
    customerPhone: normalizePhoneNumber(input.customerPhone),
    changeFor:
      input.paymentMethod === "DINHEIRO" && input.changeFor
        ? input.changeFor
        : undefined,
  });

  revalidatePath(`/${input.slug}/orders`);
  await notificarNovoPedido({
    orderId: order.id,
    restaurantSlug: input.slug,
  });

  return order;
};
