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
  const pausado = await isClientePausado(
    aiSettings.restaurantId,
    customerPhone,
  );
  if (pausado) {
    console.log(`[Bot AI] Cliente ${customerPhone} está em atendimento humano manual.`);
    return null;
  }

  const conversationKey = `${aiSettings.restaurantId}:${customerPhone}`;

  if (detectaHandoff(messageText ?? "")) {
    consecutiveFailuresMap.delete(conversationKey);
    return HANDOFF_SIGNAL;
  }

  // Configuração dinâmica do provedor (Google Gemini, Groq ou OpenAI)
  const provider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();
  let apiKey = "";
  let baseURL: string | undefined = undefined;
  let model = "gemini-2.0-flash";

  if (provider === "GOOGLE_GEMINI") {
    apiKey =
      aiSettings.geminiApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";
    baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
    model = "gemini-2.0-flash";
  } else if (provider === "GROQ") {
    apiKey = aiSettings.groqApiKey || process.env.GROQ_API_KEY || "";
    baseURL = "https://api.groq.com/openai/v1";
    model = "llama-3.3-70b-versatile";
  } else {
    // OPENAI
    apiKey = aiSettings.openaiApiKey || process.env.OPENAI_API_KEY || "";
    model = "gpt-4o";
  }

  // Fallback caso a chave do provedor escolhido não esteja preenchida mas outra chave exista
  if (!apiKey) {
    if (
      aiSettings.geminiApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY
    ) {
      apiKey =
        aiSettings.geminiApiKey ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        "";
      baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
      model = "gemini-2.0-flash";
    } else if (aiSettings.groqApiKey || process.env.GROQ_API_KEY) {
      apiKey = aiSettings.groqApiKey || process.env.GROQ_API_KEY || "";
      baseURL = "https://api.groq.com/openai/v1";
      model = "llama-3.3-70b-versatile";
    } else if (aiSettings.openaiApiKey || process.env.OPENAI_API_KEY) {
      apiKey = aiSettings.openaiApiKey || process.env.OPENAI_API_KEY || "";
      baseURL = undefined;
      model = "gpt-4o";
    }
  }

  if (!apiKey) {
    console.warn(
      `[Bot AI] Nenhuma chave de API configurada para o bot no restaurante "${slug}". Acesse a aba /ai e insira sua chave gratuita do Google Gemini, Groq ou OpenAI.`,
    );
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
          "Lista todas as categorias e produtos disponíveis no cardápio do restaurante.",
        parameters: {
          type: "object",
          properties: {
            categoria: {
              type: "string",
              description: "Filtro opcional pelo nome da categoria (ex: Lanches, Bebidas, Pizzas).",
            },
          },
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
        aiSettings.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Cliente: ${customerName} (${customerPhone})\nMensagem: ${textToProcess}`,
    },
  ];

  // Loop agêntico com tolerância a falhas e fallback direto
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response;
    try {
      response = await openai.chat.completions.create({
        model,
        messages,
        tools,
      });
    } catch (err: unknown) {
      console.warn(
        `[Bot AI] Tentativa com tools falhou (${provider}/${model}):`,
        err instanceof Error ? err.message : err,
      );

      // Fallback 1: se for Gemini 2.0 e falhou, tenta direto sem tools ou com gemini-1.5-flash
      try {
        const fallbackModel = model === "gemini-2.0-flash" ? "gemini-1.5-flash" : model;
        console.log(`[Bot AI] Tentando fallback direto sem tools com modelo "${fallbackModel}"...`);
        response = await openai.chat.completions.create({
          model: fallbackModel,
          messages,
        });
      } catch (fallbackErr: unknown) {
        console.error(
          `[Bot AI] Erro definitivo ao chamar LLM (${provider}/${model}):`,
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
        );
        const failures = (consecutiveFailuresMap.get(conversationKey) ?? 0) + 1;
        consecutiveFailuresMap.set(conversationKey, failures);
        if (failures >= 3) {
          consecutiveFailuresMap.delete(conversationKey);
          return HANDOFF_SIGNAL;
        }
        return null;
      }
    }

    const assistantMessage = response.choices[0]?.message;
    if (!assistantMessage) return null;

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
        try {
          const args = JSON.parse(toolCall.function.arguments) as {
            itens: Array<{
              produtoId: string;
              nomeProduto: string;
              quantidade: number;
              precoUnitario: number;
            }>;
            metodoConsumo: "DELIVERY" | "TAKEAWAY" | "DINE_IN";
          };

          const sessionId = `wa-${customerPhone}`;

          const cart = await salvarCarrinhoAbandonado({
            sessionId,
            slug,
            customerName,
            customerPhone,
            consumptionMethod: args.metodoConsumo,
            products: args.itens.map((it) => ({
              id: it.produtoId,
              name: it.nomeProduto,
              quantity: it.quantidade,
              price: it.precoUnitario,
            })),
          });

          if (!cart) {
            toolResult = JSON.stringify({
              erro: "Não foi possível criar o carrinho. Tente novamente.",
            });
          } else {
            const vendasUrl =
              process.env.VENDAS_URL ||
              process.env.NEXT_PUBLIC_VENDAS_URL ||
              "https://fswdonalds.eeytech.com";
            const cartLink = `${vendasUrl.replace(/\/$/, "")}/${slug}/menu?cartId=${cart.id}`;
            toolResult = JSON.stringify({
              cartId: cart.id,
              cartLink,
              subtotal: cart.subtotal,
              total: cart.total,
              itemCount: cart.itemCount,
            });
          }
        } catch (jsonErr) {
          toolResult = JSON.stringify({ erro: "Formato de parâmetros inválido." });
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
