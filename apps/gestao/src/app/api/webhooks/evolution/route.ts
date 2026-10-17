import {
  aiSettingsTable,
  db,
  eq,
  isClientePausado,
  pausarBotParaCliente,
  reativarBotParaCliente,
  restaurantsTable,
  sql,
} from "@fsw/db";
import axios from "axios";
import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

import { detectaHandoff, HANDOFF_SIGNAL, processarMensagemBot } from "@/lib/bot-ai";
import { cleanKey, normalizeWhatsAppNumber } from "@/lib/whatsapp-utils";

interface PendingMessageBatch {
  messages: string[];
  timer: NodeJS.Timeout;
  customerName: string;
  customerPhone: string;
  targetPhone: string;
  remoteJid: string;
  instanceName: string;
  apiKey: string;
  evolutionUrl: string;
  slug: string;
  restaurantId: string;
}

const messageDebounceMap = new Map<string, PendingMessageBatch>();
const DEBOUNCE_DELAY_MS = 3000; // Aguarda 3s para agrupar mensagens consecutivas do cliente
const activeProcessingSessions = new Set<string>();

async function sendWhatsAppMessage(
  evolutionUrl: string,
  instanceName: string,
  apiKey: string,
  targetPhone: string,
  remoteJid: string,
  text: string,
) {
  try {
    await axios.post(
      `${evolutionUrl}/message/sendText/${encodeURIComponent(instanceName)}`,
      { number: targetPhone, text },
      { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 10000 },
    );
    console.log(`[Webhook Evolution] Resposta enviada com sucesso para ${targetPhone}`);
  } catch (err: unknown) {
    console.warn(
      `[Webhook Evolution] Tentativa de envio para ${targetPhone} falhou. Tentando com remoteJid (${remoteJid})...`,
    );
    try {
      await axios.post(
        `${evolutionUrl}/message/sendText/${encodeURIComponent(instanceName)}`,
        { number: remoteJid, text },
        { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 10000 },
      );
      console.log(`[Webhook Evolution] Resposta enviada com sucesso via remoteJid para ${remoteJid}`);
    } catch (retryErr: unknown) {
      console.error(
        `[Webhook Evolution] Falha definitiva ao enviar resposta para ${targetPhone} / ${remoteJid}:`,
        retryErr instanceof Error ? retryErr.message : retryErr,
      );
    }
  }
}

// Cache para evitar processar o mesmo ID de mensagem do WhatsApp mais de uma vez (TTL de 10 minutos)
const processedMessageIds = new Map<string, number>();
const audioFallbackSentIds = new Set<string>();

function isMessageAlreadyProcessed(messageId?: string): boolean {
  if (!messageId) return false;
  const now = Date.now();
  if (processedMessageIds.size > 500) {
    for (const [id, ts] of processedMessageIds.entries()) {
      if (now - ts > 600000) processedMessageIds.delete(id);
    }
  }
  const lastTs = processedMessageIds.get(messageId);
  return Boolean(lastTs && now - lastTs < 600000);
}

function markMessageAsProcessed(messageId?: string) {
  if (!messageId) return;
  processedMessageIds.set(messageId, Date.now());
}

function findBase64InObject(obj: any, maxDepth = 6): string | undefined {
  if (!obj || maxDepth <= 0) return undefined;
  if (typeof obj === "string") {
    const s = obj.trim();
    if (s.startsWith("data:audio/") && s.includes(";base64,")) {
      return s;
    }
    if (s.length > 200 && /^[A-Za-z0-9+/=\r\n]+$/.test(s.slice(0, 200))) {
      return s;
    }
    return undefined;
  }
  if (typeof obj === "object") {
    const ignoreKeys = [
      "jpegThumbnail",
      "thumbnail",
      "profilePicUrl",
      "qr",
      "qrcode",
      "imageMessage",
      "videoMessage",
      "documentMessage",
    ];
    const priorityKeys = [
      "base64",
      "audio",
      "media",
      "data",
      "audioMessage",
      "pttMessage",
      "message",
    ];

    for (const key of priorityKeys) {
      if (obj[key] && !ignoreKeys.includes(key)) {
        const found = findBase64InObject(obj[key], maxDepth - 1);
        if (found) return found;
      }
    }
    for (const key of Object.keys(obj)) {
      if (!priorityKeys.includes(key) && !ignoreKeys.includes(key)) {
        const found = findBase64InObject(obj[key], maxDepth - 1);
        if (found) return found;
      }
    }
  }
  return undefined;
}

const webhookBase64VerifiedInstances = new Set<string>();

