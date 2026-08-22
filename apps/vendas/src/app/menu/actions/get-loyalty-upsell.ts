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
): Promise<LoyaltyUpsell | null> => {
  return buscarProximaRegraFidelidade(slug, subtotal);
};
