"use server";

import { revalidatePath } from "next/cache";

import { buscarRestaurantePorSlug, type ConsumptionMethod, criarPedido, type PaymentMethod } from "@/lib/db";
import { notificarNovoPedido } from "@/lib/notificar-novo-pedido";

import { normalizePhoneNumber } from "../helpers/phone";

interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  products: Array<{
    id: string;
    quantity: number;
    selectedOptions?: string[];
    notes?: string;
  }>;
  consumptionMethod: ConsumptionMethod;
  paymentMethod: PaymentMethod;
  changeFor?: number;
  scheduledFor?: string;
  abandonedCartSessionId?: string;
  couponCode?: string;
  useWalletBalance?: boolean;
  diningTableId?: string;
  slug: string;
}

export const createOrder = async (input: CreateOrderInput) => {
  const restaurant = await buscarRestaurantePorSlug(input.slug);

  if (!restaurant) {
    throw new Error("Restaurante não encontrado.");
  }

  if (input.couponCode?.trim() && !restaurant.isCouponsEnabled) {
    throw new Error("Este restaurante não aceita cupons de desconto no momento.");
  }

  if (input.useWalletBalance && !restaurant.isCashbackEnabled) {
    throw new Error("Este restaurante não aceita uso de saldo cashback no momento.");
  }

  if (input.paymentMethod === "MERCADO_PAGO" && !restaurant.acceptMercadoPago) {
    throw new Error("Este restaurante não aceita pagamento via Mercado Pago no momento.");
  }

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
    diningTableId: input.diningTableId,
  });

  revalidatePath(`/${input.slug}/orders`);
  await notificarNovoPedido({
    orderId: order.id,
    restaurantSlug: input.slug,
  });

  return order;
};
