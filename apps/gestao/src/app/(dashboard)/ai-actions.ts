"use server";

import { aiSettingsTable, buscarRestaurantePorSlug, db, reativarBot } from "@fsw/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBooleanValue, getStringValue } from "@/lib/admin-form-utils";

const aiSettingsSchema = z.object({
  openaiApiKey: z.string().trim().optional(),
  evolutionInstanceName: z.string().trim().optional(),
  evolutionApiKey: z.string().trim().optional(),
  botName: z.string().trim().min(2),
  systemPrompt: z.string().trim().min(10),
  isBotActive: z.boolean(),
});

export const updateAiSettingsAction = async (
  slug: string,
  formData: FormData,
) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const parsedData = aiSettingsSchema.safeParse({
    openaiApiKey: getStringValue(formData.get("openaiApiKey")),
    evolutionInstanceName: getStringValue(formData.get("evolutionInstanceName")),
    evolutionApiKey: getStringValue(formData.get("evolutionApiKey")),
    botName: getStringValue(formData.get("botName")),
    systemPrompt: getStringValue(formData.get("systemPrompt")),
    isBotActive: getBooleanValue(formData.get("isBotActive")),
  });

  if (!parsedData.success) {
    throw new Error(
      "Dados inválidos: " + JSON.stringify(parsedData.error.flatten()),
    );
  }

  const values = {
    ...parsedData.data,
    restaurantId: restaurant.id,
    updatedAt: new Date(),
  };

  await db
    .insert(aiSettingsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [aiSettingsTable.restaurantId],
      set: values,
    });

  revalidatePath(`/${slug}/ai`);
};

export const reativarBotAction = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  await reativarBot(restaurant.id);
  revalidatePath(`/${slug}/ai`);
};
