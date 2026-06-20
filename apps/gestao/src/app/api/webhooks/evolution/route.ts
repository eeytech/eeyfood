import { aiSettingsTable, db, eq, restaurantsTable } from "@fsw/db";
import axios from "axios";
import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

import { processarMensagemBot } from "@/lib/bot-ai";

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
        evolutionApiKey: aiSettingsTable.evolutionApiKey,
        openaiApiKey: aiSettingsTable.openaiApiKey,
        isBotActive: aiSettingsTable.isBotActive,
      })
      .from(aiSettingsTable)
      .innerJoin(restaurantsTable, eq(aiSettingsTable.restaurantId, restaurantsTable.id))
      .where(eq(aiSettingsTable.evolutionInstanceName, instanceName))
      .limit(1);

    if (!aiSettings || !aiSettings.isBotActive) {
      return NextResponse.json({ ok: true });
    }

    let messageText =
      messageData.message?.conversation ||
      messageData.message?.extendedTextMessage?.text ||
      "";

    // Intercepta mensagens de áudio/voz e transcreve via Whisper
    const audioMessage =
      messageData.message?.audioMessage || messageData.message?.pttMessage;

    if (!messageText && audioMessage && aiSettings.openaiApiKey) {
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

        const buffer = Buffer.from(base64Data, "base64");
        const audioFile = await toFile(buffer, `audio.${ext}`, { type: mimeType });

        const openai = new OpenAI({ apiKey: aiSettings.openaiApiKey });
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "pt",
        });

        messageText = transcription.text;
      } catch (audioError) {
        console.error("Erro ao transcrever áudio:", audioError);
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
