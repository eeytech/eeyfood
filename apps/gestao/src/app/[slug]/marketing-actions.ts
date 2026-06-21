"use server";

import {
  aiSettingsTable,
  buscarRestaurantePorSlug,
  customerInteractionsTable,
  customersTable,
  db,
  eq,
  marketingSettingsTable,
  walletsTable,
  and,
} from "@fsw/db";
import axios from "axios";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getBooleanValue,
  getNumberValue,
  getOptionalStringValue,
  getStringValue,
} from "@/lib/admin-form-utils";

const marketingSettingsSchema = z.object({
  metaPixelId: z.string().optional(),
  metaCapiToken: z.string().optional(),
  ga4MeasurementId: z.string().optional(),
  gtmContainerId: z.string().optional(),
  abandonedCartEnabled: z.boolean(),
  abandonedCartDelayMinutes: z.number().int().min(30).max(1440),
  abandonedCartCouponPercent: z.number().min(0).max(50),
});

export async function salvarMarketingSettingsAction(slug: string, formData: FormData) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const parsed = marketingSettingsSchema.safeParse({
    metaPixelId: getOptionalStringValue(formData.get("metaPixelId")),
    metaCapiToken: getOptionalStringValue(formData.get("metaCapiToken")),
    ga4MeasurementId: getOptionalStringValue(formData.get("ga4MeasurementId")),
    gtmContainerId: getOptionalStringValue(formData.get("gtmContainerId")),
    abandonedCartEnabled: getBooleanValue(formData.get("abandonedCartEnabled")),
    abandonedCartDelayMinutes: getNumberValue(formData.get("abandonedCartDelayMinutes")),
    abandonedCartCouponPercent: getNumberValue(formData.get("abandonedCartCouponPercent")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const values = {
    ...parsed.data,
    restaurantId: restaurant.id,
    updatedAt: new Date(),
  };

  await db
    .insert(marketingSettingsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [marketingSettingsTable.restaurantId],
      set: values,
    });

  revalidatePath(`/${slug}/marketing`);
}

export async function dispararCampanhaAction(
  slug: string,
  formData: FormData,
) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const segment = getStringValue(formData.get("segment"));
  const message = getStringValue(formData.get("message"));

  if (!message || message.trim().length < 5) {
    throw new Error("Mensagem muito curta.");
  }

  const aiSettings = await db.query.aiSettingsTable.findFirst({
    where: eq(aiSettingsTable.restaurantId, restaurant.id),
  });

  if (!aiSettings?.evolutionInstanceName || !aiSettings.evolutionApiKey) {
    throw new Error("Configure a integração WhatsApp (Evolution API) primeiro.");
  }

  const EVOLUTION_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";

  const conditions = [eq(customersTable.restaurantId, restaurant.id)];
  if (segment && segment !== "ALL") {
    conditions.push(
      eq(
        customersTable.segment,
        segment as "NEW" | "VIP" | "INACTIVE" | "AT_RISK" | "RECOVERED",
      ),
    );
  }

  const customers = await db.query.customersTable.findMany({
    where: and(...conditions),
  });

  let sent = 0;

  for (const customer of customers) {
    const personalizedMessage = message.replace("{nome}", customer.name.split(" ")[0]);

    try {
      await axios.post(
        `${EVOLUTION_URL}/message/sendText/${aiSettings.evolutionInstanceName}`,
        { number: customer.phone, text: personalizedMessage },
        { headers: { apikey: aiSettings.evolutionApiKey } },
      );

      await db.insert(customerInteractionsTable).values({
        restaurantId: restaurant.id,
        customerId: customer.id,
        type: "CAMPAIGN",
        channel: "WHATSAPP",
        message: personalizedMessage,
        sentAt: new Date(),
      });

      sent++;

      // Throttle: 1 message per 500ms to avoid WhatsApp bans
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`Falha ao enviar para ${customer.phone}:`, err);
    }
  }

  revalidatePath(`/${slug}/campanhas`);
  return { sent, total: customers.length };
}

export async function buscarMarketingSettingsAction(slug: string) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  return db.query.marketingSettingsTable.findFirst({
    where: eq(marketingSettingsTable.restaurantId, restaurant.id),
  });
}
