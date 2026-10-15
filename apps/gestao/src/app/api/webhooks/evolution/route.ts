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
const DEBOUNCE_DELAY_MS = 2500; // Aguarda 2.5s para agrupar mensagens consecutivas do cliente

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

  const handoffMsg =
    "Entendido! Um atendente humano foi notificado e assumirá a conversa a partir de agora. Por favor, aguarde um momento.";
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
  const item = messageDebounceMap.get(sessionKey);
  if (!item) return;
  messageDebounceMap.delete(sessionKey);

  const combinedText = item.messages.join("\n").trim();
  if (!combinedText) return;

  console.log(
    `[Webhook Evolution] Processando lote de ${item.messages.length} mensagem(ns) de ${item.customerName} (${item.customerPhone}): "${combinedText}"`,
  );

  try {
    const botResponse = await processarMensagemBot({
      slug: item.slug,
      restaurantId: item.restaurantId,
      customerPhone: item.customerPhone,
      customerName: item.customerName,
      messageText: combinedText,
    });

    if (botResponse === HANDOFF_SIGNAL) {
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
  }
}

export async function GET() {
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
      process.env.EVOLUTION_API_URL ||
      process.env.EVOLUTION_URL ||
      "http://localhost:8080";
    const evolutionUrl = cleanKey(rawUrl).replace(/\/+$/, "");

    // 1. Busca configurações de IA correspondentes à instância (busca exata)
    let [aiSettings] = await db
      .select({
        slug: restaurantsTable.slug,
        restaurantId: restaurantsTable.id,
        evolutionApiKey: aiSettingsTable.evolutionApiKey,
        aiProvider: aiSettingsTable.aiProvider,
        geminiApiKey: aiSettingsTable.geminiApiKey,
        openaiApiKey: aiSettingsTable.openaiApiKey,
        isBotActive: aiSettingsTable.isBotActive,
        isBotPaused: aiSettingsTable.isBotPaused,
        pausedForPhone: aiSettingsTable.pausedForPhone,
      })
      .from(aiSettingsTable)
      .innerJoin(restaurantsTable, eq(aiSettingsTable.restaurantId, restaurantsTable.id))
      .where(sql`lower(trim(${aiSettingsTable.evolutionInstanceName})) = ${instanceName.toLowerCase()}`)
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

    // Intercepta mensagens de áudio/voz e transcreve de acordo com o provedor
    const audioMessage =
      innerMessage?.audioMessage || innerMessage?.pttMessage;

    if (!messageText && audioMessage) {
      try {
        const mediaResponse = await axios.post<{ base64: string; mimetype: string }>(
          `${evolutionUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
          { message: { key: messageData.key, message: messageData.message } },
          { headers: { apikey: apiKey, "Content-Type": "application/json" }, timeout: 10000 },
        );

        const base64Data = mediaResponse.data.base64;
        const mimeType = mediaResponse.data.mimetype || "audio/ogg";
        const ext = mimeType.includes("mp4")
          ? "mp4"
          : mimeType.includes("mp3")
            ? "mp3"
            : "ogg";

        const provider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();

        // 1. Se for Google Gemini (ou fallback): usa transcrição nativa multimodal gratuita
        if (
          !messageText &&
          (provider === "GOOGLE_GEMINI" ||
            aiSettings.geminiApiKey ||
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY)
        ) {
          const geminiKey =
            aiSettings.geminiApiKey ||
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY;
          if (geminiKey) {
            try {
              const geminiRes = await axios.post<{
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              }>(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                {
                  contents: [
                    {
                      parts: [
                        {
                          text: "Transcreva com máxima fidelidade em português o áudio a seguir. Retorne unicamente o texto falado, sem comentários ou formatação adicional.",
                        },
                        {
                          inline_data: {
                            mime_type: mimeType,
                            data: base64Data,
                          },
                        },
                      ],
                    },
                  ],
                },
                { timeout: 15000 },
              );
              messageText =
                geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            } catch (geminiErr) {
              console.warn("[Webhook Evolution] Aviso ao transcrever com Gemini:", geminiErr);
            }
          }
        }

        // 2. Fallback para OpenAI Whisper (se configurada)
        if (!messageText && (aiSettings.openaiApiKey || process.env.OPENAI_API_KEY)) {
          try {
            const buffer = Buffer.from(base64Data, "base64");
            const audioFile = await toFile(buffer, `audio.${ext}`, { type: mimeType });
            const openai = new OpenAI({
              apiKey: aiSettings.openaiApiKey || process.env.OPENAI_API_KEY,
            });
            const transcription = await openai.audio.transcriptions.create({
              file: audioFile,
              model: "whisper-1",
              language: "pt",
            });
            messageText = transcription.text;
          } catch (openaiErr) {
            console.warn("[Webhook Evolution] Aviso ao transcrever com OpenAI Whisper:", openaiErr);
          }
        }
      } catch (audioError) {
        console.error("[Webhook Evolution] Erro ao obter/processar áudio:", audioError);
      }
    }

    if (!messageText) {
      console.log(`[Webhook Evolution] Mensagem vazia recebida de ${customerPhone}.`);
      return NextResponse.json({ ok: true, reason: "empty_text" });
    }

    const targetPhone = normalizeWhatsAppNumber(customerPhone) || customerPhone;
    const sessionKey = `${aiSettings.restaurantId}:${customerPhone}`;

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
