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

// Cache simples em memória para modelos descobertos dinamicamente na Groq
let cachedGroqModels: { models: string[]; timestamp: number } | null = null;
const GROQ_CACHE_TTL = 1000 * 60 * 30; // 30 minutos

// Modelos oficiais de produção ativos da Groq (atualizados para 2026)
const DEFAULT_GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

async function getAvailableGroqModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqModels && now - cachedGroqModels.timestamp < GROQ_CACHE_TTL) {
    return cachedGroqModels.models;
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 5000,
    });
    const res = await client.models.list();
    const available = res.data
      .map((m) => m.id)
      .filter((id) => {
        const lower = id.toLowerCase();
        return (
          !lower.includes("whisper") &&
          !lower.includes("bge") &&
          !lower.includes("guard") &&
          !lower.includes("safeguard") &&
          !lower.includes("orpheus") &&
          !lower.includes("tts") &&
          !lower.includes("clip") &&
          !lower.includes("vision")
        );
      });

    if (available.length > 0) {
      const preferred = [
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
      ];
      const sorted = [
        ...preferred.filter((p) => available.includes(p)),
        ...available.filter((a) => !preferred.includes(a)),
      ];
      console.log(`[Bot AI] Modelos ativos detectados na Groq: ${sorted.join(", ")}`);
      cachedGroqModels = { models: sorted, timestamp: now };
      return sorted;
    }
  } catch (err) {
    console.warn(
      "[Bot AI] Aviso ao listar modelos dinâmicos da Groq:",
      err instanceof Error ? err.message : err,
    );
  }

  return DEFAULT_GROQ_MODELS;
}

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

  // Configuração dinâmica do provedor com fallback de modelos e provedores
  const selectedProvider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();

  // Cache simples em memória para modelos descobertos dinamicamente na Groq
  interface ProviderConfig {
    name: string;
    apiKey: string;
    baseURL?: string;
    models: string[];
  }

  const getProviderConfig = async (p: string): Promise<ProviderConfig | null> => {
    if (p === "GOOGLE_GEMINI") {
      const key =
        aiSettings.geminiApiKey ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        "";
      if (!key) return null;
      return {
        name: "GOOGLE_GEMINI",
        apiKey: key,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro"],
      };
    }
    if (p === "GROQ") {
      const key = aiSettings.groqApiKey || process.env.GROQ_API_KEY || "";
      if (!key) return null;
      const models = await getAvailableGroqModels(key);
      return {
        name: "GROQ",
        apiKey: key,
        baseURL: "https://api.groq.com/openai/v1",
        models,
      };
    }
    if (p === "OPENAI") {
      const key = aiSettings.openaiApiKey || process.env.OPENAI_API_KEY || "";
      if (!key) return null;
      return {
        name: "OPENAI",
        apiKey: key,
        models: ["gpt-4o-mini", "gpt-4o"],
      };
    }
    return null;
  };

  // Monta lista de provedores ordenando o escolhido pelo usuário em primeiro lugar
  const providerList: ProviderConfig[] = [];
  const primaryProvider = await getProviderConfig(selectedProvider);
  if (primaryProvider) {
    providerList.push(primaryProvider);
  }

  // Adiciona outros provedores configurados como reserva
  for (const alt of ["GOOGLE_GEMINI", "GROQ", "OPENAI"]) {
    if (alt !== selectedProvider) {
      const altConfig = await getProviderConfig(alt);
      if (altConfig) providerList.push(altConfig);
    }
  }

  if (providerList.length === 0) {
    console.warn(
      `[Bot AI] Nenhuma chave de API configurada para o bot no restaurante "${slug}". Acesse a aba /ai e insira sua chave gratuita do Google Gemini, Groq ou OpenAI.`,
    );
    return null;
  }

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
    let response: OpenAI.Chat.ChatCompletion | null = null;

    // 1. Tenta com tools nos provedores e modelos em ordem de prioridade
    for (const prov of providerList) {
      const client = new OpenAI({ apiKey: prov.apiKey, baseURL: prov.baseURL });
      for (const m of prov.models) {
        try {
          response = await client.chat.completions.create({
            model: m,
            messages,
            tools,
          });
          // Prioriza este modelo nas iterações seguintes desta chamada
          prov.models = [m, ...prov.models.filter((item) => item !== m)];
          break;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[Bot AI] Tentativa com tools falhou (${prov.name}/${m}): ${errMsg}`);
        }
      }
      if (response) break;
    }

    // 2. Se falhar com tools, tenta sem tools como fallback conversacional
    if (!response) {
      console.log(`[Bot AI] Tentando fallback direto sem tools...`);
      for (const prov of providerList) {
        const client = new OpenAI({ apiKey: prov.apiKey, baseURL: prov.baseURL });
        for (const m of prov.models) {
          try {
            response = await client.chat.completions.create({
              model: m,
              messages,
            });
            break;
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.warn(`[Bot AI] Fallback sem tools falhou (${prov.name}/${m}): ${errMsg}`);
          }
        }
        if (response) break;
      }
    }

    if (!response) {
      console.error(`[Bot AI] Erro definitivo ao chamar LLM: nenhum modelo/provedor respondeu.`);
      const failures = (consecutiveFailuresMap.get(conversationKey) ?? 0) + 1;
      consecutiveFailuresMap.set(conversationKey, failures);
      if (failures >= 3) {
        consecutiveFailuresMap.delete(conversationKey);
        return HANDOFF_SIGNAL;
      }
      return null;
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
