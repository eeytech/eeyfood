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
  provider: "GOOGLE_GEMINI" | "GROQ" | "OPENAI";
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
  groqApiKey: z.string().trim().optional(),
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

  const parsedData = aiSettingsSchema.safeParse({
    aiProvider: getStringValue(formData.get("aiProvider")) || "GOOGLE_GEMINI",
    geminiApiKey: getStringValue(formData.get("geminiApiKey")),
    groqApiKey: getStringValue(formData.get("groqApiKey")),
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
  provider: "GOOGLE_GEMINI" | "GROQ" | "OPENAI",
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
    if (provider === "GROQ") {
      const client = new OpenAI({
        apiKey: cleanedKey,
        baseURL: "https://api.groq.com/openai/v1",
        timeout: 10000,
      });

      // Busca dinamicamente os modelos ativos e liberados para esta chave na Groq
      const modelsRes = await client.models.list();
      const availableModels = (modelsRes?.data || [])
        .map((m) => m.id)
        .filter((id) => {
          const lower = id.toLowerCase();
          return (
            !lower.includes("whisper") &&
            !lower.includes("guard") &&
            !lower.includes("safeguard") &&
            !lower.includes("bge") &&
            !lower.includes("tts") &&
            !lower.includes("clip") &&
            !lower.includes("vision")
          );
        });

      if (!availableModels || availableModels.length === 0) {
        return {
          success: false,
          provider: "GROQ",
          error: "Chave conectou à Groq, mas nenhum modelo de chat de texto está liberado nesta conta.",
        };
      }

      // Prioridade de modelos rápidos e ativos
      const preferred = [
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
      ];
      const sortedCandidates = [
        ...preferred.filter((p) => availableModels.includes(p)),
        ...availableModels.filter((a) => !preferred.includes(a)),
      ];

      let modelTested = "";
      let testSuccess = false;
      let lastTestErr: unknown = null;

      // Testa a geração com os melhores modelos candidatos disponíveis
      for (const candidate of sortedCandidates.slice(0, 3)) {
        try {
          await client.chat.completions.create({
            model: candidate,
            messages: [{ role: "user", content: "Diga apenas: OK" }],
            max_tokens: 5,
            temperature: 0,
          });
          modelTested = candidate;
          testSuccess = true;
          break;
        } catch (err) {
          lastTestErr = err;
        }
      }

      if (!testSuccess) {
        throw (
          lastTestErr ||
          new Error("Não foi possível gerar resposta com os modelos disponíveis da Groq.")
        );
      }

      const responseTimeMs = Date.now() - startTime;
      return {
        success: true,
        provider: "GROQ",
        modelTested,
        responseTimeMs,
        message: `Chave da Groq válida! Conexão estabelecida com sucesso com o modelo ${modelTested} (${(responseTimeMs / 1000).toFixed(2)}s).`,
      };
    }

    if (provider === "GOOGLE_GEMINI") {
      const client = new OpenAI({
        apiKey: cleanedKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        timeout: 10000,
      });

      let modelTested = "gemini-2.0-flash";
      try {
        await client.chat.completions.create({
          model: modelTested,
          messages: [{ role: "user", content: "Diga apenas: OK" }],
          max_tokens: 5,
          temperature: 0,
        });
      } catch {
        modelTested = "gemini-1.5-flash";
        await client.chat.completions.create({
          model: modelTested,
          messages: [{ role: "user", content: "Diga apenas: OK" }],
          max_tokens: 5,
          temperature: 0,
        });
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

    if (provider === "GROQ") {
      if (
        rawMsg.includes("401") ||
        rawMsg.toLowerCase().includes("invalid api key") ||
        rawMsg.toLowerCase().includes("invalid_api_key")
      ) {
        friendly =
          "Chave da Groq inválida ou revogada (Erro 401). Verifique a chave no console https://console.groq.com/keys.";
      } else if (
        rawMsg.includes("429") ||
        rawMsg.toLowerCase().includes("rate limit") ||
        rawMsg.toLowerCase().includes("quota")
      ) {
        friendly =
          "Limite de requisições excedido na Groq (Erro 429). Aguarde alguns instantes.";
      } else if (
        rawMsg.includes("404") ||
        rawMsg.toLowerCase().includes("does not exist") ||
        rawMsg.toLowerCase().includes("model")
      ) {
        friendly =
          "Nenhum modelo compatível encontrado na sua conta da Groq (Erro 404). Verifique as permissões de modelos no console https://console.groq.com/docs/models.";
      }
    } else if (provider === "GOOGLE_GEMINI") {
      if (
        rawMsg.toLowerCase().includes("api_key_invalid") ||
        rawMsg.includes("400")
      ) {
        friendly =
          "Chave de API do Google Gemini inválida. Obtenha uma chave em https://aistudio.google.com/app/apikey.";
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

