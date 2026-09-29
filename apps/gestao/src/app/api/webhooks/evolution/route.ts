import {
  aiSettingsTable,
  db,
  eq,
  isClientePausado,
  pausarBotParaCliente,
  restaurantsTable,
} from "@fsw/db";
import axios from "axios";
import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

import { HANDOFF_SIGNAL, processarMensagemBot } from "@/lib/bot-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.event !== "messages.upsert") {
      return NextResponse.json({ ok: true });
    }

    const messageData = body.data;

    // Ignora mensagens enviadas pelo próprio bot
    if (messageData.key.fromMe) {
      return NextResponse.json({ ok: true });
    }

    const customerPhone = messageData.key.remoteJid.replace("@s.whatsapp.net", "");
    const customerName = messageData.pushName || "Cliente";
    const instanceName = body.instance;
    const evolutionUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";

    const [aiSettings] = await db
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
      .where(eq(aiSettingsTable.evolutionInstanceName, instanceName))
      .limit(1);

    if (!aiSettings || !aiSettings.isBotActive) {
      return NextResponse.json({ ok: true });
    }

    // Bot pausado para este cliente específico — silenciar respostas automáticas
    const clientePausado = await isClientePausado(aiSettings.restaurantId, customerPhone);
    if (clientePausado) {
      return NextResponse.json({ ok: true });
    }

    let messageText =
      messageData.message?.conversation ||
      messageData.message?.extendedTextMessage?.text ||
      "";

    // Intercepta mensagens de áudio/voz e transcreve de acordo com o provedor
    const audioMessage =
      messageData.message?.audioMessage || messageData.message?.pttMessage;

    if (!messageText && audioMessage) {
      try {
        const mediaResponse = await axios.post<{ base64: string; mimetype: string }>(
          `${evolutionUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
          { message: { key: messageData.key, message: messageData.message } },
          { headers: { apikey: aiSettings.evolutionApiKey } },
        );

        const base64Data = mediaResponse.data.base64;
        const mimeType = mediaResponse.data.mimetype || "audio/ogg";
        const ext = mimeType.includes("mp4")
          ? "mp4"
          : mimeType.includes("mp3")
            ? "mp3"
            : "ogg";

        const provider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();

        // 1. Se for Groq: usa Whisper Large V3 gratuito e ultrarrápido
        if (provider === "GROQ" && (aiSettings.groqApiKey || process.env.GROQ_API_KEY)) {
          try {
            const buffer = Buffer.from(base64Data, "base64");
            const audioFile = await toFile(buffer, `audio.${ext}`, { type: mimeType });
            const groq = new OpenAI({
              apiKey: aiSettings.groqApiKey || process.env.GROQ_API_KEY,
              baseURL: "https://api.groq.com/openai/v1",
            });
            const transcription = await groq.audio.transcriptions.create({
              file: audioFile,
              model: "whisper-large-v3",
              language: "pt",
            });
            messageText = transcription.text;
          } catch (groqErr) {
            console.warn("Aviso ao transcrever com Groq:", groqErr);
          }
        }

        // 2. Se for Google Gemini (ou fallback): usa transcrição nativa multimodal gratuita
        if (!messageText && (provider === "GOOGLE_GEMINI" || aiSettings.geminiApiKey)) {
          const geminiKey = aiSettings.geminiApiKey || process.env.GEMINI_API_KEY;
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
              messageText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            } catch (geminiErr) {
              console.warn("Aviso ao transcrever com Gemini:", geminiErr);
            }
          }
        }

        // 3. Fallback para OpenAI Whisper (se configurada)
        if (!messageText && (aiSettings.openaiApiKey || process.env.OPENAI_API_KEY)) {
          try {
            const buffer = Buffer.from(base64Data, "base64");
            const audioFile = await toFile(buffer, `audio.${ext}`, { type: mimeType });
            const openai = new OpenAI({ apiKey: aiSettings.openaiApiKey || process.env.OPENAI_API_KEY });
            const transcription = await openai.audio.transcriptions.create({
              file: audioFile,
              model: "whisper-1",
              language: "pt",
            });
            messageText = transcription.text;
          } catch (openaiErr) {
            console.warn("Aviso ao transcrever com OpenAI Whisper:", openaiErr);
          }
        }
      } catch (audioError) {
        console.error("Erro ao obter/processar áudio:", audioError);
      }
    }

    if (!messageText) {
      return NextResponse.json({ ok: true });
    }

    const botResponse = await processarMensagemBot({
      slug: aiSettings.slug,
      customerPhone,
      customerName,
      messageText,
    });

    if (botResponse === HANDOFF_SIGNAL) {
      // Pausar bot para este cliente na lista de atendimento humano
      await pausarBotParaCliente(aiSettings.restaurantId, customerPhone, customerName);

      const wsUrl = process.env.WEBSOCKET_URL || "http://localhost:4000";
      await axios
        .post(`${wsUrl}/eventos/handoff-humano`, {
          restaurantSlug: aiSettings.slug,
          customerPhone,
          customerName,
        })
        .catch(() => null); // Não bloquear fluxo se WS estiver offline

      await axios.post(
        `${evolutionUrl}/message/sendText/${instanceName}`,
        {
          number: customerPhone,
          text: "Entendido! Um atendente humano foi notificado e assumirá a conversa a partir de agora. Por favor, aguarde um momento.",
        },
        { headers: { apikey: aiSettings.evolutionApiKey } },
      );

      return NextResponse.json({ ok: true });
    }

    if (botResponse) {
      await axios.post(
        `${evolutionUrl}/message/sendText/${instanceName}`,
        {
          number: customerPhone,
          text: botResponse,
        },
        {
          headers: {
            apikey: aiSettings.evolutionApiKey,
          },
        },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook Evolution:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
