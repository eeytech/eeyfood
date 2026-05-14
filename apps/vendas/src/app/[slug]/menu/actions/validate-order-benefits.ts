"use server";

import { validarBeneficiosPedido } from "@/lib/db";

import { normalizePhoneNumber } from "../helpers/phone";

interface ValidateOrderBenefitsInput {
  customerPhone: string;
  slug: string;
  couponCode?: string;
  useWalletBalance?: boolean;
  products: Array<{
    id: string;
    quantity: number;
  }>;
}

export const validateOrderBenefits = async (
  input: ValidateOrderBenefitsInput,
) => {
  return validarBeneficiosPedido({
    customerPhone: normalizePhoneNumber(input.customerPhone),
    slug: input.slug,
    couponCode: input.couponCode?.trim().toUpperCase(),
    useWalletBalance: input.useWalletBalance,
    products: input.products,
  });
};
