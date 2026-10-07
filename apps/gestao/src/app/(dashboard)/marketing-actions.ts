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
import { cleanKey, normalizeWhatsAppNumber } from "@/lib/whatsapp-utils";

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

  const rawUrl =
    process.env.EVOLUTION_API_URL ||
    process.env.EVOLUTION_URL ||
    "http://localhost:8080";
  const evolutionUrl = cleanKey(rawUrl).replace(/\/+$/, "");

  const envKey = cleanKey(
    process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY,
  );
  const apiKey = envKey || cleanKey(aiSettings?.evolutionApiKey);
  const instanceName = cleanKey(aiSettings?.evolutionInstanceName);

  if (!instanceName || !apiKey) {
    throw new Error(
      "Integração do WhatsApp não configurada. Por favor, acesse o menu 'WhatsApp' e conecte sua instância via QR Code.",
    );
  }

  // Validação prévia de prontidão da conexão na Evolution API
  try {
    const statusRes = await axios.get(
      `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
      {
        headers: { apikey: apiKey },
        timeout: 5000,
      },
    );

    const state = statusRes.data?.instance?.state as string | undefined;
    if (state && state !== "open") {
      throw new Error(
        `O WhatsApp do restaurante não está conectado (status atual: "${state}"). Conecte seu aparelho no menu 'WhatsApp' antes de disparar.`,
      );
    }
  } catch (stateErr: unknown) {
    if (
      stateErr instanceof Error &&
      stateErr.message.includes("O WhatsApp do restaurante não está conectado")
    ) {
      throw stateErr;
    }
    if (axios.isAxiosError(stateErr)) {
      if (stateErr.response?.status === 404) {
        throw new Error(
          `A instância "${instanceName}" não existe na Evolution API. Acesse a tela 'WhatsApp' e reconecte seu aparelho.`,
        );
      }
      if (stateErr.response?.status === 401 || stateErr.response?.status === 403) {
        throw new Error(
          "Chave de autenticação da Evolution API inválida. Verifique as credenciais do servidor.",
        );
      }
    }
    console.warn("Aviso ao verificar connectionState pré-disparo:", stateErr);
  }

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
  let failed = 0;
  const errorDetails: string[] = [];

  for (const customer of customers) {
    const targetPhone = normalizeWhatsAppNumber(customer.phone);

    if (!targetPhone) {
      failed++;
      console.warn(
        `[Campanha] Telefone inválido ignorado para ${customer.name}: "${customer.phone}"`,
      );
      if (errorDetails.length < 5) {
        errorDetails.push(`${customer.name}: número inválido (${customer.phone})`);
      }
      continue;
    }

    const firstName = customer.name.trim().split(" ")[0] || "Cliente";
    const personalizedMessage = message.replace(/{nome}/gi, firstName);

    try {
      await axios.post(
        `${evolutionUrl}/message/sendText/${encodeURIComponent(instanceName)}`,
        {
          number: targetPhone,
          text: personalizedMessage,
        },
        {
          headers: {
            apikey: apiKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
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

      // Throttle: 600ms para evitar rate-limit e ban do WhatsApp
      await new Promise((r) => setTimeout(r, 600));
    } catch (err: unknown) {
      failed++;
      let errorMsg = "";
      if (axios.isAxiosError(err)) {
        const respData = err.response?.data;
        errorMsg =
          respData?.response?.message ||
          respData?.message ||
          respData?.error ||
          (typeof respData === "string" ? respData : JSON.stringify(respData)) ||
          err.message;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      console.error(
        `Falha ao enviar campanha para ${customer.phone} (${targetPhone}):`,
        errorMsg,
      );

      if (errorDetails.length < 5) {
        errorDetails.push(`${customer.name} (${customer.phone}): ${errorMsg}`);
      }
    }
  }

  if (sent === 0 && customers.length > 0) {
    const detailMsg = errorDetails.length > 0 ? ` Detalhe: ${errorDetails.join("; ")}` : "";
    throw new Error(
      `Falha no disparo: nenhuma mensagem pôde ser entregue via WhatsApp.${detailMsg}`,
    );
  }

  revalidatePath(`/${slug}/campanhas`);
  return {
    sent,
    total: customers.length,
    failed,
    errorDetails,
  };
}

export async function buscarMarketingSettingsAction(slug: string) {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  return db.query.marketingSettingsTable.findFirst({
    where: eq(marketingSettingsTable.restaurantId, restaurant.id),
  });
}
