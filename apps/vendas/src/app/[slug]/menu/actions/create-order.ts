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
  scheduledFor?: string;
  abandonedCartSessionId?: string;
  couponCode?: string;
  useWalletBalance?: boolean;
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
    scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
    abandonedCartSessionId: input.abandonedCartSessionId,
    couponCode: input.couponCode?.trim().toUpperCase(),
    useWalletBalance: input.useWalletBalance,
  });

  revalidatePath(`/${input.slug}/orders`);
  await notificarNovoPedido({
    orderId: order.id,
    restaurantSlug: input.slug,
  });

  return order;
};
