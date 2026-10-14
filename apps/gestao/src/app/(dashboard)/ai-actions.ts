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
import { assertAuthenticated, assertRestaurantAccess } from "@/lib/auth/session";
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
  await assertRestaurantAccess(slug);
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
  await assertRestaurantAccess(slug);
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
  await assertRestaurantAccess(slug);
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
  await assertAuthenticated();
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

      // Passo 1: Consulta a lista de modelos disponíveis para esta chave via API REST oficial do Google.
      // Isso valida a chave, as permissões do projeto e evita adivinhações cegas que geram 404 falso.
      let modelsRes: Response;
      let apiVersion = "v1beta";

      try {
        modelsRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanedKey)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(10000),
          }
        );

        // Se o endpoint v1beta retornar 404, tenta v1 como fallback
        if (modelsRes.status === 404) {
          const v1Res = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(cleanedKey)}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(10000),
            }
          ).catch(() => null);

          if (v1Res && v1Res.ok) {
            modelsRes = v1Res;
            apiVersion = "v1";
          }
        }
      } catch (netErr: unknown) {
        const netMsg = netErr instanceof Error ? netErr.message : String(netErr);
        return {
          success: false,
          provider: "GOOGLE_GEMINI",
          error: `Falha na conexão com os servidores do Google (${netMsg}). Verifique a sua conexão com a internet.`,
        };
      }

      // Trata erros de status HTTP retornados pelo Google
      if (!modelsRes.ok) {
        const errData = await modelsRes.json().catch(() => null);
        const errMsg = errData?.error?.message || "";

        if (modelsRes.status === 400) {
          return {
            success: false,
            provider: "GOOGLE_GEMINI",
            error:
              "Chave do Google Gemini inválida (Erro 400). Obtenha uma chave gratuita em https://aistudio.google.com/app/apikey.",
          };
        }

        if (modelsRes.status === 403) {
          if (
            errMsg.toLowerCase().includes("generative language api") ||
            errMsg.toLowerCase().includes("disabled")
          ) {
            return {
              success: false,
              provider: "GOOGLE_GEMINI",
              error:
                "A 'Generative Language API' está desativada no seu projeto do Google Cloud. Acesse https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com e clique em 'Ativar'.",
            };
          }
          return {
            success: false,
            provider: "GOOGLE_GEMINI",
            error: `Acesso negado à API do Gemini (Erro 403): ${errMsg || "Verifique se a chave possui restrições de IP, HTTP Referrer ou restrições de API no Google Cloud Console."}`,
          };
        }

        if (modelsRes.status === 429) {
          return {
            success: false,
            provider: "GOOGLE_GEMINI",
            error:
              "Limite de requisições ou cota do Google Gemini atingida (Erro 429). Aguarde alguns instantes e tente novamente.",
          };
        }

        if (modelsRes.status === 404) {
          return {
            success: false,
            provider: "GOOGLE_GEMINI",
            error:
              "Modelos do Gemini ainda não sincronizados (Erro 404). Se você acabou de criar a chave no Google AI Studio, o Google pode levar de 2 a 10 minutos para propagar as permissões pelos servidores mundiais. Aguarde alguns instantes e clique em Testar novamente.",
          };
        }

        return {
          success: false,
          provider: "GOOGLE_GEMINI",
          error: `Erro ${modelsRes.status} ao validar chave no Google: ${errMsg || modelsRes.statusText}`,
        };
      }

      // Passo 2: Analisa modelos retornados que suportam generateContent
      const data = await modelsRes.json().catch(() => null);
      const rawModels: Array<{ name: string; supportedGenerationMethods?: string[] }> =
        data?.models || [];

      const availableModels = rawModels
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      // Escolhe o modelo mais moderno e rápido disponível
      const preferredCandidates = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
      ];
      let modelToTest = preferredCandidates.find((c) => availableModels.includes(c));
      if (!modelToTest) {
        modelToTest = availableModels.find((m) => m.includes("gemini")) || availableModels[0] || "gemini-1.5-flash";
      }

      // Passo 3: Executa uma chamada real de geração de conteúdo de teste (generateContent)
      let genRes: Response;
      try {
        genRes = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelToTest}:generateContent?key=${encodeURIComponent(cleanedKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Diga apenas: OK" }] }],
            }),
            signal: AbortSignal.timeout(10000),
          }
        );
      } catch (genNetErr: unknown) {
        const genNetMsg = genNetErr instanceof Error ? genNetErr.message : String(genNetErr);
        return {
          success: false,
          provider: "GOOGLE_GEMINI",
          error: `Falha na requisição de teste para ${modelToTest} (${genNetMsg}).`,
        };
      }

      if (genRes.ok) {
        const responseTimeMs = Date.now() - startTime;
        return {
          success: true,
          provider: "GOOGLE_GEMINI",
          modelTested: modelToTest,
          responseTimeMs,
          message: `Chave do Gemini válida! Conexão estabelecida com sucesso com o modelo ${modelToTest} (${(responseTimeMs / 1000).toFixed(2)}s).`,
        };
      }

      const genData = await genRes.json().catch(() => null);
      const genErrMsg = genData?.error?.message || "";

      if (genRes.status === 404) {
        return {
          success: false,
          provider: "GOOGLE_GEMINI",
          error: `A chave é válida, mas o modelo ${modelToTest} ainda está finalizando a propagação no Google (Erro 404). Aguarde 1 a 2 minutos e teste novamente.`,
        };
      }

      return {
        success: false,
        provider: "GOOGLE_GEMINI",
        error: `Falha ao testar inferência com ${modelToTest} (Erro ${genRes.status}): ${genErrMsg || "Resposta inesperada."}`,
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

