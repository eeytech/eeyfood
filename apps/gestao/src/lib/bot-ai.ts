import {
  aiSettingsTable,
  buscarRestauranteComCardapioPorSlug,
  buscarRestaurantePorSlug,
  db,
  DEFAULT_AI_SYSTEM_PROMPT,
  eq,
  isClientePausado,
  restaurantsTable,
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
  restaurantId?: string;
  customerPhone: string;
  customerName: string;
  messageText?: string;
  audioUrl?: string;
}

let cachedGeminiModels: { key: string; models: string[]; timestamp: number } | null = null;

async function getAvailableGeminiModels(key: string): Promise<string[]> {
  const now = Date.now();
  if (
    cachedGeminiModels &&
    cachedGeminiModels.key === key &&
    now - cachedGeminiModels.timestamp < 300000
  ) {
    return cachedGeminiModels.models;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = await res.json();
      const rawModels: Array<{ name: string; supportedGenerationMethods?: string[] }> =
        data?.models || [];
      const available = rawModels
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      if (available.length > 0) {
        const priorityPatterns = [
          /^gemini-2\.0-flash/i,
          /^gemini-1\.5-flash/i,
          /^gemini-2\.5-flash/i,
          /^gemini-1\.5-pro/i,
        ];
        const sorted: string[] = [];
        for (const pat of priorityPatterns) {
          for (const m of available) {
            if (pat.test(m) && !sorted.includes(m)) sorted.push(m);
          }
        }
        for (const m of available) {
          if (!sorted.includes(m)) sorted.push(m);
        }
        cachedGeminiModels = { key, models: sorted, timestamp: now };
        console.log(`[Bot AI] Modelos Gemini disponíveis para esta chave (${sorted.length}):`, sorted.slice(0, 4));
        return sorted;
      }
    } else {
      const err = await res.json().catch(() => null);
      console.warn(`[Bot AI] Status ${res.status} ao consultar /v1beta/models do Gemini:`, err);
    }
  } catch (err) {
    console.warn(`[Bot AI] Falha ao consultar /v1beta/models do Gemini:`, err);
  }

  return [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
  ];
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
  if (!cleaned) {
    console.warn("[Bot AI] callGeminiNative: Chave do Gemini vazia!");
    return null;
  }

  const candidateModels = await getAvailableGeminiModels(cleaned);
  const userContent = `Cliente: ${customerName} (${customerPhone})\nMensagem: ${userMessage}`;

  for (const m of candidateModels.slice(0, 4)) {
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
          signal: AbortSignal.timeout(8000),
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
          `[Bot AI] Gemini v1beta (${m}) com system_instruction retornou status ${res.status}:`,
          errData?.error?.message || errData,
        );
      }
    } catch (err: unknown) {
      console.warn(
        `[Bot AI] Erro na chamada Gemini v1beta (${m}):`,
        err instanceof Error ? err.message : String(err),
      );
    }

    // 2. Fallback v1beta SEM system_instruction (prompt unificado em contents — sempre v1beta)
    try {
      const resContents = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(cleaned)}`,
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
          signal: AbortSignal.timeout(8000),
        },
      );

      if (resContents.ok) {
        const data = await resContents.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log(`[Bot AI] Gemini v1beta (${m}) modo contents respondeu com sucesso!`);
          return text;
        }
      } else {
        const errData = await resContents.json().catch(() => null);
        console.warn(
          `[Bot AI] Gemini v1beta (${m}) modo contents retornou status ${resContents.status}:`,
          errData?.error?.message || errData,
        );
      }
    } catch (err: unknown) {
      console.warn(
        `[Bot AI] Erro no Gemini v1beta (${m}) modo contents:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.error(`[Bot AI] Todos os modelos Gemini testados falharam para ${customerPhone}.`);
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
  restaurantId,
  customerPhone,
  customerName,
  messageText,
}: ProcessarMensagemBotInput): Promise<string | null> => {
  let restaurant = null;
  if (restaurantId) {
    const [found] = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, restaurantId))
      .limit(1);
    restaurant = found;
  }
  if (!restaurant) {
    restaurant = await buscarRestaurantePorSlug(slug);
  }
  if (!restaurant) {
    console.warn(`[Bot AI] Restaurante não encontrado pelo slug: "${slug}" ou id: "${restaurantId}"`);
    return null;
  }

  const aiSettings = await db.query.aiSettingsTable.findFirst({
    where: eq(aiSettingsTable.restaurantId, restaurant.id),
  });

  if (!aiSettings || !aiSettings.isBotActive) {
    console.log(
      `[Bot AI] Bot está inativo (isBotActive: false) para o restaurante "${restaurant.name}" (${slug}). Ative na aba /ai ou /whatsapp.`,
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
  const rawVendasUrl = (
    process.env.NEXT_PUBLIC_VENDAS_URL ||
    process.env.VENDAS_URL ||
    "https://fswdonalds.eeytech.com"
  ).replace(/\/$/, "");
  const menuUrl = `${rawVendasUrl}/`;

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
  const fullSystemPrompt = `${baseSystemPrompt}\n${menuContext}\n\n### INSTRUÇÃO CRÍTICA:\nResponda diretamente e em português natural do Brasil de forma prestativa, elegante e acolhedora. Você NÃO precisa invocar ferramentas externas nem usar funções de código.`;

  // 3. Chaves de API configuradas
  const geminiKey = cleanKey(
    aiSettings.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  );
  const openaiKey = cleanKey(aiSettings.openaiApiKey || process.env.OPENAI_API_KEY);

  const rawProvider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();
  const selectedProvider = rawProvider === "OPENAI" ? "OPENAI" : "GOOGLE_GEMINI";

  console.log(
    `[Bot AI] Atendendo ${customerPhone} no restaurante "${restaurant.name}" (${slug}). Provedor: ${selectedProvider}. Tem GeminiKey: ${!!geminiKey} (${geminiKey ? geminiKey.slice(0, 6) + "..." : "NÃO CONFIGURADA"}), Tem OpenAIKey: ${!!openaiKey}`,
  );

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
