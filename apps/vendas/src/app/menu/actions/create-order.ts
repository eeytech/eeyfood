"use server";

import { revalidatePath } from "next/cache";

import {
  atualizarUsoEnderecoCliente,
  buscarRestaurantePorSlug,
  criarPedido,
  salvarOuAtualizarEnderecoCliente,
} from "@/lib/db";
import type { ConsumptionMethod, PaymentMethod } from "@/lib/db";
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
  deliveryAddress?: string;
  customerAddressId?: string;
  deliveryAddressData?: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    reference?: string;
  };
  deliveryLatitude?: number;
  deliveryLongitude?: number;
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

  const consumptionMethodAllowed =
    (input.consumptionMethod === "DELIVERY" && restaurant.isDeliveryEnabled) ||
    (input.consumptionMethod === "TAKEAWAY" && restaurant.isTakeawayEnabled) ||
    (input.consumptionMethod === "DINE_IN" && restaurant.isDineInEnabled);

  if (!consumptionMethodAllowed) {
    throw new Error("Este método de consumo não está disponível neste restaurante no momento.");
  }

  const normalizedCustomerPhone = normalizePhoneNumber(input.customerPhone);
  let resolvedAddressId = input.customerAddressId;
  let formattedDeliveryAddress = input.deliveryAddress;

  if (input.consumptionMethod === "DELIVERY") {
    if (input.deliveryAddressData) {
      const { street, number, neighborhood, complement, reference } = input.deliveryAddressData;
      const formatted = `${street}, ${number} - ${neighborhood}${complement ? ` (${complement})` : ""}`;
      formattedDeliveryAddress = formatted;

      try {
        const savedAddress = await salvarOuAtualizarEnderecoCliente({
          customerPhone: normalizedCustomerPhone,
          street,
          number,
          neighborhood,
          complement,
          reference,
        });
        if (savedAddress) {
          resolvedAddressId = savedAddress.id;
        }
      } catch (err) {
        console.error("Falha ao salvar endereço do cliente:", err);
      }
    } else if (resolvedAddressId) {
      try {
        await atualizarUsoEnderecoCliente(resolvedAddressId);
      } catch (err) {
        console.error("Falha ao atualizar uso do endereço:", err);
      }
    }
  }

  const order = await criarPedido({
    ...input,
    customerPhone: normalizedCustomerPhone,
    changeFor:
      input.paymentMethod === "DINHEIRO" && input.changeFor
        ? input.changeFor
        : undefined,
    scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
    abandonedCartSessionId: input.abandonedCartSessionId,
    couponCode: input.couponCode?.trim().toUpperCase(),
    useWalletBalance: input.useWalletBalance,
    diningTableId: input.diningTableId,
    deliveryAddress: formattedDeliveryAddress,
    customerAddressId: resolvedAddressId,
    deliveryLatitude: input.deliveryLatitude,
    deliveryLongitude: input.deliveryLongitude,
  });

  revalidatePath("/orders");
  if (input.slug) {
    revalidatePath(`/${input.slug}/orders`);
  }
  // Não bloqueia resposta ao cliente — falha silenciosa é aceitável aqui
  notificarNovoPedido({ orderId: order.id, restaurantSlug: input.slug });

  return order;
};
