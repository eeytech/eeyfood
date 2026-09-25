"use server";

import { revalidatePath } from "next/cache";

import {
  atualizarUsoEnderecoCliente,
  buscarRestaurantePorSlug,
  criarPedido,
  db,
  eq,
  geocodeAddress,
  ordersTable,
  salvarClienteCrm,
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
    name?: string;
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
  deliveryNeighborhood?: string;
  deliveryCep?: string;
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

  if (input.paymentMethod === "MERCADO_PAGO") {
    if (!restaurant.acceptMercadoPago) {
      throw new Error("Este restaurante não aceita pagamento via Mercado Pago no momento.");
    }
    if (input.consumptionMethod === "DINE_IN") {
      throw new Error("Pagamento via Mercado Pago não está disponível para consumo no local.");
    }
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
  let deliveryLat = input.deliveryLatitude;
  let deliveryLng = input.deliveryLongitude;
  const neighborhood =
    input.deliveryNeighborhood || input.deliveryAddressData?.neighborhood;

  if (input.consumptionMethod === "DELIVERY") {
    if (input.deliveryAddressData) {
      const { street, number, neighborhood: addrNeighborhood, complement, reference } = input.deliveryAddressData;
      const formatted = `${street}, ${number} - ${addrNeighborhood}${complement ? ` (${complement})` : ""}`;
      formattedDeliveryAddress = formatted;

      try {
        const savedAddress = await salvarOuAtualizarEnderecoCliente({
          customerPhone: normalizedCustomerPhone,
          street,
          number,
          neighborhood: addrNeighborhood,
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

    // Geocodificação automática se latitude e longitude ainda não foram passadas
    if ((deliveryLat === undefined || deliveryLng === undefined) && formattedDeliveryAddress) {
      try {
        const geoQuery = `${formattedDeliveryAddress}, ${restaurant.name || ""}`;
        const coords = await geocodeAddress(geoQuery);
        if (coords) {
          deliveryLat = coords.latitude;
          deliveryLng = coords.longitude;
        }
      } catch (e) {
        console.warn("⚠️ [createOrder] Geocodificação falhou:", e);
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
    deliveryLatitude: deliveryLat,
    deliveryLongitude: deliveryLng,
    deliveryNeighborhood: neighborhood,
    deliveryCep: input.deliveryCep,
  });

  revalidatePath("/orders");
  if (input.slug) {
    revalidatePath(`/${input.slug}/orders`);
  }
  // Não bloqueia resposta ao cliente — falha silenciosa é aceitável aqui
  notificarNovoPedido({ orderId: order.id, restaurantSlug: input.slug });

  const numTotal = Number(order.total);
  const isFree = numTotal <= 0;

  console.log(
    `[createOrder] Pedido #${order.id} criado. Total: ${order.total} (numTotal: ${numTotal}, isFree: ${isFree}, paymentMethod: ${input.paymentMethod}). Produtos:`,
    JSON.stringify(input.products),
  );

  if (isFree && order.paymentStatus !== "PAID") {
    try {
      await db
        .update(ordersTable)
        .set({ paymentStatus: "PAID", updatedAt: new Date() })
        .where(eq(ordersTable.id, order.id));
      order.paymentStatus = "PAID";
    } catch (error) {
      console.error("Falha ao confirmar pagamento de pedido gratuito:", error);
    }
  }

  try {
    await salvarClienteCrm({
      restaurantId: restaurant.id,
      customerName: input.customerName,
      customerPhone: normalizedCustomerPhone,
      orderTotal: numTotal,
      orderCreatedAt: order.createdAt ?? new Date(),
    });
  } catch (crmError) {
    console.error("Falha ao salvar informações do cliente no CRM:", crmError);
  }

  return {
    ...order,
    total: numTotal,
    isFree,
  };
};

