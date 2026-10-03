"use server";

import { buscarProximaRegraFidelidade } from "@/lib/db";

export interface LoyaltyUpsell {
  minOrderValue: number;
  cashbackPercent: number;
  remainingAmount: number;
}

export const getLoyaltyUpsell = async (
  slug: string,
  subtotal: number,
  cartItems?: Array<{ productId: string; menuCategoryId?: string | null }>,
): Promise<LoyaltyUpsell | null> => {
  return buscarProximaRegraFidelidade(slug, subtotal, cartItems);
};
