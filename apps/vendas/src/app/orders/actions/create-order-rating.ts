"use server";

import { db, orderRatingsTable } from "@fsw/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface CreateRatingInput {
  orderId: number;
  restaurantId: string;
  customerName: string;
  stars: number;
  comment?: string;
  imageUrl?: string;
  slug: string;
}

export const createOrderRating = async (input: CreateRatingInput) => {
  try {
    // 1. Verificar se o pedido já foi avaliado
    const existingRating = await db.query.orderRatingsTable.findFirst({
      where: and(
        eq(orderRatingsTable.orderId, input.orderId),
        eq(orderRatingsTable.isActive, true)
      )
    });

    if (existingRating) {
      throw new Error("Este pedido já foi avaliado.");
    }

    // 2. Criar a avaliação
    await db.insert(orderRatingsTable).values({
      orderId: input.orderId,
      restaurantId: input.restaurantId,
      customerName: input.customerName,
      stars: input.stars,
      comment: input.comment,
      imageUrl: input.imageUrl,
    });

    revalidatePath(`/${input.slug}/orders`);
    revalidatePath(`/${input.slug}/menu`);

    return { success: true };
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    throw error;
  }
};
