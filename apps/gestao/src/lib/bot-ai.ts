import {
  aiSettingsTable,
  and,
  asc,
  buscarRestauranteComCardapioPorSlug,
  buscarRestaurantePorSlug,
  db,
  DEFAULT_AI_SYSTEM_PROMPT,
  eq,
  isClientePausado,
  isNotNull,
  productOptionGroupsTable,
  productOptionsTable,
  productToOptionGroupsTable,
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

export const detectaHandoff = (text: string): boolean => {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return HANDOFF_KEYWORDS.some((kw) =>
    lower.includes(kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
  );
};

export const HANDOFF_SIGNAL = "__HANDOFF_REQUIRED__";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

// Histórico de conversas em memória RAM do servidor para manter contexto e memória do diálogo
const conversationCache = new Map<string, ChatMessage[]>();
const MAX_CONVERSATION_TURNS = 14;
const CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas de inatividade

export function getConversationHistory(sessionKey: string): ChatMessage[] {
  const history = conversationCache.get(sessionKey);
  if (!history || history.length === 0) return [];
  const lastMsg = history[history.length - 1];
  if (Date.now() - lastMsg.timestamp > CONVERSATION_TTL_MS) {
    conversationCache.delete(sessionKey);
    return [];
  }
  return history;
}

export function appendToConversationHistory(
  sessionKey: string,
  role: "user" | "model",
  text: string,
) {
  let history = conversationCache.get(sessionKey) || [];
  if (
    history.length > 0 &&
    Date.now() - history[history.length - 1].timestamp > CONVERSATION_TTL_MS
  ) {
    history = [];
  }
  history.push({ role, text, timestamp: Date.now() });
  if (history.length > MAX_CONVERSATION_TURNS) {
    history = history.slice(-MAX_CONVERSATION_TURNS);
  }
  conversationCache.set(sessionKey, history);
}

export function clearConversationHistory(sessionKey: string) {
  conversationCache.delete(sessionKey);
}

export interface ProductOptionItem {
  name: string;
  price: number;
}

export interface ProductOptionGroupData {
  name: string;
  minOptions: number;
  maxOptions: number;
  options: ProductOptionItem[];
}

/**
 * Carrega todos os grupos de adicionais e opções vinculados aos produtos do restaurante
 * Retorna um mapa indexado por productId -> Map<groupId, GroupData>
 */
async function carregarOpcionaisDoCardapio(restaurantId: string): Promise<Map<string, Map<string, ProductOptionGroupData>>> {
  try {
    // 1. Grupos vinculados via tabela associativa ProductToOptionGroup
    const linkedRows = await db
      .select({
        productId: productToOptionGroupsTable.productId,
        groupId: productOptionGroupsTable.id,
        groupName: productOptionGroupsTable.name,
        minOptions: productOptionGroupsTable.minOptions,
        maxOptions: productOptionGroupsTable.maxOptions,
        optionId: productOptionsTable.id,
        optionName: productOptionsTable.name,
        optionPrice: productOptionsTable.price,
      })
      .from(productToOptionGroupsTable)
      .innerJoin(
        productOptionGroupsTable,
        eq(productOptionGroupsTable.id, productToOptionGroupsTable.productOptionGroupId),
      )
      .leftJoin(
        productOptionsTable,
        eq(productOptionsTable.productOptionGroupId, productOptionGroupsTable.id),
      )
      .where(eq(productOptionGroupsTable.restaurantId, restaurantId))
      .orderBy(
        asc(productOptionGroupsTable.displayOrder),
        asc(productOptionsTable.displayOrder),
      );

    // 2. Grupos vinculados diretamente via productOptionGroupsTable.productId
    const directRows = await db
      .select({
        productId: productOptionGroupsTable.productId,
        groupId: productOptionGroupsTable.id,
        groupName: productOptionGroupsTable.name,
        minOptions: productOptionGroupsTable.minOptions,
        maxOptions: productOptionGroupsTable.maxOptions,
        optionId: productOptionsTable.id,
        optionName: productOptionsTable.name,
        optionPrice: productOptionsTable.price,
      })
      .from(productOptionGroupsTable)
      .leftJoin(
        productOptionsTable,
        eq(productOptionsTable.productOptionGroupId, productOptionGroupsTable.id),
      )
      .where(
        and(
          eq(productOptionGroupsTable.restaurantId, restaurantId),
          isNotNull(productOptionGroupsTable.productId),
        ),
      )
      .orderBy(
        asc(productOptionGroupsTable.displayOrder),
        asc(productOptionsTable.displayOrder),
      );

    const allRows = [...linkedRows, ...directRows];

    const productOptionsMap = new Map<
      string,
      Map<
        string,
        {
          name: string;
          minOptions: number;
          maxOptions: number;
          options: Array<{ name: string; price: number }>;
        }
      >
    >();

    for (const r of allRows) {
      if (!r.productId) continue;
      let groupsMap = productOptionsMap.get(r.productId);
      if (!groupsMap) {
        groupsMap = new Map();
        productOptionsMap.set(r.productId, groupsMap);
      }

      let group = groupsMap.get(r.groupId);
      if (!group) {
        group = {
          name: r.groupName,
          minOptions: r.minOptions ?? 0,
          maxOptions: r.maxOptions ?? 1,
          options: [],
        };
        groupsMap.set(r.groupId, group);
      }

      if (r.optionId && r.optionName) {
        if (!group.options.some((o) => o.name === r.optionName)) {
          group.options.push({
            name: r.optionName,
            price: Number(r.optionPrice || 0),
          });
        }
      }
    }

    return productOptionsMap;
  } catch (err) {
    console.warn("[Bot AI] Aviso ao carregar opções e adicionais do cardápio:", err);
    return new Map();
  }
}

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
        .map((m) => m.name.replace(/^models\//, ""))
        .filter((name) => {
          const lower = name.toLowerCase();
          // Excluir modelos específicos de áudio/imagem/tts e versões descontinuadas
          if (
            lower.includes("tts") ||
            lower.includes("image") ||
            lower.includes("audio") ||
            lower.includes("embed") ||
            lower.includes("imagen") ||
            lower.includes("robotics")
          ) {
            return false;
          }
          // O Google descontinuou gemini-2.5-flash para novos usuários
          if (lower.startsWith("gemini-2.5-flash")) {
            return false;
          }
          return true;
        });

      if (available.length > 0) {
        const priorityPatterns = [
          /^gemini-3\.8-flash/i,
          /^gemini-3\.5-flash/i,
          /^gemini-3.*-flash/i,
          /^gemini-2\.0-flash/i,
          /^gemini-1\.5-flash/i,
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
        console.log(`[Bot AI] Modelos Gemini de texto disponíveis (${sorted.length}):`, sorted);
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
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
  ];
}

function buildGeminiContents(history: ChatMessage[], currentUserContent: string) {
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const item of history) {
    if (!item.text?.trim()) continue;
    // O Gemini exige alternância estrita: user -> model -> user -> model
    if (contents.length > 0 && contents[contents.length - 1].role === item.role) {
      contents[contents.length - 1].parts[0].text += `\n${item.text}`;
    } else {
      contents.push({
        role: item.role,
        parts: [{ text: item.text }],
      });
    }
  }

  // O Gemini EXIGE que o primeiro turno seja do papel "user"
  while (contents.length > 0 && contents[0].role === "model") {
    contents.shift();
  }

  // A última mensagem deve ser a do usuário atual
  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts[0].text += `\n${currentUserContent}`;
  } else {
    contents.push({
      role: "user",
      parts: [{ text: currentUserContent }],
    });
  }

  return contents;
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
  history: ChatMessage[] = [],
): Promise<string | null> {
  const cleaned = cleanKey(geminiKey);
  if (!cleaned) {
    console.warn("[Bot AI] callGeminiNative: Chave do Gemini vazia!");
    return null;
  }

  const candidateModels = await getAvailableGeminiModels(cleaned);
  const userContent = `Cliente: ${customerName} (${customerPhone})\nMensagem: ${userMessage}`;
  const contentsWithHistory = buildGeminiContents(history, userContent);

  for (const m of candidateModels.slice(0, 6)) {
    // 1. Tenta v1beta com system_instruction e histórico completo
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
            contents: contentsWithHistory,
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

    // 2. Fallback v1beta SEM system_instruction (prompt unificado no primeiro conteúdo do usuário)
    try {
      const fallbackContents = JSON.parse(JSON.stringify(contentsWithHistory));
      if (fallbackContents.length > 0 && fallbackContents[0].role === "user") {
        fallbackContents[0].parts[0].text = `${sysPrompt}\n\n---\n\n${fallbackContents[0].parts[0].text}`;
      }

      const resContents = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(cleaned)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: fallbackContents,
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
  history: ChatMessage[] = [],
): Promise<string | null> {
  const cleaned = cleanKey(openaiKey);
  if (!cleaned) return null;

  const models = ["gpt-4o-mini", "gpt-4o"];
  const client = new OpenAI({ apiKey: cleaned, timeout: 12000 });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: sysPrompt },
    ...history.map((h) => ({
      role: (h.role === "model" ? "assistant" : "user") as "assistant" | "user",
      content: h.text,
    })),
    {
      role: "user",
      content: `Cliente: ${customerName} (${customerPhone})\nMensagem: ${userMessage}`,
    },
  ];

  for (const m of models) {
    try {
      const res = await client.chat.completions.create({
        model: m,
        messages,
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
  const sessionKey = `${restaurant.id}:${customerPhone}`;

  if (detectaHandoff(textToProcess)) {
    console.log(`[Bot AI] Cliente ${customerPhone} solicitou atendimento humano.`);
    clearConversationHistory(sessionKey);
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
    const optionsMap = await carregarOpcionaisDoCardapio(restaurant.id);

    menuContext +=
      "Categorias, Produtos e Opções disponíveis no restaurante:\n" +
      cardapio.menuCategories
        .map((c) => {
          const prods = c.products
            .map((p) => {
              let prodText = `  • ${p.name} - R$ ${Number(p.price).toFixed(2)}${p.description ? ` (${p.description})` : ""}`;
              const productGroups = optionsMap.get(p.id);
              if (productGroups && productGroups.size > 0) {
                const groupLines: string[] = [];
                for (const g of productGroups.values()) {
                  if (g.options.length === 0) continue;
                  const optsList = g.options
                    .map((opt: ProductOptionItem) =>
                      opt.price > 0
                        ? `${opt.name} (+R$ ${opt.price.toFixed(2).replace(".", ",")})`
                        : opt.name,
                    )
                    .join(", ");

                  const isRequired = g.minOptions > 0;
                  let ruleText = "";
                  if (isRequired) {
                    if (g.minOptions === g.maxOptions) {
                      ruleText = `OBRIGATÓRIO escolher exatamente ${g.minOptions}`;
                    } else {
                      ruleText = `OBRIGATÓRIO escolher de ${g.minOptions} a ${g.maxOptions}`;
                    }
                  } else {
                    ruleText = `Opcional (pode escolher até ${g.maxOptions})`;
                  }

                  groupLines.push(
                    `    └─ ${isRequired ? "ESCOLHA OBRIGATÓRIA" : "ADICIONAIS/OPCIONAIS"}: [${g.name}] (${ruleText}): ${optsList}`,
                  );
                }
                if (groupLines.length > 0) {
                  prodText += "\n" + groupLines.join("\n");
                }
              }
              return prodText;
            })
            .join("\n\n");
          return `*${c.name}*:\n${prods}`;
        })
        .join("\n\n");
  }

  const baseSystemPrompt = aiSettings.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT;
  const fullSystemPrompt = `${baseSystemPrompt}\n${menuContext}

### REGRAS CRÍTICAS E OBRIGATÓRIAS DE FLUXO NO WHATSAPP:
1. ESCOLHA DE SABORES, PONTO DA CARNE E OPÇÕES DO ITEM (REGRA FUNDAMENTAL):
   - SEMPRE que o cliente escolher um item que tem "ESCOLHA OBRIGATÓRIA" (como sabores de sorvete, ponto da carne de hambúrguer, opções de lanches, etc.):
     • Você DEVE perguntar quais opções ele deseja ANTES de perguntar sobre bebidas ou entrega!
     • Apresente com clareza as opções disponíveis e quantas ele pode escolher.
     • Exemplo (Sorvete): "Perfeito, [Nome]! Para o Pote de Sorvete Família você pode escolher de 1 a 3 sabores. Temos Baunilha, Chocolate Belga, Morango e Flocos. Quais você gostaria?"
     • Exemplo (Hambúrguer): "Excelente escolha! Como você prefere o ponto da carne do seu Duplo Costela? Temos Ao ponto, Bem passado ou Mal passado."
   - JAMAIS pule essa etapa, JAMAIS adivinhe os sabores/ponto e JAMAIS avance para a entrega ou bebida sem antes definir as opções obrigatórias do item.

2. FAÇA APENAS UMA PERGUNTA POR VEZ (PROIBIDO JUNTAR PERGUNTAS):
   - É terminantemente PROIBIDO fazer duas perguntas diferentes na mesma mensagem (exemplo do que é PROIBIDO: "Qual o sabor do sorvete? E vai ser entrega ou retirada?").
   - O atendimento DEVE ser em etapas graduais:
     • Etapa 1 (Opções do Item): Se o item tem escolhas obrigatórias (sabores, ponto da carne), pergunte APENAS as opções do item. PARE AÍ e aguarde a resposta do cliente.
     • Etapa 2 (Bebida/Acompanhamento): Somente após definir as opções do prato/lanche, pergunte APENAS se deseja adicionar alguma bebida, sobremesa ou acompanhamento. PARE AÍ e aguarde.
     • Etapa 3 (Método de Consumo): Somente APÓS o cliente responder sobre as bebidas/acompanhamentos, pergunte se o pedido será para ENTREGA (Delivery) ou RETIRADA no balcão. PARE AÍ e aguarde.

3. RESPOSTAS EM ETAPAS E MÚLTIPLAS MENSAGENS:
   - Clientes de WhatsApp frequentemente mandam respostas em mensagens separadas (ex.: mandou "quero baunilha e chocolate" e logo em seguida "e quero uma coca").
   - Você DEVE consultar todo o histórico anterior da conversa.
   - JAMAIS esqueça os lanches, bebidas, sabores ou preferências já informadas nas mensagens anteriores.
   - NUNCA se perca e NUNCA repita perguntas sobre itens ou métodos que o cliente já acabou de responder.
   - Se o cliente já informou tudo (itens com opções, bebidas e forma de consumo), junte tudo: confirme o pedido completo detalhando os sabores/opções e envie o link para finalizar!

4. FORMATO:
   - Mensagens curtas, calorosas e diretas para WhatsApp (máximo de 2 a 3 frases por mensagem). Não invente ferramentas nem código.`;

  // 3. Chaves de API configuradas
  const geminiKey = cleanKey(
    aiSettings.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  );
  const openaiKey = cleanKey(aiSettings.openaiApiKey || process.env.OPENAI_API_KEY);

  const rawProvider = (aiSettings.aiProvider || "GOOGLE_GEMINI").toUpperCase();
  const selectedProvider = rawProvider === "OPENAI" ? "OPENAI" : "GOOGLE_GEMINI";

  const history = getConversationHistory(sessionKey);

  console.log(
    `[Bot AI] Atendendo ${customerPhone} no restaurante "${restaurant.name}" (${slug}). Provedor: ${selectedProvider}. Histórico: ${history.length} msgs. Tem GeminiKey: ${!!geminiKey} (${geminiKey ? geminiKey.slice(0, 6) + "..." : "NÃO CONFIGURADA"}), Tem OpenAIKey: ${!!openaiKey}`,
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
        history,
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
        history,
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
        history,
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
        history,
      );
    }
  }

  // 5. Se o modelo respondeu com sucesso, salva na memória e retorna
  if (botReply) {
    appendToConversationHistory(sessionKey, "user", textToProcess);
    appendToConversationHistory(sessionKey, "model", botReply);
    return botReply;
  }

  // 6. Resposta graciosa de segurança caso a API da IA esteja temporariamente fora do ar
  // Garante que o cliente NUNCA fique sem resposta e sempre receba o link oficial do cardápio!
  console.warn(
    `[Bot AI] Nenhuma LLM respondeu. Enviando mensagem de boas-vindas com cardápio para ${customerPhone}.`,
  );
  return `Olá, ${customerName ? customerName : "tudo bem"}! Seja muito bem-vindo ao *${restaurant.name}*! 😊\n\nAcesse nosso cardápio completo online para conferir as opções, valores e fazer seu pedido com facilidade:\n👉 ${menuUrl}\n\nSe precisar de mais alguma informação, estou à disposição!`;
};
