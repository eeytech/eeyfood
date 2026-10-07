"use server";

import {
  aiSettingsTable,
  buscarRestaurantePorSlug,
  db,
  DEFAULT_AI_SYSTEM_PROMPT,
  eq,
} from "@fsw/db";
import axios from "axios";
import { revalidatePath } from "next/cache";

export interface WhatsAppStatusResult {
  isConnected: boolean;
  state: "open" | "close" | "connecting" | "unknown";
  instanceName?: string;
  phone?: string;
  profileName?: string;
  profilePicUrl?: string;
  error?: string;
  isBotActive?: boolean;
  hasAiApiKey?: boolean;
  aiProvider?: string;
  webhookUrl?: string;
  webhookEnabled?: boolean;
}

export interface QrCodeResult {
  ok: boolean;
  base64?: string;
  code?: string;
  instanceName?: string;
  error?: string;
}

function cleanKey(val?: string | null): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

async function getAppUrl(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // Fora do contexto de request HTTP
  }

  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://gestao.fswdonalds.eeytech.com";
  return cleanKey(raw).replace(/\/$/, "");
}

function getEvolutionConfig(
  storedInstanceName?: string | null,
  storedApiKey?: string | null,
  restaurantSlug?: string,
) {
  const rawUrl =
    process.env.EVOLUTION_API_URL ||
    process.env.EVOLUTION_URL ||
    "http://localhost:8080";
  const evolutionUrl = cleanKey(rawUrl).replace(/\/+$/, "");

  // A chave mestra do servidor tem prioridade
  const envKey = cleanKey(
    process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY,
  );
  const apiKey = envKey || cleanKey(storedApiKey);

  const cleanSlug = restaurantSlug
    ? restaurantSlug.toLowerCase().replace(/[^a-z0-9]/g, "_")
    : "loja";
  const instanceName =
    cleanKey(storedInstanceName) || `restaurante_${cleanSlug}`;

  return { evolutionUrl, apiKey, instanceName };
}

/**
 * Configura o webhook na Evolution API com compatibilidade entre versões v1 e v2
 */
export async function configurarWebhookEvolution(
  evolutionUrl: string,
  instanceName: string,
  apiKey: string,
  webhookUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const events = ["MESSAGES_UPSERT", "SEND_MESSAGE", "CONNECTION_UPDATE"];

  // Tentativa 1: Formato oficial aninhado da Evolution API (v2 / padrão)
  try {
    await axios.post(
      `${evolutionUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          events,
        },
      },
      {
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        timeout: 8000,
      },
    );
    return { ok: true };
  } catch (err: unknown) {
    const errorData = axios.isAxiosError(err) ? err.response?.data : null;
    const status = axios.isAxiosError(err) ? err.response?.status : null;
    console.warn(
      `[Webhook Sync] Formato aninhado falhou (${status}):`,
      JSON.stringify(errorData || (err instanceof Error ? err.message : err)),
    );

    // Tentativa 2: Formato plano (Evolution API v1 ou distribuições sem wrapping)
    try {
      await axios.post(
        `${evolutionUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
        {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          events,
        },
        {
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          timeout: 8000,
        },
      );
      return { ok: true };
    } catch (fallbackErr: unknown) {
      const fbData = axios.isAxiosError(fallbackErr) ? fallbackErr.response?.data : null;
      const fbStatus = axios.isAxiosError(fallbackErr) ? fallbackErr.response?.status : null;
      const msg =
        fbData?.message ||
        (Array.isArray(fbData?.response?.message) ? fbData.response.message.join(", ") : null) ||
        JSON.stringify(fbData) ||
        (fallbackErr instanceof Error ? fallbackErr.message : "Falha ao registrar webhook");
      console.error(
        `[Webhook Sync] Falha ao configurar webhook na Evolution API (${fbStatus}):`,
        msg,
      );
      return { ok: false, error: msg };
    }
  }
}


/**
 * Consulta o status atual da conexão do WhatsApp na Evolution API e assegura webhook ativo
 */
