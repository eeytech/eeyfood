import {
  aiSettingsTable,
  buscarRestauranteComCardapioPorSlug,
  buscarRestaurantePorSlug,
  db,
  DEFAULT_AI_SYSTEM_PROMPT,
  eq,
  isClientePausado,
  salvarCarrinhoAbandonado,
} from "@fsw/db";
import OpenAI from "openai";

const cleanKey = (k?: string | null) => (k ? k.trim().replace(/^["']|["']$/g, "") : "");

const HANDOFF_KEYWORDS = [
  "atendente",
  "falar com atendente",
  "humano",
  "pessoa real",
  "suporte",
  "ajuda humana",
  "falar com alguem",
  "falar com alguém",
  "quero atendimento",
  "atendimento humano",
];

const detectaHandoff = (text: string): boolean => {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return HANDOFF_KEYWORDS.some((kw) =>
    lower.includes(kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
  );
};

export const HANDOFF_SIGNAL = "__HANDOFF_REQUIRED__";

interface ProcessarMensagemBotInput {
  slug: string;
  customerPhone: string;
  customerName: string;
  messageText?: string;
  audioUrl?: string;
}

/**
 * Chamada nativa REST oficial da Google Generative Language API (Gemini).
 * Extremamente rápida, confiável e compatível com chaves gratuitas do Google AI Studio.
 */
async function callGeminiNative(
  geminiKey: string,
  sysPrompt: string,
  userMessage: string,
  customerName: string,
  customerPhone: string,
): Promise<string | null> {
  const cleaned = cleanKey(geminiKey);
  if (!cleaned) return null;

  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  const userContent = `Cliente: ${customerName} (${customerPhone})\nMensagem: ${userMessage}`;

  for (const m of models) {
    // 1. Tenta v1beta com system_instruction
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(cleaned)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: sysPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userContent }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
          signal: AbortSignal.timeout(9000),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log(`[Bot AI] Gemini v1beta (${m}) respondeu com sucesso!`);
          return text;
        }
      } else {
        const errData = await res.json().catch(() => null);
        console.warn(
          `[Bot AI] Gemini v1beta (${m}) retornou status ${res.status}:`,
          errData?.error?.message || errData,
        );
      }
    } catch (err: unknown) {
      console.warn(
        `[Bot AI] Erro na chamada Gemini v1beta (${m}):`,
        err instanceof Error ? err.message : String(err),
      );
    }

    // 2. Fallback v1 sem system_instruction (instruções injetadas no contents)
    try {
      const resV1 = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${m}:generateContent?key=${encodeURIComponent(cleaned)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${sysPrompt}\n\n---\n\n${userContent}` }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
          signal: AbortSignal.timeout(9000),
        },
      );

      if (resV1.ok) {
        const data = await resV1.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log(`[Bot AI] Gemini v1 (${m}) respondeu com sucesso!`);
          return text;
        }
      }
    } catch (err: unknown) {
      console.warn(
        `[Bot AI] Erro na chamada Gemini v1 (${m}):`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return null;
}

/**
 * Chamada à API da OpenAI (se configurada).
 */
async function callOpenAi(
  openaiKey: string,
  sysPrompt: string,
  userMessage: string,
  customerName: string,
  customerPhone: string,
): Promise<string | null> {
  const cleaned = cleanKey(openaiKey);
  if (!cleaned) return null;

  const models = ["gpt-4o-mini", "gpt-4o"];
  const client = new OpenAI({ apiKey: cleaned, timeout: 12000 });

  for (const m of models) {
    try {
      const res = await client.chat.completions.create({
        model: m,
        messages: [
          { role: "system", content: sysPrompt },
          {
            role: "user",
            content: `Cliente: ${customerName} (${customerPhone})\nMensagem: ${userMessage}`,
          },
        ],
        temperature: 0.7,
      });
      const text = res.choices[0]?.message?.content?.trim();
      if (text) {
        console.log(`[Bot AI] OpenAI (${m}) respondeu com sucesso!`);
        return text;
      }
    } catch (err: unknown) {
      console.warn(
        `[Bot AI] Erro na chamada OpenAI (${m}):`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return null;
}

export const processarMensagemBot = async ({
  slug,
  customerPhone,
  customerName,
  messageText,
}: ProcessarMensagemBotInput): Promise<string | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    console.warn(`[Bot AI] Restaurante não encontrado pelo slug: "${slug}"`);
    return null;
  }

  const aiSettings = await db.query.aiSettingsTable.findFirst({
    where: eq(aiSettingsTable.restaurantId, restaurant.id),
  });

  if (!aiSettings || !aiSettings.isBotActive) {
    console.log(
      `[Bot AI] Bot está inativo (isBotActive: false) para o restaurante "${slug}". Ative na aba /ai ou /whatsapp.`,
    );
    return null;
  }

  // Verifica se o robô está pausado para este cliente específico
  const pausado = await isClientePausado(aiSettings.restaurantId, customerPhone);
  if (pausado) {
    console.log(`[Bot AI] Cliente ${customerPhone} está em atendimento humano manual.`);
    return null;
  }

  const textToProcess = (messageText || "").trim();
  if (!textToProcess) return null;

  // 1. Detecção explícita de pedido de atendimento humano
  if (detectaHandoff(textToProcess)) {
    console.log(`[Bot AI] Cliente ${customerPhone} solicitou atendimento humano.`);
    return HANDOFF_SIGNAL;
  }

  // 2. Busca cardápio atualizado e link da loja online
  const cardapio = await buscarRestauranteComCardapioPorSlug(slug).catch(() => null);
  const vendasUrl =
    process.env.NEXT_PUBLIC_VENDAS_URL ||
    process.env.VENDAS_URL ||
    "https://fswdonalds.eeytech.com";
  const menuUrl = `${vendasUrl.replace(/\/$/, "")}/${slug}/menu`;

  let menuContext = `\n\n### INFORMAÇÕES DO RESTAURANTE E CARDÁPIO EM TEMPO REAL:
Nome do Restaurante: ${restaurant.name}
Link Oficial do Cardápio Online para Pedidos: ${menuUrl}

DIRETRIZES FUNDAMENTAIS:
- Quando o cliente pedir o cardápio, tiver dúvidas sobre itens ou quiser fazer pedidos, apresente os principais pratos ou categorias de forma acolhedora e envie o link oficial do cardápio: ${menuUrl}
- Você tem permissão e dados para responder sobre produtos, itens e preços utilizando as informações abaixo.\n\n`;

  if (cardapio?.menuCategories?.length) {
    menuContext +=
      "Categorias e Produtos disponíveis no restaurante:\n" +
      cardapio.menuCategories
        .map((c) => {
          const prods = c.products
            .map(
              (p) =>
                `  • ${p.name} - R$ ${Number(p.price).toFixed(2)}${p.description ? ` (${p.description})` : ""}`,
            )
            .join("\n");
          return `*${c.name}*:\n${prods}`;
        })
        .join("\n\n");
  }

  const baseSystemPrompt = aiSettings.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT;
  const fullSystemPrompt = `${baseSystemPrompt}\n${menuContext}`;

  // 3. Chaves de API configuradas
  const geminiKey = cleanKey(
    aiSettings.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  );
  const openaiKey = cleanKey(aiSettings.openaiApiKey || process.env.OPENAI_API_KEY);

  const rawProvider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();
  const selectedProvider = rawProvider === "OPENAI" ? "OPENAI" : "GOOGLE_GEMINI";

  let botReply: string | null = null;

  // 4. Executa chamada na ordem de preferência do usuário
  if (selectedProvider === "GOOGLE_GEMINI") {
    if (geminiKey) {
      botReply = await callGeminiNative(
        geminiKey,
        fullSystemPrompt,
        textToProcess,
        customerName,
        customerPhone,
      );
    }
    // Fallback para OpenAI se Gemini não respondeu
    if (!botReply && openaiKey) {
      console.log(`[Bot AI] Tentando fallback para OpenAI...`);
      botReply = await callOpenAi(
        openaiKey,
        fullSystemPrompt,
        textToProcess,
        customerName,
        customerPhone,
      );
    }
  } else {
    // Provedor primário: OpenAI
    if (openaiKey) {
      botReply = await callOpenAi(
        openaiKey,
        fullSystemPrompt,
        textToProcess,
        customerName,
        customerPhone,
      );
    }
    // Fallback para Gemini se OpenAI não respondeu
    if (!botReply && geminiKey) {
      console.log(`[Bot AI] Tentando fallback para Gemini...`);
      botReply = await callGeminiNative(
        geminiKey,
        fullSystemPrompt,
        textToProcess,
        customerName,
        customerPhone,
      );
    }
  }

  // 5. Se o modelo respondeu com sucesso, retorna
  if (botReply) {
    return botReply;
  }

  // 6. Resposta graciosa de segurança caso a API da IA esteja temporariamente fora do ar
  // Garante que o cliente NUNCA fique sem resposta e sempre receba o link oficial do cardápio!
  console.warn(
    `[Bot AI] Nenhuma LLM respondeu. Enviando mensagem de boas-vindas com cardápio para ${customerPhone}.`,
  );
  return `Olá, ${customerName ? customerName : "tudo bem"}! Seja muito bem-vindo ao *${restaurant.name}*! 😊\n\nAcesse nosso cardápio completo online para conferir as opções, valores e fazer seu pedido com facilidade:\n👉 ${menuUrl}\n\nSe precisar de mais alguma informação, estou à disposição!`;
};
