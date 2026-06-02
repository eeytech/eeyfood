import {
  aiSettingsTable,
  buscarRestauranteComCardapioPorSlug,
  criarPedido,
  db,
  eq,
} from "@fsw/db";
import OpenAI from "openai";

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
  // 1. Buscar configurações de IA do restaurante
  const [aiSettings] = await db
    .select()
    .from(aiSettingsTable)
    .innerJoin(
      (await import("@fsw/db")).restaurantsTable,
      eq(
        aiSettingsTable.restaurantId,
        (await import("@fsw/db")).restaurantsTable.id,
      ),
    )
    .where(eq((await import("@fsw/db")).restaurantsTable.slug, slug))
    .limit(1);

  if (
    !aiSettings ||
    !aiSettings.AiSettings.isBotActive ||
    !aiSettings.AiSettings.openaiApiKey
  ) {
    return null;
  }

  const openai = new OpenAI({
    apiKey: aiSettings.AiSettings.openaiApiKey,
  });

  const textToProcess = messageText || "";

  if (!textToProcess) return null;

  // 3. Definir ferramentas para o OpenAI
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
        name: "criar_pedido",
        description: "Cria um novo pedido para o cliente.",
        parameters: {
          type: "object",
          properties: {
            itens: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  produtoId: { type: "string", description: "ID do produto" },
                  quantidade: { type: "number", description: "Quantidade" },
                },
                required: ["produtoId", "quantidade"],
              },
            },
            metodoConsumo: {
              type: "string",
              enum: ["DELIVERY", "TAKEAWAY", "DINE_IN"],
              description: "Método de consumo",
            },
            metodoPagamento: {
              type: "string",
              enum: ["DINHEIRO", "CARTAO_PRESENCIAL", "MERCADO_PAGO"],
              description: "Método de pagamento",
            },
          },
          required: ["itens", "metodoConsumo", "metodoPagamento"],
        },
      },
    },
  ];

  // 4. Interagir com OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          aiSettings.AiSettings.systemPrompt ||
          "Você é um atendente virtual de delivery.",
      },
      {
        role: "user",
        content: `Cliente: ${customerName} (${customerPhone})\nMensagem: ${textToProcess}`,
      },
    ],

    tools,
  });

  const message = response.choices[0].message;

  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.type === "function") {
        const functionName = toolCall.function.name;

        if (functionName === "listar_cardapio") {
          const cardapio = await buscarRestauranteComCardapioPorSlug(slug);
          // Enviar cardapio de volta para o LLM ou formatar resposta
          return `Aqui está nosso cardápio:\n${cardapio?.menuCategories
            .map(
              (c) =>
                `*${c.name}*\n${c.products
                  .map((p) => `- ${p.name} (ID: ${p.id}): R$ ${p.price}`)
                  .join("\n")}`,
            )
            .join("\n\n")}`;
        }

        if (functionName === "criar_pedido") {
          const args = JSON.parse(toolCall.function.arguments) as {
            itens: Array<{ produtoId: string; quantity: number }>;
            metodoConsumo: "DELIVERY" | "TAKEAWAY" | "DINE_IN";
            metodoPagamento: "DINHEIRO" | "CARTAO_PRESENCIAL" | "MERCADO_PAGO";
          };

          const order = await criarPedido({
            customerName,
            customerPhone,
            slug,
            consumptionMethod: args.metodoConsumo,
            paymentMethod: args.metodoPagamento,
            products: args.itens.map((i) => ({
              id: i.produtoId,
              quantity: i.quantity,
            })),
          });

          return `Pedido #${order.id} criado com sucesso! Em breve você receberá atualizações.`;
        }
      }
    }
  }

  return message.content;
};
