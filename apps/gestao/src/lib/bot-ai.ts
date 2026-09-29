import {
  aiSettingsTable,
  buscarRestauranteComCardapioPorSlug,
  db,
  DEFAULT_AI_SYSTEM_PROMPT,
  eq,
  isClientePausado,
  restaurantsTable,
  salvarCarrinhoAbandonado,
} from "@fsw/db";
import OpenAI from "openai";

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

const consecutiveFailuresMap = new Map<string, number>();

const detectaHandoff = (text: string): boolean => {
  const lower = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return HANDOFF_KEYWORDS.some((kw) =>
    lower.includes(kw.normalize("NFD").replace(/[̀-ͯ]/g, "")),
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

export const processarMensagemBot = async ({
  slug,
  customerPhone,
  customerName,
  messageText,
}: ProcessarMensagemBotInput) => {
  const [aiSettings] = await db
    .select()
    .from(aiSettingsTable)
    .innerJoin(
      restaurantsTable,
      eq(aiSettingsTable.restaurantId, restaurantsTable.id),
    )
    .where(eq(restaurantsTable.slug, slug))
    .limit(1);

  if (!aiSettings || !aiSettings.AiSettings.isBotActive) {
    return null;
  }

  // Verifica se o robô está pausado para este cliente específico
  const pausado = await isClientePausado(
    aiSettings.AiSettings.restaurantId,
    customerPhone,
  );
  if (pausado) {
    return null;
  }

  const conversationKey = `${aiSettings.AiSettings.restaurantId}:${customerPhone}`;

  if (detectaHandoff(messageText ?? "")) {
    consecutiveFailuresMap.delete(conversationKey);
    return HANDOFF_SIGNAL;
  }

  // Configuração dinâmica do provedor (Google Gemini, Groq ou OpenAI)
  const provider = (aiSettings.AiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();
  let apiKey = "";
  let baseURL: string | undefined = undefined;
  let model = "gemini-2.0-flash";

  if (provider === "GOOGLE_GEMINI") {
    apiKey = aiSettings.AiSettings.geminiApiKey || process.env.GEMINI_API_KEY || "";
    baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
    model = "gemini-2.0-flash";
  } else if (provider === "GROQ") {
    apiKey = aiSettings.AiSettings.groqApiKey || process.env.GROQ_API_KEY || "";
    baseURL = "https://api.groq.com/openai/v1";
    model = "llama-3.3-70b-versatile";
  } else {
    // OPENAI
    apiKey = aiSettings.AiSettings.openaiApiKey || process.env.OPENAI_API_KEY || "";
    model = "gpt-4o";
  }

  // Fallback caso a chave do provedor não esteja configurada mas outra chave exista
  if (!apiKey) {
    if (aiSettings.AiSettings.geminiApiKey) {
      apiKey = aiSettings.AiSettings.geminiApiKey;
      baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
      model = "gemini-2.0-flash";
    } else if (aiSettings.AiSettings.groqApiKey) {
      apiKey = aiSettings.AiSettings.groqApiKey;
      baseURL = "https://api.groq.com/openai/v1";
      model = "llama-3.3-70b-versatile";
    } else if (aiSettings.AiSettings.openaiApiKey) {
      apiKey = aiSettings.AiSettings.openaiApiKey;
      baseURL = undefined;
      model = "gpt-4o";
    }
  }

  if (!apiKey) {
    return null;
  }

  const openai = new OpenAI({
    apiKey,
    baseURL,
  });

  const textToProcess = messageText || "";
  if (!textToProcess) return null;

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "listar_cardapio",
        description:
          "Lista todas as categorias e produtos disponíveis no restaurante.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    {
      type: "function",
      function: {
        name: "gerar_link_confirmacao",
        description:
          "Salva o carrinho do cliente e gera um link para que ele confirme o pedido no app, onde poderá ajustar opcionais, informar o endereço de entrega, escolher o pagamento e finalizar a compra.",
        parameters: {
          type: "object",
          properties: {
            itens: {
              type: "array",
              description: "Lista de itens que o cliente deseja pedir",
              items: {
                type: "object",
                properties: {
                  produtoId: { type: "string", description: "ID do produto" },
                  nomeProduto: { type: "string", description: "Nome do produto" },
                  quantidade: { type: "number", description: "Quantidade" },
                  precoUnitario: {
                    type: "number",
                    description: "Preço unitário do produto em reais",
                  },
                },
                required: ["produtoId", "nomeProduto", "quantidade", "precoUnitario"],
              },
            },
            metodoConsumo: {
              type: "string",
              enum: ["DELIVERY", "TAKEAWAY", "DINE_IN"],
              description: "Método de consumo preferido pelo cliente",
            },
          },
          required: ["itens", "metodoConsumo"],
        },
      },
    },
  ];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        aiSettings.AiSettings.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Cliente: ${customerName} (${customerPhone})\nMensagem: ${textToProcess}`,
    },
  ];

  // Loop agêntico: permite que o modelo encadeie chamadas de ferramentas
  // (ex.: listar_cardapio → gerar_link_confirmacao) em uma única interação.
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response;
    try {
      response = await openai.chat.completions.create({
        model,
        messages,
        tools,
      });
    } catch {
      const failures = (consecutiveFailuresMap.get(conversationKey) ?? 0) + 1;
      consecutiveFailuresMap.set(conversationKey, failures);
      if (failures >= 3) {
        consecutiveFailuresMap.delete(conversationKey);
        return HANDOFF_SIGNAL;
      }
      return null;
    }

    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      consecutiveFailuresMap.delete(conversationKey);
      return assistantMessage.content;
    }

    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== "function") continue;

      const functionName = toolCall.function.name;
      let toolResult = "";

      if (functionName === "listar_cardapio") {
        const cardapio = await buscarRestauranteComCardapioPorSlug(slug);
        toolResult = cardapio
          ? cardapio.menuCategories
              .map(
                (c) =>
                  `*${c.name}*\n${c.products
                    .map((p) => `- ${p.name} (ID: ${p.id}): R$ ${p.price}`)
                    .join("\n")}`,
              )
              .join("\n\n")
          : "Cardápio não disponível no momento.";
      } else if (functionName === "gerar_link_confirmacao") {
        const args = JSON.parse(toolCall.function.arguments) as {
          itens: Array<{
            produtoId: string;
            nomeProduto: string;
            quantidade: number;
            precoUnitario: number;
          }>;
          metodoConsumo: "DELIVERY" | "TAKEAWAY" | "DINE_IN";
        };

        // sessionId por cliente — upsert garante um carrinho ativo por vez
        const sessionId = `wa-${customerPhone}`;

        const cart = await salvarCarrinhoAbandonado({
          sessionId,
          slug,
          customerName,
          customerPhone,
          consumptionMethod: args.metodoConsumo,
          products: args.itens.map((i) => ({
            id: i.produtoId,
            name: i.nomeProduto,
            quantity: i.quantidade,
            price: i.precoUnitario,
          })),
        });

        if (!cart) {
          toolResult = JSON.stringify({
            erro: "Não foi possível criar o carrinho. Tente novamente.",
          });
        } else {
          const vendasUrl = process.env.VENDAS_URL || "http://localhost:3001";
          const cartLink = `${vendasUrl}/${slug}/menu?cartId=${cart.id}`;
          toolResult = JSON.stringify({
            cartId: cart.id,
            cartLink,
            subtotal: cart.subtotal,
            total: cart.total,
            itemCount: cart.itemCount,
          });
        }
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }
  }

  return null;
};
