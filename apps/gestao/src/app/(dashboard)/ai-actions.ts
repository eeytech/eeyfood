"use server";

import {
  aiSettingsTable,
  buscarRestaurantePorSlug,
  db,
  DEFAULT_AI_SYSTEM_PROMPT,
  eq,
  reativarBotParaCliente,
  reativarTodosClientes,
} from "@fsw/db";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { z } from "zod";

export type TestAiKeyResult = {
  success: boolean;
  provider: "GOOGLE_GEMINI" | "OPENAI";
  message?: string;
  error?: string;
  modelTested?: string;
  responseTimeMs?: number;
};

import { getBooleanValue, getStringValue } from "@/lib/admin-form-utils";
import { sincronizarWebhookAction } from "./ai/whatsapp-actions";

const aiSettingsSchema = z.object({
  aiProvider: z.string().default("GOOGLE_GEMINI"),
  geminiApiKey: z.string().trim().optional(),
  openaiApiKey: z.string().trim().optional(),
  evolutionInstanceName: z.string().trim().optional(),
  evolutionApiKey: z.string().trim().optional(),
  botName: z.string().trim().min(2, "O nome do atendente deve ter no mínimo 2 caracteres"),
  systemPrompt: z
    .string()
    .trim()
    .min(10, "O prompt deve ter no mínimo 10 caracteres")
    .default(DEFAULT_AI_SYSTEM_PROMPT),
  isBotActive: z.boolean(),
});

export const updateAiSettingsAction = async (
  slug: string,
  formData: FormData,
) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  const existing = await db.query.aiSettingsTable.findFirst({
    where: eq(aiSettingsTable.restaurantId, restaurant.id),
  });

  const evolutionInstanceName = formData.has("evolutionInstanceName")
    ? getStringValue(formData.get("evolutionInstanceName"))
    : (existing?.evolutionInstanceName ?? "");

  const evolutionApiKey = formData.has("evolutionApiKey")
    ? getStringValue(formData.get("evolutionApiKey"))
    : (existing?.evolutionApiKey ?? "");

  const rawPrompt = getStringValue(formData.get("systemPrompt"));
  const systemPrompt =
    rawPrompt && rawPrompt.length >= 10 ? rawPrompt : DEFAULT_AI_SYSTEM_PROMPT;

  const rawProvider = getStringValue(formData.get("aiProvider"));
  const aiProvider = rawProvider === "OPENAI" ? "OPENAI" : "GOOGLE_GEMINI";

  const parsedData = aiSettingsSchema.safeParse({
    aiProvider,
    geminiApiKey: getStringValue(formData.get("geminiApiKey")),
    openaiApiKey: getStringValue(formData.get("openaiApiKey")),
    evolutionInstanceName,
    evolutionApiKey,
    botName: getStringValue(formData.get("botName")) || "EeyFood Bot",
    systemPrompt,
    isBotActive: getBooleanValue(formData.get("isBotActive")),
  });

  if (!parsedData.success) {
    const errorMsg =
      parsedData.error.issues.map((i) => i.message).join(", ") ||
      "Dados inválidos nas configurações de IA.";
    throw new Error(errorMsg);
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

  if (values.isBotActive) {
    try {
      await sincronizarWebhookAction(slug);
    } catch (whErr) {
      console.warn("Aviso ao auto-sincronizar webhook após salvar IA:", whErr);
    }
  }

  revalidatePath(`/${slug}/ai`);
  revalidatePath("/ai");
  revalidatePath(`/${slug}/whatsapp`);
  revalidatePath("/whatsapp");
};

export const reativarBotAction = async (slug: string, customerPhone?: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  if (customerPhone) {
    await reativarBotParaCliente(restaurant.id, customerPhone);
  } else {
    await reativarTodosClientes(restaurant.id);
  }

  revalidatePath(`/${slug}/ai`);
  revalidatePath("/ai");
};

export const reativarTodosClientesAction = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) throw new Error("Restaurante não encontrado.");

  await reativarTodosClientes(restaurant.id);
  revalidatePath(`/${slug}/ai`);
  revalidatePath("/ai");
};

