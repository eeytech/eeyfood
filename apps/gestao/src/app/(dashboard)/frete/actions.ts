"use server";

import { buscarRestaurantePorSlug, db, eq, restaurantsTable } from "@fsw/db";
import { revalidatePath, revalidateTag } from "next/cache";

export async function salvarFreteGratisAction(slug: string, formData: FormData) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { success: false, error: "Restaurante não encontrado." };
  }

  const enabled = formData.get("enabled") === "true";
  const rawThreshold = formData.get("threshold");
  const parsedThreshold =
    rawThreshold !== null && rawThreshold !== ""
      ? parseFloat(String(rawThreshold).replace(",", "."))
      : null;

  const threshold =
    enabled && parsedThreshold !== null && !isNaN(parsedThreshold) && parsedThreshold > 0
      ? parsedThreshold
      : null;

  try {
    await db
      .update(restaurantsTable)
      .set({
        freeDeliveryThreshold: threshold,
        updatedAt: new Date(),
      })
      .where(eq(restaurantsTable.id, restaurant.id));

    revalidatePath(`/${slug}/frete`);
    revalidatePath(`/${slug}/logistica`);
    revalidatePath("/menu");
    revalidateTag(`restaurant-menu:${slug}`);
    revalidateTag("restaurant-menu:default");

    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações de frete grátis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar as configurações.",
    };
  }
}