async function autoEnableWebhookBase64(
  evolutionUrl: string,
  instanceName: string,
  apiKey: string,
) {
  const events = ["MESSAGES_UPSERT", "SEND_MESSAGE", "CONNECTION_UPDATE"];
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://gestao.fswdonalds.eeytech.com"}/api/webhooks/evolution`;

  // Formato 1: Padrão oficial Evolution API (plano snake_case)
  try {
    await axios.post(
      `${evolutionUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        enabled: true,
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: true,
        events,
      },
      { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 6000 },
    );
    console.log(`[Webhook Evolution] Webhook auto-sincronizado (Formato 1 snake_case) com webhook_base64: true para "${instanceName}"`);
    return;
  } catch (err1) {
    console.warn(`[Webhook Evolution] Formato 1 (snake_case) falhou:`, axios.isAxiosError(err1) ? err1.response?.data : err1);
  }

  // Formato 2: Evolution API v2 (plano camelCase)
  try {
    await axios.post(
      `${evolutionUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        events,
      },
      { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 6000 },
    );
    console.log(`[Webhook Evolution] Webhook auto-sincronizado (Formato 2 camelCase) com webhookBase64: true para "${instanceName}"`);
    return;
  } catch (err2) {
    console.warn(`[Webhook Evolution] Formato 2 (camelCase) falhou:`, axios.isAxiosError(err2) ? err2.response?.data : err2);
  }

  // Formato 3: Evolution API v2 aninhado oficial (camelCase)
  try {
    await axios.post(
      `${evolutionUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events,
        },
      },
      { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 6000 },
    );
    console.log(`[Webhook Evolution] Webhook auto-sincronizado (Formato 3 aninhado camelCase) com webhookBase64 para "${instanceName}"`);
    return;
  } catch (err3) {
    console.warn(`[Webhook Evolution] Formato 3 (aninhado camelCase) falhou:`, axios.isAxiosError(err3) ? err3.response?.data : err3);
  }

  // Formato 4: Evolution API aninhado com webhook_base64
  try {
    await axios.post(
      `${evolutionUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: true,
          events,
        },
      },
      { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 6000 },
    );
    console.log(`[Webhook Evolution] Webhook auto-sincronizado (Formato 4 aninhado snake_case) com webhook_base64 para "${instanceName}"`);
    return;
  } catch (err4) {
    console.warn(`[Webhook Evolution] Formato 4 (aninhado snake_case) falhou:`, axios.isAxiosError(err4) ? err4.response?.data : err4);
  }

  // Formato 5: Evolution API aninhado com base64 simples
  try {
    await axios.post(
      `${evolutionUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events,
        },
      },
      { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 6000 },
    );
    console.log(`[Webhook Evolution] Webhook auto-sincronizado (Formato 5 aninhado base64) para "${instanceName}"`);
    return;
  } catch (err5) {
    console.warn(`[Webhook Evolution] Formato 5 falhou:`, axios.isAxiosError(err5) ? err5.response?.data : err5);
  }
}

async function ensureInstanceWebhookBase64(
  evolutionUrl: string,
  instanceName: string,
  apiKey: string,
) {
  if (!instanceName || webhookBase64VerifiedInstances.has(instanceName)) return;
  webhookBase64VerifiedInstances.add(instanceName);
  try {
    const findRes = await axios.get(
      `${evolutionUrl}/webhook/find/${encodeURIComponent(instanceName)}`,
      { headers: { apikey: apiKey }, timeout: 4000 },
    );
    const data = findRes.data;
    const isBase64Active = Boolean(
      data?.webhook_base64 ??
      data?.webhookBase64 ??
      data?.base64 ??
      data?.webhook?.webhook_base64 ??
      data?.webhook?.webhookBase64 ??
      data?.webhook?.base64,
    );
    if (isBase64Active) {
      console.log(`[Webhook Evolution] Webhook da instância "${instanceName}" já possui base64 ativo.`);
      return;
    }
  } catch {
    // Se find falhou, continua e tenta setar
  }

  await autoEnableWebhookBase64(evolutionUrl, instanceName, apiKey).catch((e) =>
    console.warn(`[Webhook Evolution] Falha ao auto-ativar base64:`, e),
  );
}

async function fetchBase64FromEvolution(
  evolutionUrl: string,
  instanceName: string,
  apiKey: string,
  messageData: any,
): Promise<{ base64?: string; mimetype?: string } | null> {
  const messageId = messageData?.key?.id;
  const remoteJid = messageData?.key?.remoteJid;

  if (!messageId && !messageData) return null;

  const payloads = [
    // 1. Formato padrão Evolution API v2: { message: { key: { id } }, convertToMp4: false }
    messageId ? { message: { key: { id: messageId } }, convertToMp4: false } : null,
    // 2. Formato com convertToMp4: true (força conversão e geração do base64)
    messageId ? { message: { key: { id: messageId } }, convertToMp4: true } : null,
    // 3. Formato simples sem flag convertToMp4
    messageId ? { message: { key: { id: messageId } } } : null,
    // 4. Formato com key completa: id, remoteJid, fromMe: false
    messageId ? { message: { key: { id: messageId, remoteJid, fromMe: false } }, convertToMp4: false } : null,
    // 5. Formato com payload messageData completo (v1 ou Baileys sem store)
    messageData?.message ? { message: messageData, convertToMp4: false } : null,
    // 6. Formato com key + message
    messageData?.key && messageData?.message ? { message: { key: messageData.key, message: messageData.message }, convertToMp4: false } : null,
  ].filter(Boolean);

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      // Pausa 900ms antes da 2ª tentativa para dar tempo da Evolution persistir a mídia
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    for (const body of payloads) {
      try {
        const res = await axios.post(
          `${evolutionUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
          body,
          {
            headers: { apikey: apiKey, "Content-Type": "application/json" },
            timeout: 10000,
          },
        );
        const data = res.data as any;
        let base64: string | undefined;
        if (typeof data === "string" && data.length > 50) {
          base64 = data;
        } else if (Buffer.isBuffer(data)) {
          base64 = data.toString("base64");
        } else if (data && typeof data === "object") {
          base64 = data?.base64 || data?.response?.base64 || data?.data?.base64 || data?.media || data?.audio;
        }

        const mimetype =
          (data && typeof data === "object"
            ? data?.mimetype || data?.response?.mimetype || data?.data?.mimetype
            : undefined) || "audio/ogg";

        if (base64) {
          console.log(`[Webhook Evolution] getBase64FromMediaMessage sucesso na tentativa ${attempt + 1}! (${base64.length} chars)`);
          return { base64, mimetype };
        }
      } catch (err: unknown) {
        const status = axios.isAxiosError(err) ? err.response?.status : null;
        const errData = axios.isAxiosError(err) ? err.response?.data : null;
        console.warn(
          `[Webhook Evolution] getBase64FromMediaMessage tentativa ${attempt + 1} falhou (${status}):`,
          errData || (err instanceof Error ? err.message : err),
        );
      }
    }
  }

  return null;
}

