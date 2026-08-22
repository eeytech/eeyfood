"use server";

import { type PaymentMethod, salvarCarrinhoAbandonado } from "@/lib/db";

interface SaveAbandonedCartInput {
  sessionId: string;
  slug: string;
  customerName?: string;
  customerPhone?: string;
  consumptionMethod: "TAKEAWAY" | "DINE_IN" | "DELIVERY";
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  useWalletBalance?: boolean;
  scheduledFor?: string;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export const saveAbandonedCart = async (input: SaveAbandonedCartInput) => {
  return salvarCarrinhoAbandonado({
    sessionId: input.sessionId,
    slug: input.slug,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    consumptionMethod: input.consumptionMethod,
    paymentMethod: input.paymentMethod,
    couponCode: input.couponCode,
    useWalletBalance: input.useWalletBalance,
    scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
    products: input.products,
  });
};