export async function buscarStatusWhatsAppAction(
  slug: string,
): Promise<WhatsAppStatusResult> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) {
      return { isConnected: false, state: "unknown", error: "Restaurante não encontrado." };
    }

    const aiSettings = await db.query.aiSettingsTable.findFirst({
      where: eq(aiSettingsTable.restaurantId, restaurant.id),
    });

    const { evolutionUrl, apiKey, instanceName } = getEvolutionConfig(
      aiSettings?.evolutionInstanceName,
      aiSettings?.evolutionApiKey,
      slug,
    );

    const isBotActive = aiSettings?.isBotActive ?? false;
    const aiProvider = (aiSettings?.aiProvider || "GOOGLE_GEMINI").toUpperCase();
    const hasAiApiKey = Boolean(
      (aiProvider === "GOOGLE_GEMINI" && (aiSettings?.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) ||
      (aiProvider === "GROQ" && (aiSettings?.groqApiKey || process.env.GROQ_API_KEY)) ||
      (aiProvider === "OPENAI" && (aiSettings?.openaiApiKey || process.env.OPENAI_API_KEY)) ||
      aiSettings?.geminiApiKey ||
      aiSettings?.groqApiKey ||
      aiSettings?.openaiApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY,
    );

    if (!apiKey) {
      return {
        isConnected: false,
        state: "unknown",
        instanceName,
        isBotActive,
        hasAiApiKey,
        aiProvider,
        error: "Chave da Evolution API não configurada no servidor.",
      };
    }

    try {
      const response = await axios.get(
        `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
        {
          headers: { apikey: apiKey },
          timeout: 5000,
        },
      );

      const state = response.data?.instance?.state as
        | "open"
        | "close"
        | "connecting"
        | undefined;
      const isConnected = state === "open";

      let phone: string | undefined;
      let profileName: string | undefined;
      let profilePicUrl: string | undefined;
      let webhookUrl: string | undefined;
      let webhookEnabled = false;

      if (isConnected) {
        const appUrl = await getAppUrl();
        webhookUrl = `${appUrl}/api/webhooks/evolution`;

        // 1. Verifica se o webhook já está configurado na Evolution API
        try {
          const findRes = await axios.get(
            `${evolutionUrl}/webhook/find/${encodeURIComponent(instanceName)}`,
            {
              headers: { apikey: apiKey },
              timeout: 4000,
            },
          );
          const currentUrl = findRes.data?.url || findRes.data?.webhook?.url;
          webhookEnabled = Boolean(findRes.data?.enabled ?? findRes.data?.webhook?.enabled);

          // Se não estiver habilitado ou apontando para URL antiga/incorreta, atualiza
          if (!webhookEnabled || currentUrl !== webhookUrl) {
            console.log(
              `[WhatsApp Status] Webhook precisa de sincronização (${currentUrl} -> ${webhookUrl}). Atualizando...`,
            );
            await configurarWebhookEvolution(evolutionUrl, instanceName, apiKey, webhookUrl);
            webhookEnabled = true;
          }
        } catch {
          // Se find falhou ou não existe, dispara setWebhook preventivo
          configurarWebhookEvolution(evolutionUrl, instanceName, apiKey, webhookUrl)
            .then((res) => {
              if (res.ok) webhookEnabled = true;
            })
            .catch(() => {});
        }

        // 2. Busca informações do perfil conectado
        try {
          const fetchRes = await axios.get(
            `${evolutionUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
            {
              headers: { apikey: apiKey },
              timeout: 5000,
            },
          );

          const instData = Array.isArray(fetchRes.data)
            ? fetchRes.data.find((i: { name?: string }) => i.name === instanceName) ||
              fetchRes.data[0]
            : fetchRes.data;

          if (instData) {
            phone = instData.ownerJid
              ? instData.ownerJid.replace("@s.whatsapp.net", "")
              : instData.number;
            profileName = instData.profileName;
            profilePicUrl = instData.profilePicUrl;
          }
        } catch {
          // Ignora se não conseguir obter perfil adicional
        }
      }

      return {
        isConnected,
        state: state || "close",
        instanceName,
        phone,
        profileName,
        profilePicUrl,
        isBotActive,
        hasAiApiKey,
        aiProvider,
        webhookUrl,
        webhookEnabled,
      };
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      if (status === 404) {
        return {
          isConnected: false,
          state: "close",
          instanceName,
          isBotActive,
          hasAiApiKey,
          aiProvider,
        };
      }
      return {
        isConnected: false,
        state: "unknown",
        instanceName,
        isBotActive,
        hasAiApiKey,
        aiProvider,
        error:
          err instanceof Error ? err.message : "Falha ao consultar Evolution API.",
      };
    }
  } catch (error) {
    return {
      isConnected: false,
      state: "unknown",
      error:
        error instanceof Error ? error.message : "Erro interno ao buscar status.",
    };
  }
}

