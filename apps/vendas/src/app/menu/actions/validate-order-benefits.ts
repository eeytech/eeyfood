"use server";

import { validarBeneficiosPedido } from "@/lib/db";
import type { ConsumptionMethod } from "@/lib/db";

import { normalizePhoneNumber } from "../helpers/phone";

interface ValidateOrderBenefitsInput {
  customerPhone: string;
  slug: string;
  consumptionMethod?: ConsumptionMethod;
  couponCode?: string;
  useWalletBalance?: boolean;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  products: Array<{
    id: string;
    quantity: number;
    selectedOptions?: string[];
  }>;
}

export const validateOrderBenefits = async (
  input: ValidateOrderBenefitsInput,
) => {
  return validarBeneficiosPedido({
    customerPhone: normalizePhoneNumber(input.customerPhone),
    slug: input.slug,
    consumptionMethod: input.consumptionMethod,
    couponCode: input.couponCode?.trim().toUpperCase(),
    useWalletBalance: input.useWalletBalance,
    deliveryLatitude: input.deliveryLatitude,
    deliveryLongitude: input.deliveryLongitude,
    products: input.products,
  });
};