export const testAiProviderKeyAction = async (
  provider: "GOOGLE_GEMINI" | "OPENAI",
  apiKey: string,
): Promise<TestAiKeyResult> => {
  const cleanedKey = (apiKey || "").trim().replace(/^["']|["']$/g, "");
  if (!cleanedKey) {
    return {
      success: false,
      provider,
      error: "Por favor, digite ou cole sua chave de API antes de testar.",
    };
  }

  const startTime = Date.now();

  try {
    if (provider === "GOOGLE_GEMINI") {
      if (cleanedKey.startsWith("...") || cleanedKey.length < 25) {
        return {
          success: false,
          provider: "GOOGLE_GEMINI",
          error:
            "A chave informada está incompleta (" +
            cleanedKey +
            "). Você precisa copiar a chave inteira no Google AI Studio (ela começa com 'AIzaSy...' e tem cerca de 39 caracteres). Clique no ícone de cópia ao lado da chave.",
        };
      }

      let modelTested = "gemini-2.0-flash";
      let connected = false;

      // 1. Tenta via endpoint OpenAI-compatible
      for (const m of ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"]) {
        try {
          const client = new OpenAI({
            apiKey: cleanedKey,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
            timeout: 8000,
          });
          await client.chat.completions.create({
            model: m,
            messages: [{ role: "user", content: "Diga apenas: OK" }],
            max_tokens: 5,
            temperature: 0,
          });
          modelTested = m;
          connected = true;
          break;
        } catch {
          // tenta próximo
        }
      }

      // 2. Se OpenAI endpoint retornar 404, tenta endpoint REST nativo do Google
      if (!connected) {
        for (const m of ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"]) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${cleanedKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: "Diga apenas: OK" }] }],
                }),
              }
            );
            if (res.ok) {
              modelTested = m;
              connected = true;
              break;
            } else if (res.status === 400) {
              const data = await res.json().catch(() => null);
              const errMsg = data?.error?.message || "Chave de API do Google Gemini inválida.";
              return { success: false, provider: "GOOGLE_GEMINI", error: errMsg };
            }
          } catch {
            // tenta próximo
          }
        }
      }

      if (!connected) {
        throw new Error(
          "Modelos do Gemini ainda não sincronizados (Erro 404). Se você acabou de criar esta chave no Google AI Studio, o Google leva cerca de 1 a 2 minutos para propagar a chave para os servidores de IA. Aguarde um instante e clique em Testar novamente."
        );
      }

      const responseTimeMs = Date.now() - startTime;
      return {
        success: true,
        provider: "GOOGLE_GEMINI",
        modelTested,
        responseTimeMs,
        message: `Chave do Gemini válida! Conexão estabelecida com sucesso com o modelo ${modelTested} (${(responseTimeMs / 1000).toFixed(2)}s).`,
      };
    }

    if (provider === "OPENAI") {
      const client = new OpenAI({
        apiKey: cleanedKey,
        timeout: 10000,
      });

      const modelTested = "gpt-4o-mini";
      await client.chat.completions.create({
        model: modelTested,
        messages: [{ role: "user", content: "Diga apenas: OK" }],
        max_tokens: 5,
        temperature: 0,
      });

      const responseTimeMs = Date.now() - startTime;
      return {
        success: true,
        provider: "OPENAI",
        modelTested,
        responseTimeMs,
        message: `Chave da OpenAI válida! Conexão estabelecida com sucesso com o modelo ${modelTested} (${(responseTimeMs / 1000).toFixed(2)}s).`,
      };
    }

    return {
      success: false,
      provider,
      error: "Provedor desconhecido.",
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    let friendly = rawMsg;

    if (provider === "GOOGLE_GEMINI") {
      if (
        rawMsg.toLowerCase().includes("api_key_invalid") ||
        rawMsg.includes("400")
      ) {
        friendly =
          "Chave de API do Google Gemini inválida. Obtenha uma chave em https://aistudio.google.com/app/apikey.";
      } else if (rawMsg.includes("404")) {
        friendly =
          "Modelos do Gemini ainda não sincronizados (Erro 404). Se você acabou de criar a chave, aguarde 1 a 2 minutos para o Google propagar as permissões e tente novamente.";
      } else if (rawMsg.includes("403")) {
        friendly =
          "Acesso negado (Erro 403). Verifique se a API do Gemini está habilitada para esta chave.";
      } else if (rawMsg.includes("429")) {
        friendly =
          "Limite de requisições por minuto atingido no Gemini (Erro 429). Aguarde alguns instantes.";
      }
    } else if (provider === "OPENAI") {
      if (
        rawMsg.includes("401") ||
        rawMsg.toLowerCase().includes("invalid_api_key")
      ) {
        friendly =
          "Chave da OpenAI inválida (Erro 401). Verifique sua chave secreta na plataforma OpenAI.";
      } else if (
        rawMsg.toLowerCase().includes("insufficient_quota") ||
        rawMsg.includes("429")
      ) {
        friendly =
          "Créditos insuficientes ou quota excedida na OpenAI (Erro 429). Reabasteça créditos pré-pagos na OpenAI.";
      }
    }

    return {
      success: false,
      provider,
      error: friendly,
    };
  }
};