/**
 * Cria a instância (se necessário), configura o webhook automaticamente e gera o QR Code
 */
export async function gerarQrCodeWhatsAppAction(
  slug: string,
): Promise<QrCodeResult> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };

    const aiSettings = await db.query.aiSettingsTable.findFirst({
      where: eq(aiSettingsTable.restaurantId, restaurant.id),
    });

    const { evolutionUrl, apiKey, instanceName } = getEvolutionConfig(
      aiSettings?.evolutionInstanceName,
      aiSettings?.evolutionApiKey,
      slug,
    );

    if (!apiKey) {
      return {
        ok: false,
        error: "Chave da Evolution API não definida no servidor (EVOLUTION_API_KEY).",
      };
    }

    const appUrl = await getAppUrl();
    const webhookUrl = `${appUrl}/api/webhooks/evolution`;

    // 1. Tenta verificar se a instância já existe
    let instanceExists = false;
    try {
      const checkRes = await axios.get(
        `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
        {
          headers: { apikey: apiKey },
          timeout: 5000,
        },
      );
      if (checkRes.status === 200) {
        instanceExists = true;
      }
    } catch {
      instanceExists = false;
    }

    // 2. Se não existir, cria a instância na Evolution API
    if (!instanceExists) {
      try {
        await axios.post(
          `${evolutionUrl}/instance/create`,
          {
            instanceName,
            token: apiKey,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          },
          {
            headers: { apikey: apiKey, "Content-Type": "application/json" },
            timeout: 10000,
          },
        );
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          return {
            ok: false,
            error:
              "Chave não autorizada (401). Certifique-se de que a variável EVOLUTION_API_KEY no eeyFood é idêntica à AUTHENTICATION_API_KEY da Evolution API.",
          };
        }
        const msg = axios.isAxiosError(err)
          ? JSON.stringify(err.response?.data)
          : "";
        if (!msg.includes("already in use") && !msg.includes("already exists")) {
          return {
            ok: false,
            error: `Erro ao criar instância: ${axios.isAxiosError(err) ? err.response?.data?.message || err.message : "Falha na criação."}`,
          };
        }
      }
    }

    // 3. Configura o Webhook com a URL correta
    const whResult = await configurarWebhookEvolution(
      evolutionUrl,
      instanceName,
      apiKey,
      webhookUrl,
    );
    if (!whResult.ok) {
      console.warn("Aviso ao configurar webhook automático no QR code:", whResult.error);
    }

    // 4. Salva a instância e chave no banco de dados para o restaurante
    await db
      .insert(aiSettingsTable)
      .values({
        restaurantId: restaurant.id,
        evolutionInstanceName: instanceName,
        evolutionApiKey: apiKey,
        botName: aiSettings?.botName ?? "EeyFood Bot",
        systemPrompt: aiSettings?.systemPrompt ?? DEFAULT_AI_SYSTEM_PROMPT,
        isBotActive: aiSettings?.isBotActive ?? false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [aiSettingsTable.restaurantId],
        set: {
          evolutionInstanceName: instanceName,
          evolutionApiKey: apiKey,
          updatedAt: new Date(),
        },
      });

    // 5. Solicita o QR Code de conexão
    let connectRes;
    try {
      connectRes = await axios.get(
        `${evolutionUrl}/instance/connect/${encodeURIComponent(instanceName)}`,
        {
          headers: { apikey: apiKey },
          timeout: 10000,
        },
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return {
          ok: false,
          error: "Chave não autorizada (401). Verifique a variável EVOLUTION_API_KEY.",
        };
      }
      return {
        ok: false,
        error: `Erro ao buscar QR code: ${axios.isAxiosError(err) ? err.response?.data?.message || err.message : "Falha na conexão."}`,
      };
    }

    let base64 = connectRes.data?.base64 as string | undefined;
    const code = connectRes.data?.code as string | undefined;

    if (base64 && !base64.startsWith("data:image")) {
      base64 = `data:image/png;base64,${base64}`;
    }

    if (!base64 && !code) {
      return {
        ok: false,
        instanceName,
        error: "A instância já pode estar conectada ou o QR Code expirou.",
      };
    }

    revalidatePath(`/${slug}/ai`);
    revalidatePath("/ai");
    revalidatePath(`/${slug}/whatsapp`);
    revalidatePath("/whatsapp");

    return {
      ok: true,
      base64,
      code,
      instanceName,
    };
  } catch (error) {
    console.error("Erro ao gerar QR code:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Erro ao gerar QR code na Evolution API.",
    };
  }
}

/**
 * Desconecta o WhatsApp da instância
 */
export async function desconectarWhatsAppAction(
  slug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };

    const aiSettings = await db.query.aiSettingsTable.findFirst({
      where: eq(aiSettingsTable.restaurantId, restaurant.id),
    });

    const { evolutionUrl, apiKey, instanceName } = getEvolutionConfig(
      aiSettings?.evolutionInstanceName,
      aiSettings?.evolutionApiKey,
      slug,
    );

    if (instanceName && apiKey) {
      try {
        await axios.delete(
          `${evolutionUrl}/instance/logout/${encodeURIComponent(instanceName)}`,
          {
            headers: { apikey: apiKey },
            timeout: 6000,
          },
        );
      } catch (err) {
        console.warn("Erro ao fazer logout na Evolution API:", err);
      }
    }

    revalidatePath(`/${slug}/ai`);
    revalidatePath("/ai");
    revalidatePath(`/${slug}/whatsapp`);
    revalidatePath("/whatsapp");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao desconectar.",
    };
  }
}

/**
 * Reconfigura e força a sincronização do Webhook na Evolution API
 */
export async function sincronizarWebhookAction(
  slug: string,
): Promise<{ ok: boolean; webhookUrl?: string; error?: string }> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };

    const aiSettings = await db.query.aiSettingsTable.findFirst({
      where: eq(aiSettingsTable.restaurantId, restaurant.id),
    });

    const { evolutionUrl, apiKey, instanceName } = getEvolutionConfig(
      aiSettings?.evolutionInstanceName,
      aiSettings?.evolutionApiKey,
      slug,
    );

    if (!apiKey) {
      return { ok: false, error: "Chave da Evolution API não configurada." };
    }

    const appUrl = await getAppUrl();
    const webhookUrl = `${appUrl}/api/webhooks/evolution`;

    console.log(
      `[Webhook Sync] Sincronizando webhook: instância="${instanceName}", url="${webhookUrl}"`,
    );

    const whResult = await configurarWebhookEvolution(
      evolutionUrl,
      instanceName,
      apiKey,
      webhookUrl,
    );

    if (!whResult.ok) {
      return { ok: false, error: whResult.error };
    }

    return { ok: true, webhookUrl };
  } catch (error) {
    console.error("Erro ao sincronizar webhook:", error);
    let errMsg = "Falha ao sincronizar webhook na Evolution API.";
    if (axios.isAxiosError(error)) {
      errMsg =
        error.response?.data?.message ||
        JSON.stringify(error.response?.data) ||
        error.message;
    } else if (error instanceof Error) {
      errMsg = error.message;
    }
    return { ok: false, error: errMsg };
  }
}

/**
 * Alterna rapidamente o status do robô de IA (Ativo / Inativo)
 */
export async function alternarStatusBotAction(
  slug: string,
  ativar: boolean,
): Promise<{ ok: boolean; isBotActive: boolean; error?: string }> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) throw new Error("Restaurante não encontrado.");

    await db
      .insert(aiSettingsTable)
      .values({
        restaurantId: restaurant.id,
        isBotActive: ativar,
        botName: "EeyFood Bot",
        systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [aiSettingsTable.restaurantId],
        set: {
          isBotActive: ativar,
          updatedAt: new Date(),
        },
      });

    // Se estiver ativando, garante a sincronização do webhook na Evolution API
    if (ativar) {
      sincronizarWebhookAction(slug).catch((err) =>
        console.warn("Aviso ao auto-sincronizar webhook:", err),
      );
    }

    revalidatePath(`/${slug}/whatsapp`);
    revalidatePath("/whatsapp");
    revalidatePath(`/${slug}/ai`);
    revalidatePath("/ai");

    return { ok: true, isBotActive: ativar };
  } catch (error) {
    console.error("Erro ao alternar status do bot:", error);
    return {
      ok: false,
      isBotActive: !ativar,
      error: error instanceof Error ? error.message : "Erro ao alterar status.",
    };
  }
}
