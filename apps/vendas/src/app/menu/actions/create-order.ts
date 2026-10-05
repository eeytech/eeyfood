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
    cep?: string;
    city?: string;
    state?: string;
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

  if (input.paymentMethod === "MERCADO_PAGO" || input.paymentMethod === "INFINITEPAY") {
    if (input.consumptionMethod === "DINE_IN") {
      throw new Error("Pagamento online não está disponível para consumo no local.");
    }
  }

  if (input.paymentMethod === "PIX") {
    if (!restaurant.acceptPix) {
      throw new Error("Este restaurante não aceita pagamento via Pix no momento.");
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
    const rawCep = input.deliveryCep || input.deliveryAddressData?.cep;
    const cleanCep = rawCep ? rawCep.replace(/\D/g, "") : null;

    if (input.deliveryAddressData) {
      const {
        street,
        number,
        neighborhood: addrNeighborhood,
        complement,
        reference,
        city: addrCity,
        state: addrState,
      } = input.deliveryAddressData;

      const cepSuffix = cleanCep && cleanCep.length === 8
        ? ` - CEP: ${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`
        : "";
      const cityStateSuffix = addrCity ? `, ${addrCity}${addrState ? ` - ${addrState}` : ""}` : "";
      const formatted = `${street}, ${number} - ${addrNeighborhood}${complement ? ` (${complement})` : ""}${cityStateSuffix}${cepSuffix}`;

      // Preserva o endereço completo formatado com CEP e cidade
      if (input.deliveryAddress && input.deliveryAddress.includes("CEP")) {
        formattedDeliveryAddress = input.deliveryAddress;
      } else {
        formattedDeliveryAddress = formatted;
      }

      try {
        const savedAddress = await salvarOuAtualizarEnderecoCliente({
          customerPhone: normalizedCustomerPhone,
          street,
          number,
          neighborhood: addrNeighborhood,
          complement,
          reference,
          city: addrCity,
          state: addrState,
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

    // Geocodificação automática com tentativas inteligentes
    if ((deliveryLat === undefined || deliveryLng === undefined) && formattedDeliveryAddress) {
      try {
        // 1. Tenta geocodificar o endereço formatado com CEP e cidade
        let coords = await geocodeAddress(formattedDeliveryAddress);

        // 2. Se falhou e temos CEP válido, tenta geocodificar direto pelo CEP
        if (!coords && cleanCep && cleanCep.length === 8) {
          coords = await geocodeAddress(`CEP: ${cleanCep}`);
        }

        // 3. Se ainda não achou e o restaurante tem endereço, tenta com contexto do restaurante
        if (!coords && restaurant.address) {
          coords = await geocodeAddress(`${formattedDeliveryAddress}, ${restaurant.address}`);
        }

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

