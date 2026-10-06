"use server";

import { geocodeAddress, validarBeneficiosPedido } from "@/lib/db";
import type { ConsumptionMethod } from "@/lib/db";

import { normalizePhoneNumber } from "../helpers/phone";

interface ValidateOrderBenefitsInput {
  customerPhone?: string;
  slug: string;
  consumptionMethod?: ConsumptionMethod;
  couponCode?: string;
  useWalletBalance?: boolean;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNeighborhood?: string;
  deliveryCep?: string;
  deliveryAddress?: string;
  products: Array<{
    id: string;
    quantity: number;
    selectedOptions?: string[];
  }>;
}

export const validateOrderBenefits = async (
  input: ValidateOrderBenefitsInput,
) => {
  let deliveryLat = input.deliveryLatitude;
  let deliveryLng = input.deliveryLongitude;

  // Geocodificação em tempo real para permitir casamento de regras de Raio (RADIUS_KM)
  if (
    (deliveryLat === undefined || deliveryLng === undefined) &&
    input.consumptionMethod === "DELIVERY" &&
    input.deliveryAddress
  ) {
    try {
      const cleanCep = input.deliveryCep ? input.deliveryCep.replace(/\D/g, "") : null;
      let coords = await geocodeAddress(input.deliveryAddress);

      if (!coords && cleanCep && cleanCep.length === 8) {
        coords = await geocodeAddress(`CEP: ${cleanCep}`);
      }

      if (coords) {
        deliveryLat = coords.latitude;
        deliveryLng = coords.longitude;
      }
    } catch {
      // Ignora falha silenciosa de geocodificação
    }
  }

  return validarBeneficiosPedido({
    customerPhone: input.customerPhone ? normalizePhoneNumber(input.customerPhone) : undefined,
    slug: input.slug,
    consumptionMethod: input.consumptionMethod,
    couponCode: input.couponCode?.trim().toUpperCase(),
    useWalletBalance: input.useWalletBalance,
    deliveryLatitude: deliveryLat,
    deliveryLongitude: deliveryLng,
    deliveryNeighborhood: input.deliveryNeighborhood,
    deliveryCep: input.deliveryCep,
    products: input.products,
  });
};
