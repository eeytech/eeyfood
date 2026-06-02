import { aiSettingsTable, db, eq, restaurantsTable } from "@fsw/db";
import axios from "axios";
import { NextResponse } from "next/server";

import { processarMensagemBot } from "@/lib/bot-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Evolution API envia eventos como 'messages.upsert'
    if (body.event !== "messages.upsert") {
      return NextResponse.json({ ok: true });
    }

    const messageData = body.data;
    const customerPhone = messageData.key.remoteJid.replace("@s.whatsapp.net", "");
    const customerName = messageData.pushName || "Cliente";
    const instanceName = body.instance;
    
    // Buscar qual restaurante pertence esta instância
    const [aiSettings] = await db
      .select({
        slug: restaurantsTable.slug,
        evolutionApiKey: aiSettingsTable.evolutionApiKey,
      })
      .from(aiSettingsTable)
      .innerJoin(restaurantsTable, eq(aiSettingsTable.restaurantId, restaurantsTable.id))
      .where(eq(aiSettingsTable.evolutionInstanceName, instanceName))
      .limit(1);

    if (!aiSettings) {
      return NextResponse.json({ error: "Instância não configurada." }, { status: 404 });
    }

    const messageText = messageData.message?.conversation || 
                       messageData.message?.extendedTextMessage?.text || 
                       "";

    // Chamar lógica de IA
    const botResponse = await processarMensagemBot({
      slug: aiSettings.slug,
      customerPhone,
      customerName,
      messageText,
    });

    if (botResponse) {
      // Enviar resposta de volta via Evolution API
      const evolutionUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
      
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
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook Evolution:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