async function transcribeAudioWithGemini(
  geminiKey: string,
  base64Data: string,
  mimeType: string,
): Promise<string | null> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  const prompt =
    "Transcreva com máxima fidelidade em português o áudio a seguir. Retorne unicamente o texto falado pelo cliente, sem comentários adicionais, sem explicações e sem aspas.";

  // Tentativa 1: Formato oficial Google REST v1beta (inlineData / mimeType)
  for (const model of models) {
    try {
      const res = await axios.post<{
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      }>(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 },
      );

      const candidate = res.data?.candidates?.[0];
      const parts = candidate?.content?.parts;
      const validParts = Array.isArray(parts) ? parts.filter((p: any) => !p.thought) : [];
      let text = validParts.map((p: any) => p.text || "").join("").trim();
      if (!text && candidate?.content?.parts?.[0]?.text) {
        text = candidate.content.parts[0].text.trim();
      }
      if (text) {
        text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
        console.log(`[Webhook Evolution] Áudio transcrito com sucesso via Gemini (${model}): "${text}"`);
        return text;
      }
    } catch (err: unknown) {
      const errMsg = axios.isAxiosError(err)
        ? JSON.stringify(err.response?.data || err.message)
        : String(err);
      console.warn(`[Webhook Evolution] Gemini (${model}) formato inlineData falhou:`, errMsg);
    }
  }

  // Tentativa 2: Fallback snake_case (inline_data / mime_type)
  for (const model of models) {
    try {
      const res = await axios.post<{
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      }>(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 },
      );

      const candidate = res.data?.candidates?.[0];
      const parts = candidate?.content?.parts;
      const validParts = Array.isArray(parts) ? parts.filter((p: any) => !p.thought) : [];
      let text = validParts.map((p: any) => p.text || "").join("").trim();
      if (!text && candidate?.content?.parts?.[0]?.text) {
        text = candidate.content.parts[0].text.trim();
      }
      if (text) {
        text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
        return text;
      }
    } catch {
      // continua
    }
  }

  return null;
}

async function transcribeAudioWithGroq(
  groqKey: string,
  base64Data: string,
  mimeType: string,
): Promise<string | null> {
  try {
    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mp3") ? "mp3" : "ogg";
    const buffer = Buffer.from(base64Data, "base64");
    const audioFile = await toFile(buffer, `audio.${ext}`, { type: mimeType });
    const groq = new OpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 15000,
    });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      language: "pt",
    });
    const text = transcription.text?.trim();
    if (text) {
      console.log(`[Webhook Evolution] Áudio transcrito com sucesso via Groq Whisper: "${text}"`);
      return text;
    }
  } catch (err: unknown) {
    const errMsg = axios.isAxiosError(err)
      ? JSON.stringify(err.response?.data || err.message)
      : String(err);
    console.warn("[Webhook Evolution] Falha ao transcrever com Groq Whisper:", errMsg);
  }
  return null;
}

async function executarHandoff({
  restaurantId,
  slug,
  customerPhone,
  customerName,
  evolutionUrl,
  instanceName,
  apiKey,
  targetPhone,
  remoteJid,
  triggerText,
}: {
  restaurantId: string;
  slug: string;
  customerPhone: string;
  customerName: string;
  evolutionUrl: string;
  instanceName: string;
  apiKey: string;
  targetPhone: string;
  remoteJid: string;
  triggerText?: string;
}) {
  await pausarBotParaCliente(restaurantId, customerPhone, customerName);

  const wsUrl = process.env.WEBSOCKET_URL || "http://localhost:4000";
  await axios
    .post(`${wsUrl}/eventos/handoff-humano`, {
      restaurantSlug: slug,
      customerPhone,
      customerName,
    })
    .catch(() => null);

  const isAlterOrCancelOrder =
    /altera|muda|cancela|troca|modifica|edita/i.test(triggerText || "");

  const handoffMsg = isAlterOrCancelOrder
    ? "Entendido! Por motivos de segurança e agilidade da cozinha, pedidos já confirmados ou em produção não podem ser alterados automaticamente pelo robô. Estou transferindo você agora mesmo para um atendente humano verificar a alteração com a equipe. Por favor, aguarde um momento! 👨‍💼"
    : "Entendido! Um atendente humano foi notificado e assumirá a conversa a partir de agora. Por favor, aguarde um momento.";

  await sendWhatsAppMessage(
    evolutionUrl,
    instanceName,
    apiKey,
    targetPhone,
    remoteJid,
    handoffMsg,
  );
}

