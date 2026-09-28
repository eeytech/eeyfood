"use server";

import {
  aiSettingsTable,
  and,
  buscarRestaurantePorSlug,
  customerInteractionsTable,
  customersTable,
  db,
  eq,
  inArray,
  marketingSettingsTable,
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
  metaPixelId: z.string().nullable().optional(),
  metaCapiToken: z.string().nullable().optional(),
  ga4MeasurementId: z.string().nullable().optional(),
  gtmContainerId: z.string().nullable().optional(),
  abandonedCartEnabled: z.boolean(),
  abandonedCartDelayMinutes: z.number().int().min(30).max(1440),
  abandonedCartCouponPercent: z.number().min(0).max(50),
});

const getNullableStringValue = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function salvarMarketingSettingsAction(slug: string, formData: FormData) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const rawDelay = formData.get("abandonedCartDelayMinutes");
  const rawCoupon = formData.get("abandonedCartCouponPercent");
  const rawAbandonedEnabled = formData.get("abandonedCartEnabled");

  const abandonedCartEnabled = getBooleanValue(rawAbandonedEnabled);

  const parsed = marketingSettingsSchema.safeParse({
    metaPixelId: getNullableStringValue(formData.get("metaPixelId")),
    metaCapiToken: getNullableStringValue(formData.get("metaCapiToken")),
    ga4MeasurementId: getNullableStringValue(formData.get("ga4MeasurementId")),
    gtmContainerId: getNullableStringValue(formData.get("gtmContainerId")),
    abandonedCartEnabled,
    abandonedCartDelayMinutes:
      rawDelay != null && String(rawDelay).trim() !== ""
        ? getNumberValue(rawDelay, 120)
        : 120,
    abandonedCartCouponPercent:
      rawCoupon != null && String(rawCoupon).trim() !== ""
        ? getNumberValue(rawCoupon, 5)
        : 5,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const values = {
    restaurantId: restaurant.id,
    metaPixelId: parsed.data.metaPixelId ?? null,
    metaCapiToken: parsed.data.metaCapiToken ?? null,
    ga4MeasurementId: parsed.data.ga4MeasurementId ?? null,
    gtmContainerId: parsed.data.gtmContainerId ?? null,
    abandonedCartEnabled: parsed.data.abandonedCartEnabled,
    abandonedCartDelayMinutes: parsed.data.abandonedCartDelayMinutes,
    abandonedCartCouponPercent: parsed.data.abandonedCartCouponPercent,
    updatedAt: new Date(),
  };

  await db
    .insert(marketingSettingsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [marketingSettingsTable.restaurantId],
      set: {
        metaPixelId: values.metaPixelId,
        metaCapiToken: values.metaCapiToken,
        ga4MeasurementId: values.ga4MeasurementId,
        gtmContainerId: values.gtmContainerId,
        abandonedCartEnabled: values.abandonedCartEnabled,
        abandonedCartDelayMinutes: values.abandonedCartDelayMinutes,
        abandonedCartCouponPercent: values.abandonedCartCouponPercent,
        updatedAt: values.updatedAt,
      },
    });

  revalidatePath(`/${slug}/marketing`);
  revalidatePath("/marketing");
}

export async function dispararCampanhaAction(
  slug: string,
  formData: FormData,
) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const targetType = getStringValue(formData.get("targetType")) || "SEGMENT";
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

  let customers: Array<{ id: string; name: string; phone: string }> = [];

  if (targetType === "SPECIFIC") {
    const rawIds = formData.getAll("customerIds").map(String);
    const specificIdsStr = getStringValue(formData.get("specificIds"));
    const idSet = new Set<string>(rawIds.filter(Boolean));
    if (specificIdsStr) {
      specificIdsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => idSet.add(id));
    }
    const customerIdsArray = Array.from(idSet);

    if (customerIdsArray.length === 0) {
      throw new Error("Nenhum contato selecionado para envio.");
    }

    customers = await db.query.customersTable.findMany({
      where: and(
        eq(customersTable.restaurantId, restaurant.id),
        inArray(customersTable.id, customerIdsArray),
      ),
      columns: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (customers.length === 0) {
      throw new Error("Nenhum contato válido encontrado para envio.");
    }
  } else {
    const segment = getStringValue(formData.get("segment"));
    const conditions = [eq(customersTable.restaurantId, restaurant.id)];
    if (segment && segment !== "ALL") {
      conditions.push(
        eq(
          customersTable.segment,
          segment as "NEW" | "VIP" | "INACTIVE" | "AT_RISK" | "RECOVERED",
        ),
      );
    }

    customers = await db.query.customersTable.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        name: true,
        phone: true,
      },
    });
  }

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
