"use server";

import { aiSettingsTable, buscarRestaurantePorSlug, db, eq } from "@fsw/db";
import axios from "axios";
import { revalidatePath } from "next/cache";

interface WhatsAppStatusResult {
  isConnected: boolean;
  state: "open" | "close" | "connecting" | "unknown";
  instanceName?: string;
  phone?: string;
  profileName?: string;
  profilePicUrl?: string;
  error?: string;
}

interface QrCodeResult {
  ok: boolean;
  base64?: string;
  code?: string;
  instanceName?: string;
  error?: string;
}

function getEvolutionConfig(storedInstanceName?: string | null, storedApiKey?: string | null, restaurantSlug?: string) {
  const evolutionUrl = (process.env.EVOLUTION_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const apiKey = storedApiKey || process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY || "";
  
  const cleanSlug = restaurantSlug ? restaurantSlug.toLowerCase().replace(/[^a-z0-9]/g, "_") : "loja";
  const instanceName = storedInstanceName || `restaurante_${cleanSlug}`;

  return { evolutionUrl, apiKey, instanceName };
}

/**
 * Consulta o status atual da conexão do WhatsApp na Evolution API
 */
export async function buscarStatusWhatsAppAction(slug: string): Promise<WhatsAppStatusResult> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { isConnected: false, state: "unknown", error: "Restaurante não encontrado." };

    const aiSettings = await db.query.aiSettingsTable.findFirst({
      where: eq(aiSettingsTable.restaurantId, restaurant.id),
    });

    const { evolutionUrl, apiKey, instanceName } = getEvolutionConfig(
      aiSettings?.evolutionInstanceName,
      aiSettings?.evolutionApiKey,
      slug
    );

    if (!apiKey) {
      return {
        isConnected: false,
        state: "unknown",
        instanceName,
        error: "Chave da Evolution API (EVOLUTION_API_KEY) não configurada.",
      };
    }

    try {
      const response = await axios.get(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 5000,
      });

      const state = response.data?.instance?.state as "open" | "close" | "connecting" | undefined;
      const isConnected = state === "open";

      let phone: string | undefined;
      let profileName: string | undefined;
      let profilePicUrl: string | undefined;

      if (isConnected) {
        try {
          const fetchRes = await axios.get(`${evolutionUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
            headers: { apikey: apiKey },
            timeout: 5000,
          });

          const instData = Array.isArray(fetchRes.data)
            ? fetchRes.data.find((i: { name?: string }) => i.name === instanceName) || fetchRes.data[0]
            : fetchRes.data;

          if (instData) {
            phone = instData.ownerJid ? instData.ownerJid.replace("@s.whatsapp.net", "") : instData.number;
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
      };
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      if (status === 404) {
        return { isConnected: false, state: "close", instanceName };
      }
      return {
        isConnected: false,
        state: "unknown",
        instanceName,
        error: err instanceof Error ? err.message : "Falha ao consultar Evolution API.",
      };
    }
  } catch (error) {
    return {
      isConnected: false,
      state: "unknown",
      error: error instanceof Error ? error.message : "Erro interno ao buscar status.",
    };
  }
}

/**
 * Cria a instância (se necessário), configura o webhook automaticamente e gera o QR Code
 */
export async function gerarQrCodeWhatsAppAction(slug: string): Promise<QrCodeResult> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };

    const aiSettings = await db.query.aiSettingsTable.findFirst({
      where: eq(aiSettingsTable.restaurantId, restaurant.id),
    });

    const { evolutionUrl, apiKey, instanceName } = getEvolutionConfig(
      aiSettings?.evolutionInstanceName,
      aiSettings?.evolutionApiKey,
      slug
    );

    if (!apiKey) {
      return {
        ok: false,
        error: "Chave da Evolution API não definida no servidor (EVOLUTION_API_KEY).",
      };
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://gestao.eeyfood.eeytech.com").replace(/\/$/, "");

    // 1. Tenta verificar se a instância já existe
    let instanceExists = false;
    try {
      const checkRes = await axios.get(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 5000,
      });
      if (checkRes.status === 200) {
        instanceExists = true;
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        instanceExists = false;
      } else {
        instanceExists = false;
      }
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
          }
        );
      } catch (err: unknown) {
        // Se já existir, ignora erro 403 / "already in use"
        const msg = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : "";
        if (!msg.includes("already in use") && !msg.includes("already exists")) {
          return {
            ok: false,
            error: `Erro ao criar instância: ${axios.isAxiosError(err) ? err.response?.data?.message || err.message : "Falha na criação."}`,
          };
        }
      }
    }

    // 3. Configura o Webhook automaticamente
    try {
      await axios.post(
        `${evolutionUrl}/webhook/set/${instanceName}`,
        {
          webhook: {
            enabled: true,
            url: `${appUrl}/api/webhooks/evolution`,
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT"],
          },
        },
        {
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          timeout: 6000,
        }
      );
    } catch (err) {
      console.warn("Aviso ao configurar webhook automático:", err);
    }

    // 4. Salva a instância e chave no banco de dados para o restaurante
    await db
      .insert(aiSettingsTable)
      .values({
        restaurantId: restaurant.id,
        evolutionInstanceName: instanceName,
        evolutionApiKey: apiKey,
        botName: aiSettings?.botName ?? "EeyFood Bot",
        systemPrompt: aiSettings?.systemPrompt ?? "Você é um atendente virtual de delivery.",
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
    const connectRes = await axios.get(`${evolutionUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: apiKey },
      timeout: 10000,
    });

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
      error: error instanceof Error ? error.message : "Erro ao gerar QR code na Evolution API.",
    };
  }
}

/**
 * Desconecta o WhatsApp da instância
 */
export async function desconectarWhatsAppAction(slug: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const restaurant = await buscarRestaurantePorSlug(slug);
    if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };

    const aiSettings = await db.query.aiSettingsTable.findFirst({
      where: eq(aiSettingsTable.restaurantId, restaurant.id),
    });

    const { evolutionUrl, apiKey, instanceName } = getEvolutionConfig(
      aiSettings?.evolutionInstanceName,
      aiSettings?.evolutionApiKey,
      slug
    );

    if (instanceName && apiKey) {
      try {
        await axios.delete(`${evolutionUrl}/instance/logout/${instanceName}`, {
          headers: { apikey: apiKey },
          timeout: 6000,
        });
      } catch (err) {
        console.warn("Erro ao fazer logout na Evolution API:", err);
      }
    }

    revalidatePath(`/${slug}/ai`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao desconectar.",
    };
  }
}