async function processarFilaMensagens(sessionKey: string) {
  if (activeProcessingSessions.has(sessionKey)) {
    console.log(
      `[Webhook Evolution] Sessão ${sessionKey} já está processando mensagem. Reagendando...`,
    );
    setTimeout(() => {
      processarFilaMensagens(sessionKey).catch((e) =>
        console.error(`[Webhook Evolution] Erro no processamento reagendado:`, e),
      );
    }, 1200);
    return;
  }

  const item = messageDebounceMap.get(sessionKey);
  if (!item) return;
  messageDebounceMap.delete(sessionKey);

  const combinedText = item.messages.join("\n").trim();
  if (!combinedText) return;

  activeProcessingSessions.add(sessionKey);

  try {
    console.log(
      `[Webhook Evolution] Processando lote de ${item.messages.length} mensagem(ns) de ${item.customerName} (${item.customerPhone}): "${combinedText}"`,
    );

    const botResponse = await processarMensagemBot({
      slug: item.slug,
      restaurantId: item.restaurantId,
      customerPhone: item.customerPhone,
      customerName: item.customerName,
      messageText: combinedText,
    });

    if (botResponse === HANDOFF_SIGNAL || botResponse?.includes(HANDOFF_SIGNAL)) {
      await executarHandoff({
        restaurantId: item.restaurantId,
        slug: item.slug,
        customerPhone: item.customerPhone,
        customerName: item.customerName,
        evolutionUrl: item.evolutionUrl,
        instanceName: item.instanceName,
        apiKey: item.apiKey,
        targetPhone: item.targetPhone,
        remoteJid: item.remoteJid,
        triggerText: combinedText,
      });
      return;
    }

    if (botResponse) {
      await sendWhatsAppMessage(
        item.evolutionUrl,
        item.instanceName,
        item.apiKey,
        item.targetPhone,
        item.remoteJid,
        botResponse,
      );
    } else {
      console.warn(
        `[Webhook Evolution] Nenhuma resposta gerada pela IA para ${item.customerPhone}.`,
      );
    }
  } catch (err) {
    console.error(
      `[Webhook Evolution] Erro ao processar mensagem do cliente ${item.customerPhone}:`,
      err,
    );
  } finally {
    activeProcessingSessions.delete(sessionKey);

    // Se novas mensagens chegaram enquanto a IA respondia, agenda o processamento do restante
    if (messageDebounceMap.has(sessionKey)) {
      setTimeout(() => {
        processarFilaMensagens(sessionKey).catch((e) =>
          console.error(`[Webhook Evolution] Erro ao processar lote subsequente:`, e),
        );
      }, 500);
    }
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("debug") === "audio") {
    const diagnostics: any = { timestamp: new Date().toISOString() };
    try {
      // 1. Busca aiSettings no banco
      const [settings] = await db
        .select({
          slug: restaurantsTable.slug,
          restaurantId: restaurantsTable.id,
          geminiApiKey: aiSettingsTable.geminiApiKey,
          groqApiKey: aiSettingsTable.groqApiKey,
          openaiApiKey: aiSettingsTable.openaiApiKey,
          evolutionApiKey: aiSettingsTable.evolutionApiKey,
          evolutionInstanceName: aiSettingsTable.evolutionInstanceName,
          aiProvider: aiSettingsTable.aiProvider,
        })
        .from(aiSettingsTable)
        .innerJoin(restaurantsTable, eq(aiSettingsTable.restaurantId, restaurantsTable.id))
        .limit(1);

      diagnostics.restaurant = settings?.slug;
      diagnostics.provider = settings?.aiProvider;
      diagnostics.hasGemini = Boolean(settings?.geminiApiKey);
      diagnostics.geminiKeyPrefix = settings?.geminiApiKey ? settings.geminiApiKey.slice(0, 8) + "..." : null;
      diagnostics.hasOpenai = Boolean(settings?.openaiApiKey);
      diagnostics.hasGroq = Boolean(settings?.groqApiKey);

      const apiKey = cleanKey(
        process.env.EVOLUTION_API_KEY ||
        settings?.evolutionApiKey ||
        "J@0seW#5creT&10te_et01&Terc5#Wes0@J",
      );
      const instance = settings?.evolutionInstanceName || "eeyfood-bot";
      const evoUrl = "https://evolution.fswdonalds.eeytech.com";

      // 2. Busca o último áudio recebido
      const msgRes = await axios.post(
        `${evoUrl}/chat/findMessages/${encodeURIComponent(instance)}`,
        { where: {} },
        { headers: { apikey: apiKey }, timeout: 8000 },
      );
      const records = msgRes.data?.messages?.records || msgRes.data || [];
      const lastAudio = records.find((m: any) => m.messageType === "audioMessage");
      diagnostics.lastAudioId = lastAudio?.key?.id;

      if (lastAudio?.key?.id) {
        // 3. Tenta getBase64FromMediaMessage
        const base64Res = await axios.post(
          `${evoUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`,
          { message: { key: { id: lastAudio.key.id } }, convertToMp4: false },
          { headers: { apikey: apiKey }, timeout: 10000 },
        );
        const b64 = base64Res.data?.base64;
        diagnostics.base64Length = b64 ? b64.length : 0;
        diagnostics.mimetype = base64Res.data?.mimetype;

        if (b64 && settings?.geminiApiKey) {
          // 4. Testa diretamente o Gemini
          const geminiKey = settings.geminiApiKey;
          const cleanB64 = String(b64)
            .replace(/^data:[^;]+;base64,/, "")
            .replace(/\s+/g, "")
            .trim();
          let cleanMime = (base64Res.data?.mimetype || "audio/ogg")
            .split(";")[0]
            .trim()
            .toLowerCase();
          if (!cleanMime.startsWith("audio/")) cleanMime = "audio/ogg";

          diagnostics.geminiAttempt = {};
          for (const model of ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]) {
            try {
              const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
                {
                  contents: [
                    {
                      role: "user",
                      parts: [
                        { text: "Transcreva com fidelidade o áudio a seguir em português. Retorne apenas o texto falado." },
                        { inlineData: { mimeType: cleanMime, data: cleanB64 } },
                      ],
                    },
                  ],
                },
                { headers: { "Content-Type": "application/json" }, timeout: 20000 },
              );
              diagnostics.geminiAttempt[model] = {
                status: res.status,
                text: res.data?.candidates?.[0]?.content?.parts?.[0]?.text,
              };
              if (diagnostics.geminiAttempt[model].text) break;
            } catch (gErr: any) {
              diagnostics.geminiAttempt[model] = {
                status: gErr.response?.status,
                data: gErr.response?.data,
                message: gErr.message,
              };
            }
          }
        }
      }

      return NextResponse.json({ ok: true, diagnostics });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message, stack: e.stack, diagnostics });
    }
  }

  return NextResponse.json({
    status: "online",
    endpoint: "Evolution API Webhook Receiver",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Normaliza variações de nomenclatura de eventos
    const rawEvent = String(body.event || body.type || "")
      .toUpperCase()
      .replace(/[\.-]/g, "_");

    console.log(
      `[Webhook Evolution] Evento recebido: "${rawEvent || "sem_evento"}", Instância: "${body.instance || body.instanceName || "desconhecida"}"`,
    );

    const messageData = Array.isArray(body.data) ? body.data[0] : body.data;

    // Processa se for evento de upsert de mensagem ou se contiver payload válido de mensagem
    const isMessageUpsert =
      rawEvent === "MESSAGES_UPSERT" ||
      rawEvent.includes("UPSERT") ||
      Boolean(messageData?.key && (messageData?.message || messageData?.messageType));

    if (!isMessageUpsert) {
      return NextResponse.json({ ok: true, ignoredEvent: rawEvent });
    }

    if (!messageData || !messageData.key) {
      return NextResponse.json({ ok: true, reason: "no_message_data" });
    }

    const messageId = String(messageData.key.id || "");
    if (messageId && isMessageAlreadyProcessed(messageId)) {
      console.log(
        `[Webhook Evolution] Mensagem ${messageId} já foi processada recentemente. Ignorando evento duplicado.`,
      );
      return NextResponse.json({ ok: true, reason: "already_processed" });
    }

    // Ignora mensagens enviadas pelo próprio robô / WhatsApp conectado
    if (messageData.key.fromMe) {
      console.log(
        `[Webhook Evolution] Mensagem ignorada pois foi enviada pelo próprio número conectado (fromMe: true). Envie a mensagem a partir de OUTRO número de WhatsApp para testar o bot.`,
      );
      return NextResponse.json({ ok: true, reason: "from_me" });
    }

    // Ignora mensagens de grupos ou transmissões de status
    const remoteJid = String(messageData.key.remoteJid || "");
    if (remoteJid.includes("@g.us") || remoteJid.includes("status@broadcast")) {
      return NextResponse.json({ ok: true, reason: "group_or_broadcast_ignored" });
    }

    // Extrai o identificador ou telefone do remetente
    const rawJid =
      messageData.key.remoteJidAlt ||
      messageData.key.remoteJid ||
      messageData.key.participant ||
      "";
    let customerPhone = rawJid.replace(/@.*$/, "").replace(/\D/g, "");
    customerPhone = normalizeWhatsAppNumber(customerPhone) || customerPhone;

    const customerName = messageData.pushName || "Cliente";
    const instanceName = cleanKey(
      body.instance || body.instanceName || body.data?.owner || "",
    );

    const rawUrl =
      body?.serverUrl ||
      body?.server_url ||
      process.env.EVOLUTION_API_URL ||
      process.env.EVOLUTION_URL ||
      "https://evolution.fswdonalds.eeytech.com";
    const evolutionUrl = cleanKey(rawUrl).replace(/\/+$/, "");

    // 1. Busca configurações de IA correspondentes à instância (busca exata)
    let [aiSettings] = await db
      .select({
        slug: restaurantsTable.slug,
        restaurantId: restaurantsTable.id,
        evolutionApiKey: aiSettingsTable.evolutionApiKey,
        aiProvider: aiSettingsTable.aiProvider,
        geminiApiKey: aiSettingsTable.geminiApiKey,
        groqApiKey: aiSettingsTable.groqApiKey,
        openaiApiKey: aiSettingsTable.openaiApiKey,
        isBotActive: aiSettingsTable.isBotActive,
        isBotPaused: aiSettingsTable.isBotPaused,
        pausedForPhone: aiSettingsTable.pausedForPhone,
      })
      .from(aiSettingsTable)
      .innerJoin(restaurantsTable, eq(aiSettingsTable.restaurantId, restaurantsTable.id))
      .where(
        sql`lower(trim(${aiSettingsTable.evolutionInstanceName})) = ${instanceName.toLowerCase()}
            OR (${instanceName.toLowerCase()} = 'eeyfood-bot' AND lower(trim(${aiSettingsTable.evolutionInstanceName})) = 'burgercraft-bot')`
      )
      .limit(1);

    // 2. Fallback resiliente: busca por correspondência flexível ou restaurante único
    if (!aiSettings) {
      console.log(
        `[Webhook Evolution] Instância "${instanceName}" não encontrada por correspondência exata. Buscando correspondência flexível...`,
      );

      const cleanInst = instanceName.replace(/^restaurante_/, "").toLowerCase();

      const matches = await db
        .select({
          slug: restaurantsTable.slug,
          restaurantId: restaurantsTable.id,
          evolutionApiKey: aiSettingsTable.evolutionApiKey,
          aiProvider: aiSettingsTable.aiProvider,
          geminiApiKey: aiSettingsTable.geminiApiKey,
          groqApiKey: aiSettingsTable.groqApiKey,
          openaiApiKey: aiSettingsTable.openaiApiKey,
          isBotActive: aiSettingsTable.isBotActive,
          isBotPaused: aiSettingsTable.isBotPaused,
          pausedForPhone: aiSettingsTable.pausedForPhone,
        })
        .from(aiSettingsTable)
        .innerJoin(restaurantsTable, eq(aiSettingsTable.restaurantId, restaurantsTable.id))
        .where(
          sql`lower(trim(${aiSettingsTable.evolutionInstanceName})) LIKE ${`%${cleanInst}%`} 
              OR lower(trim(${restaurantsTable.slug})) = ${cleanInst}
              OR ${instanceName.toLowerCase()} LIKE '%' || lower(trim(${restaurantsTable.slug})) || '%'`,
        )
        .limit(1);

      if (matches.length > 0) {
        aiSettings = matches[0];
        console.log(
          `[Webhook Evolution] Associado ao restaurante "${aiSettings.slug}". Vinculando instância "${instanceName}" no banco...`,
        );
        await db
          .update(aiSettingsTable)
          .set({ evolutionInstanceName: instanceName, updatedAt: new Date() })
          .where(eq(aiSettingsTable.restaurantId, aiSettings.restaurantId));
      } else {
        // Se houver apenas 1 restaurante no sistema, utiliza ele
        const allRestaurants = await db
          .select({ id: restaurantsTable.id, slug: restaurantsTable.slug })
          .from(restaurantsTable)
          .limit(2);

        if (allRestaurants.length === 1) {
          const defaultRestaurant = allRestaurants[0];
          console.log(
            `[Webhook Evolution] Usando restaurante único cadastrado: "${defaultRestaurant.slug}"`,
          );
          const singleMatch = await db
            .select({
              slug: restaurantsTable.slug,
              restaurantId: restaurantsTable.id,
              evolutionApiKey: aiSettingsTable.evolutionApiKey,
              aiProvider: aiSettingsTable.aiProvider,
              geminiApiKey: aiSettingsTable.geminiApiKey,
              groqApiKey: aiSettingsTable.groqApiKey,
              openaiApiKey: aiSettingsTable.openaiApiKey,
              isBotActive: aiSettingsTable.isBotActive,
              isBotPaused: aiSettingsTable.isBotPaused,
              pausedForPhone: aiSettingsTable.pausedForPhone,
            })
            .from(aiSettingsTable)
            .innerJoin(restaurantsTable, eq(aiSettingsTable.restaurantId, restaurantsTable.id))
            .where(eq(restaurantsTable.id, defaultRestaurant.id))
            .limit(1);

          if (singleMatch.length > 0) {
            aiSettings = singleMatch[0];
            await db
              .update(aiSettingsTable)
              .set({ evolutionInstanceName: instanceName, updatedAt: new Date() })
              .where(eq(aiSettingsTable.restaurantId, aiSettings.restaurantId));
          }
        }
      }
    }

    if (!aiSettings) {
      console.warn(
        `[Webhook Evolution] Nenhuma configuração de IA encontrada no banco para a instância "${instanceName}".`,
      );
      return NextResponse.json({ ok: true, reason: "instance_not_found" });
    }

    if (!aiSettings.isBotActive) {
      console.log(
        `[Webhook Evolution] Bot está inativo (isBotActive: false) para o restaurante "${aiSettings.slug}". Ative na aba /ai ou /whatsapp.`,
      );
      return NextResponse.json({ ok: true, reason: "bot_inactive" });
    }

    // Desempacota mensagens protegidas por ephemeralMessage, viewOnce ou interactive
    let innerMessage = messageData.message;
    if (innerMessage?.ephemeralMessage?.message) {
      innerMessage = innerMessage.ephemeralMessage.message;
    }
    if (innerMessage?.viewOnceMessage?.message) {
      innerMessage = innerMessage.viewOnceMessage.message;
    }
    if (innerMessage?.viewOnceMessageV2?.message) {
      innerMessage = innerMessage.viewOnceMessageV2.message;
    }
    if (innerMessage?.documentWithCaptionMessage?.message) {
      innerMessage = innerMessage.documentWithCaptionMessage.message;
    }

    let messageText =
      innerMessage?.conversation ||
      innerMessage?.extendedTextMessage?.text ||
      innerMessage?.imageMessage?.caption ||
      innerMessage?.videoMessage?.caption ||
      innerMessage?.buttonsResponseMessage?.selectedDisplayText ||
      innerMessage?.buttonsResponseMessage?.selectedButtonId ||
      innerMessage?.listResponseMessage?.title ||
      innerMessage?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      innerMessage?.templateButtonReplyMessage?.selectedDisplayText ||
      innerMessage?.interactiveResponseMessage?.body?.text ||
      innerMessage?.editedMessage?.message?.conversation ||
      innerMessage?.editedMessage?.message?.extendedTextMessage?.text ||
      "";

    // Bot pausado para este cliente específico
    const clientePausado = await isClientePausado(aiSettings.restaurantId, customerPhone);
    if (clientePausado) {
      const normText = messageText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const resumeBotKeywords = [
        "cardapio", "menu", "pedido", "pedir", "bot", "robo", "robô", 
        "voltar", "oi", "ola", "olá", "boa noite", "bom dia", "boa tarde", 
        "iniciar", "comecar", "ver cardapio", "quero pedir", "#bot"
      ];
      const shouldResume = resumeBotKeywords.some((k) => normText.includes(k) || normText === k);

      if (shouldResume) {
        console.log(
          `[Webhook Evolution] Cliente ${customerPhone} solicitou atendimento/cardápio ("${messageText}"). Reativando bot automaticamente.`,
        );
        await reativarBotParaCliente(aiSettings.restaurantId, customerPhone);
      } else {
        console.log(
          `[Webhook Evolution] Cliente ${customerPhone} está em atendimento humano manual. Mensagem silenciada.`,
        );
        return NextResponse.json({ ok: true, reason: "client_paused" });
      }
    }

    const envKey = cleanKey(
      process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY,
    );
    const apiKey = envKey || cleanKey(aiSettings.evolutionApiKey);

    // Assegura em segundo plano que o webhook da instância esteja configurado com webhook_base64: true
    if (evolutionUrl && instanceName && apiKey) {
      void ensureInstanceWebhookBase64(evolutionUrl, instanceName, apiKey);
    }

    const targetPhone = normalizeWhatsAppNumber(customerPhone) || customerPhone;
    const sessionKey = `${aiSettings.restaurantId}:${customerPhone}`;

    // Intercepta mensagens de áudio/voz e transcreve de acordo com o provedor
    const audioMessage =
      innerMessage?.audioMessage || innerMessage?.pttMessage;

    if (!messageText && audioMessage) {
      console.log(
        `[Webhook Evolution] Mensagem de áudio detectada de ${customerPhone}. Iniciando processo de transcrição...`,
      );

      // 1. Tenta obter o Base64: verifica todos os locais possíveis no payload do webhook da Evolution
      let rawBase64: string | undefined =
        (typeof audioMessage === "string" && audioMessage.length > 200 ? audioMessage : undefined) ||
        audioMessage?.base64 ||
        innerMessage?.audioMessage?.base64 ||
        innerMessage?.pttMessage?.base64 ||
        messageData?.base64 ||
        messageData?.message?.base64 ||
        messageData?.message?.audioMessage?.base64 ||
        messageData?.message?.pttMessage?.base64 ||
        body?.data?.base64 ||
        body?.data?.message?.base64 ||
        body?.data?.message?.audioMessage?.base64 ||
        body?.data?.message?.pttMessage?.base64 ||
        body?.base64 ||
        body?.message?.base64 ||
        (Array.isArray(body?.data) && body?.data?.[0]?.base64) ||
        (Array.isArray(body?.data) && body?.data?.[0]?.message?.audioMessage?.base64) ||
        (Array.isArray(body?.data) && body?.data?.[0]?.message?.base64) ||
        findBase64InObject(audioMessage) ||
        findBase64InObject(messageData) ||
        findBase64InObject(body);

      let rawMimeType: string =
        audioMessage?.mimetype ||
        innerMessage?.audioMessage?.mimetype ||
        innerMessage?.pttMessage?.mimetype ||
        "audio/ogg";

      // 1.1 Se veio URL de download externa em vez de base64
      const mediaDownloadUrl =
        messageData?.mediaUrl ||
        body?.data?.mediaUrl ||
        messageData?.url ||
        body?.data?.url ||
        audioMessage?.url ||
        audioMessage?.mediaUrl ||
        innerMessage?.audioMessage?.mediaUrl;

      if (
        !rawBase64 &&
        mediaDownloadUrl &&
        typeof mediaDownloadUrl === "string" &&
        mediaDownloadUrl.startsWith("http") &&
        !mediaDownloadUrl.includes("mmg.whatsapp.net")
      ) {
        try {
          console.log(`[Webhook Evolution] Baixando áudio a partir de mediaUrl: ${mediaDownloadUrl}`);
          const urlRes = await axios.get(mediaDownloadUrl, {
            responseType: "arraybuffer",
            timeout: 10000,
          });
          rawBase64 = Buffer.from(urlRes.data).toString("base64");
          if (urlRes.headers["content-type"]) rawMimeType = String(urlRes.headers["content-type"]);
        } catch (dlErr) {
          console.warn(
            "[Webhook Evolution] Falha ao baixar áudio de mediaUrl:",
            dlErr instanceof Error ? dlErr.message : dlErr,
          );
        }
      }

      // 2. Se não veio no payload do webhook, busca na Evolution API
      if (!rawBase64) {
        // Dispara prevenção em segundo plano para que as próximas mensagens já venham com base64
        void autoEnableWebhookBase64(evolutionUrl, instanceName, apiKey);

        const mediaResult = await fetchBase64FromEvolution(
          evolutionUrl,
          instanceName,
          apiKey,
          messageData,
        );
        if (mediaResult?.base64) {
          rawBase64 = mediaResult.base64;
          if (mediaResult.mimetype) {
            rawMimeType = mediaResult.mimetype;
          }
        }
      }

      const cleanBase64 = String(rawBase64 || "")
        .replace(/^data:[^;]+;base64,/, "")
        .replace(/\s+/g, "")
        .trim();

      // Sanitiza MIME type: remove parâmetros como '; codecs=opus' que quebram o Gemini
      let cleanMimeType = (rawMimeType || "audio/ogg")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!cleanMimeType.startsWith("audio/")) {
        cleanMimeType = "audio/ogg";
      }

      if (cleanBase64) {
        console.log(
          `[Webhook Evolution] Base64 do áudio obtido com sucesso (${cleanBase64.length} chars, mime: "${cleanMimeType}").`,
        );

        const provider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();
        const geminiKey = cleanKey(
          aiSettings.geminiApiKey ||
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY,
        );
        const groqKey = cleanKey(
          aiSettings.groqApiKey || process.env.GROQ_API_KEY,
        );
        const openaiKey = cleanKey(
          aiSettings.openaiApiKey || process.env.OPENAI_API_KEY,
        );

        // 1. Google Gemini (multimodal de alta fidelidade e gratuito)
        if (!messageText && (provider === "GOOGLE_GEMINI" || geminiKey)) {
          if (geminiKey) {
            const transcribed = await transcribeAudioWithGemini(
              geminiKey,
              cleanBase64,
              cleanMimeType,
            );
            if (transcribed) {
              messageText = transcribed;
            }
          }
        }

        // 2. Groq Whisper (ultra-rápido ~300ms e altíssima precisão em português)
        if (!messageText && (provider === "GROQ" || groqKey)) {
          if (groqKey) {
            const transcribed = await transcribeAudioWithGroq(
              groqKey,
              cleanBase64,
              cleanMimeType,
            );
            if (transcribed) {
              messageText = transcribed;
            }
          }
        }

        // 3. Fallback para OpenAI Whisper (se configurada e ainda sem transcrição)
        if (!messageText && openaiKey) {
          try {
            const ext = cleanMimeType.includes("mp4")
              ? "mp4"
              : cleanMimeType.includes("mp3")
                ? "mp3"
                : "ogg";
            const buffer = Buffer.from(cleanBase64, "base64");
            const audioFile = await toFile(buffer, `audio.${ext}`, { type: cleanMimeType });
            const openai = new OpenAI({ apiKey: openaiKey, timeout: 15000 });
            const transcription = await openai.audio.transcriptions.create({
              file: audioFile,
              model: "whisper-1",
              language: "pt",
            });
            if (transcription.text?.trim()) {
              messageText = transcription.text.trim();
              console.log(
                `[Webhook Evolution] Áudio transcrito com sucesso via OpenAI Whisper: "${messageText}"`,
              );
            }
          } catch (openaiErr: unknown) {
            const errMsg = axios.isAxiosError(openaiErr)
              ? JSON.stringify(openaiErr.response?.data || openaiErr.message)
              : String(openaiErr);
            console.warn("[Webhook Evolution] Falha ao transcrever com OpenAI Whisper:", errMsg);
          }
        }
      } else {
        console.warn(
          `[Webhook Evolution] Não foi possível extrair o conteúdo base64 do áudio recebido de ${customerPhone}.`,
        );
      }
    }

    if (!messageText) {
      if (audioMessage) {
        const fallbackId = messageData?.key?.id || `${customerPhone}:${Date.now()}`;
        if (!audioFallbackSentIds.has(fallbackId)) {
          audioFallbackSentIds.add(fallbackId);
          if (audioFallbackSentIds.size > 300) {
            const first = audioFallbackSentIds.values().next().value;
            if (first) audioFallbackSentIds.delete(first);
          }

          console.warn(
            `[Webhook Evolution] Áudio de ${customerPhone} (ID: ${fallbackId}) não pôde ser decodificado. Enviando aviso de áudio único...`,
          );
          await sendWhatsAppMessage(
            evolutionUrl,
            instanceName,
            apiKey,
            targetPhone,
            remoteJid,
            "Recebi seu áudio, mas não consegui compreendê-lo com nitidez. 🙏\nVocê poderia escrever o seu pedido por mensagem de texto ou mandar novamente?",
          );
        } else {
          console.log(
            `[Webhook Evolution] Aviso de áudio já enviado para a mensagem ${fallbackId}. Ignorando disparo duplicado.`,
          );
        }
        return NextResponse.json({
          ok: true,
          reason: "audio_transcription_fallback_notified",
        });
      }

      console.log(`[Webhook Evolution] Mensagem vazia recebida de ${customerPhone}.`);
      return NextResponse.json({ ok: true, reason: "empty_text" });
    }

    // Marca a mensagem como processada com sucesso para descartar futuros eventos duplicados da Evolution API
    if (messageData?.key?.id) {
      markMessageAsProcessed(messageData.key.id);
    }

    // 1. Se a mensagem for diretamente solicitação de atendimento humano, atende na hora sem fila
    if (detectaHandoff(messageText)) {
      const existing = messageDebounceMap.get(sessionKey);
      if (existing) {
        clearTimeout(existing.timer);
        messageDebounceMap.delete(sessionKey);
      }
      await executarHandoff({
        restaurantId: aiSettings.restaurantId,
        slug: aiSettings.slug,
        customerPhone,
        customerName,
        evolutionUrl,
        instanceName,
        apiKey,
        targetPhone,
        remoteJid,
        triggerText: messageText,
      });
      return NextResponse.json({ ok: true, handoff: true });
    }

    // 2. Debounce / Buffer de mensagens rápidas consecutivas
    const existing = messageDebounceMap.get(sessionKey);
    if (existing) {
      clearTimeout(existing.timer);
      existing.messages.push(messageText);
      existing.customerName = customerName || existing.customerName;
      existing.targetPhone = targetPhone;
      existing.remoteJid = remoteJid;
      existing.timer = setTimeout(() => {
        processarFilaMensagens(sessionKey).catch((e) =>
          console.error(`[Webhook Evolution] Erro no processamento de lote:`, e),
        );
      }, DEBOUNCE_DELAY_MS);

      console.log(
        `[Webhook Evolution] Mensagem consecutiva adicionada ao buffer de ${customerPhone} (total: ${existing.messages.length} msgs). Aguardando ${DEBOUNCE_DELAY_MS}ms...`,
      );
      return NextResponse.json({ ok: true, queued: true, count: existing.messages.length });
    } else {
      const timer = setTimeout(() => {
        processarFilaMensagens(sessionKey).catch((e) =>
          console.error(`[Webhook Evolution] Erro no processamento de lote:`, e),
        );
      }, DEBOUNCE_DELAY_MS);

      messageDebounceMap.set(sessionKey, {
        messages: [messageText],
        timer,
        customerName,
        customerPhone,
        targetPhone,
        remoteJid,
        instanceName,
        apiKey,
        evolutionUrl,
        slug: aiSettings.slug,
        restaurantId: aiSettings.restaurantId,
      });

      console.log(
        `[Webhook Evolution] Nova mensagem de ${customerPhone} em buffer. Aguardando ${DEBOUNCE_DELAY_MS}ms para capturar possíveis mensagens seguidas...`,
      );
      return NextResponse.json({ ok: true, queued: true, count: 1 });
    }
  } catch (error) {
    console.error("[Webhook Evolution] Erro no webhook Evolution:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
