import {
  aiSettingsTable,
  and,
  asc,
  buscarRestauranteComCardapioPorSlug,
  buscarRestaurantePorSlug,
  criarPedido,
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
import { notificarNovoPedido } from "./notificar-novo-pedido";

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
const MAX_CONVERSATION_TURNS = 50;
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
  id: string;
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
      Map<string, ProductOptionGroupData>
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
        if (!group.options.some((o) => o.id === r.optionId || o.name === r.optionName)) {
          group.options.push({
            id: r.optionId,
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

interface FecharPedidoChatInput {
  rawJson: string;
  restaurant: any;
  cardapio: any;
  optionsMap: Map<string, Map<string, ProductOptionGroupData>>;
  customerPhone: string;
  customerName: string;
  menuUrl: string;
  history?: ChatMessage[];
}

const normText = (s?: string | null) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * Utilitário resiliente para extrair e reparar JSON caso a IA tenha truncado a resposta
 * ou fechamento de chaves/aspas esteja incompleto.
 */
function tryRepairJson(jsonStr: string): any {
  let str = (jsonStr || "").trim();
  // Remove eventuais blocos de código markdown
  str = str.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Encontra o primeiro '{'
  const firstBrace = str.indexOf("{");
  if (firstBrace !== -1) {
    str = str.slice(firstBrace);
  }

  // Se houver texto após o último '}', tenta parsear o conteúdo delimitado
  const lastBrace = str.lastIndexOf("}");
  if (lastBrace !== -1 && lastBrace > 0) {
    try {
      return JSON.parse(str.slice(0, lastBrace + 1));
    } catch {
      // Continua para o reparo
    }
  }

  // Tentativa direta
  try {
    return JSON.parse(str);
  } catch {
    // Reparo de JSON truncado com aspas ou chaves abertas
    try {
      let inString = false;
      let escaped = false;
      const stack: string[] = [];

      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === "{" || char === "[") {
            stack.push(char);
          } else if (char === "}") {
            if (stack.length && stack[stack.length - 1] === "{") stack.pop();
          } else if (char === "]") {
            if (stack.length && stack[stack.length - 1] === "[") stack.pop();
          }
        }
      }

      let repaired = str;
      if (inString) repaired += '"';
      while (stack.length > 0) {
        const open = stack.pop();
        repaired += open === "{" ? "}" : "]";
      }

      return JSON.parse(repaired);
    } catch (parseErr) {
      throw new Error(
        `JSON do pedido não pôde ser interpretado: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      );
    }
  }
}

/**
 * Processa o JSON estruturado gerado pela IA no chat e realiza a criação do pedido oficial
 * no banco de dados e notificação em tempo real para a cozinha (KDS, áudio e impressora térmica).
 */
async function processarFechamentoPedidoNoChat({
  rawJson,
  restaurant,
  cardapio,
  optionsMap,
  customerPhone,
  customerName,
  menuUrl,
  history,
}: FecharPedidoChatInput): Promise<string> {
  try {
    const payload = tryRepairJson(rawJson);
    const rawProducts: Array<{
      id?: string;
      name?: string;
      quantity?: number | string;
      selectedOptions?: string[];
      notes?: string;
    }> = Array.isArray(payload.products) ? payload.products : [];

    const allDbProducts =
      cardapio?.menuCategories?.flatMap((c: any) => c.products) || [];

    const finalProducts: Array<{
      id: string;
      name: string;
      quantity: number;
      selectedOptions?: string[];
      notes?: string;
    }> = [];

    for (const item of rawProducts) {
      const rawId = String(item.id || "").trim();
      const rawName = String(item.name || "").trim();

      // 1. Localiza o produto no cardápio
      let matchedProduct = allDbProducts.find((p: any) => p.id === rawId);
      if (!matchedProduct && rawName) {
        const normN = normText(rawName);
        matchedProduct = allDbProducts.find((p: any) => normText(p.name) === normN);
      }
      if (!matchedProduct && rawName) {
        const normN = normText(rawName);
        matchedProduct = allDbProducts.find(
          (p: any) => normText(p.name).includes(normN) || normN.includes(normText(p.name)),
        );
      }
      if (!matchedProduct && rawId) {
        const normI = normText(rawId);
        matchedProduct = allDbProducts.find(
          (p: any) => normText(p.name).includes(normI) || normI.includes(normText(p.name)),
        );
      }

      if (!matchedProduct) {
        console.warn(`[Bot AI Fechamento] Produto não identificado no cardápio: ID="${rawId}", Nome="${rawName}"`);
        continue;
      }

      // 2. Mapeia opções e adicionais
      const productDbOptions: ProductOptionItem[] = [];
      const productGroups = optionsMap.get(matchedProduct.id);
      if (productGroups) {
        for (const g of productGroups.values()) {
          productDbOptions.push(...g.options);
        }
      }

      const resolvedOptions: string[] = [];
      const unmappedOptionNotes: string[] = [];

      if (Array.isArray(item.selectedOptions)) {
        for (const optRaw of item.selectedOptions) {
          if (!optRaw) continue;
          const optStr = String(optRaw).trim();
          let matchedOpt = productDbOptions.find((o) => o.id === optStr);
          if (!matchedOpt) {
            const normOpt = normText(optStr);
            matchedOpt = productDbOptions.find(
              (o) =>
                normText(o.name) === normOpt ||
                normText(o.name).includes(normOpt) ||
                normOpt.includes(normText(o.name)),
            );
          }

          if (matchedOpt) {
            if (!resolvedOptions.includes(matchedOpt.id)) {
              resolvedOptions.push(matchedOpt.id);
            }
          } else {
            unmappedOptionNotes.push(optStr);
          }
        }
      }

      const combinedNotes = [
        item.notes?.trim(),
        unmappedOptionNotes.length > 0 ? `Opções: ${unmappedOptionNotes.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      finalProducts.push({
        id: matchedProduct.id,
        name: matchedProduct.name,
        quantity: Math.max(1, Number(item.quantity) || 1),
        selectedOptions: resolvedOptions.length > 0 ? resolvedOptions : undefined,
        notes: combinedNotes || undefined,
      });
    }

    // Se a IA não listou produtos válidos no JSON (ou truncou), tenta resgatar do resumo do histórico
    if (finalProducts.length === 0 && Array.isArray(history) && history.length > 0) {
      console.log(
        `[Bot AI Fechamento] finalProducts vazio no JSON. Tentando recuperar produtos a partir do histórico para ${customerPhone}...`,
      );
      const lastModelMsgs = history.filter((h) => h.role === "model").slice(-3);
      for (const m of lastModelMsgs) {
        const normMsg = normText(m.text);
        for (const p of allDbProducts) {
          if (normMsg.includes(normText(p.name))) {
            if (!finalProducts.some((fp) => fp.id === p.id)) {
              finalProducts.push({
                id: p.id,
                name: p.name,
                quantity: 1,
                notes: "Confirmado pelo cliente no resumo do chat",
              });
            }
          }
        }
      }
    }

    if (finalProducts.length === 0) {
      throw new Error("Não conseguimos identificar os itens do seu pedido no cardápio.");
    }

    // 3. Método de consumo
    let consumptionMethod: "DELIVERY" | "TAKEAWAY" = "TAKEAWAY";
    const rawCm = String(payload.consumptionMethod || "").toUpperCase();
    if (rawCm === "DELIVERY" || rawCm.includes("ENTREGA")) {
      consumptionMethod = "DELIVERY";
    } else if (Array.isArray(history)) {
      const histText = normText(history.map((h) => h.text).join(" "));
      if (histText.includes("entrega") || histText.includes("delivery")) {
        consumptionMethod = "DELIVERY";
      }
    }

    // 4. Método de pagamento
    let paymentMethod: "PIX" | "DINHEIRO" | "CARTAO_PRESENCIAL" = "CARTAO_PRESENCIAL";
    const rawPm = String(payload.paymentMethod || "").toUpperCase();
    if (rawPm.includes("PIX")) {
      paymentMethod = "PIX";
    } else if (rawPm.includes("DINHEIRO")) {
      paymentMethod = "DINHEIRO";
    } else {
      paymentMethod = "CARTAO_PRESENCIAL";
    }

    const changeFor =
      paymentMethod === "DINHEIRO" && payload.changeFor
        ? Number(payload.changeFor)
        : undefined;

    let deliveryAddress =
      consumptionMethod === "DELIVERY"
        ? String(payload.deliveryAddress || "").trim() || undefined
        : undefined;

    let deliveryNeighborhood =
      consumptionMethod === "DELIVERY"
        ? String(payload.deliveryNeighborhood || "").trim() || undefined
        : undefined;

    // Se for entrega e o endereço não veio no JSON, resgata da mensagem do cliente no histórico
    if (consumptionMethod === "DELIVERY" && !deliveryAddress && Array.isArray(history)) {
      const userMsgs = history.filter((h) => h.role === "user");
      for (let i = userMsgs.length - 1; i >= 0; i--) {
        const msg = userMsgs[i].text.trim();
        const norm = normText(msg);
        if (
          norm.includes("rua") ||
          norm.includes("avenida") ||
          norm.includes("av.") ||
          norm.includes("bairro") ||
          /\d{2,}/.test(norm)
        ) {
          deliveryAddress = msg;
          break;
        }
      }
    }

    // 5. Criação do Pedido no Banco de Dados
    console.log(
      `[Bot AI Fechamento] Criando pedido no banco para ${customerPhone} no restaurante "${restaurant.slug}"...`,
    );

    const order = await criarPedido({
      slug: restaurant.slug,
      customerName: customerName?.trim() || "Cliente WhatsApp",
      customerPhone: customerPhone.replace(/\D/g, ""),
      consumptionMethod,
      paymentMethod,
      changeFor,
      deliveryAddress,
      deliveryNeighborhood,
      notes: payload.notes?.trim() || undefined,
      products: finalProducts,
    });

    console.log(
      `[Bot AI Fechamento] Pedido #${order.id} CRIADO com sucesso! Total: R$ ${order.total}. Disparando alerta em tempo real para a cozinha...`,
    );

    // 6. Transmissão imediata via WebSocket (KDS, Som, Impressora Térmica)
    await notificarNovoPedido({
      orderId: order.id,
      restaurantSlug: restaurant.slug,
    });

    // 7. Montagem da Mensagem de Confirmação para o WhatsApp
    const itensLines = finalProducts
      .map((p) => {
        let l = `• *${p.quantity}x ${p.name}*`;
        if (p.notes) l += ` _(${p.notes})_`;
        return l;
      })
      .join("\n");

    const formaPgtoDesc =
      paymentMethod === "PIX"
        ? "PIX"
        : paymentMethod === "DINHEIRO"
          ? changeFor
            ? `Dinheiro (Troco para R$ ${changeFor.toFixed(2).replace(".", ",")})`
            : "Dinheiro"
          : "Cartão (na entrega/maquininha)";

    let pixInfo = "";
    if (paymentMethod === "PIX") {
      if (restaurant.pixKey?.trim()) {
        pixInfo = `\n🔑 *Chave PIX para pagamento:*\n\`${restaurant.pixKey.trim()}\`\n_(Por favor, envie o comprovante por aqui assim que efetuar o pagamento!)_\n`;
      } else {
        pixInfo = `\n🔑 *Pagamento via PIX:*\nNossa equipe já está providenciando os dados do PIX e enviará em instantes por aqui!\n`;
      }
    }

    const enderecoDesc =
      consumptionMethod === "DELIVERY"
        ? `🛵 *Entrega em:* ${deliveryAddress || "Endereço informado"}`
        : "🛍️ *Método:* Retirada no balcão";

    return (
      `🎉 *PEDIDO CONFIRMADO COM SUCESSO!* 🎉\n\n` +
      `O seu pedido *#${order.id}* já foi enviado diretamente para a nossa cozinha e a equipe já iniciou o preparo! 🧑‍🍳🔥\n\n` +
      `📋 *Itens do Pedido:*\n${itensLines}\n\n` +
      `💰 *Total:* R$ ${Number(order.total).toFixed(2).replace(".", ",")}\n` +
      `${enderecoDesc}\n` +
      `💳 *Pagamento:* ${formaPgtoDesc}\n` +
      `⏱️ *Tempo estimado:* ${restaurant.estimatedDeliveryTime || "30 a 50 minutos"}\n` +
      pixInfo +
      `\nQualquer dúvida estamos à disposição por aqui. Muito obrigado pela preferência e bom apetite! 😊✨`
    );
  } catch (err: any) {
    console.error("[Bot AI Fechamento] Erro ao fechar pedido pelo chat:", err);
    const msg = err?.message || "";
    if (msg.includes("pedido mínimo")) {
      return `Ops, ${customerName}! ${msg} Gostaria de adicionar mais algum item ou bebida para completarmos o valor mínimo de entrega? 😊`;
    }
    return `Anotei todos os seus itens com muito cuidado! Para garantir que seu pedido seja processado perfeitamente com todas as opções, você também pode confirmar com 1 clique pelo nosso link oficial:\n👉 ${menuUrl}\n\nSe preferir, me avise que posso chamar um atendente humano para te auxiliar!`;
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
          /^gemini-2\.0-flash/i,
          /^gemini-1\.5-flash/i,
          /^gemini-1\.5-pro/i,
          /^gemini-2/i,
          /^gemini-1/i,
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

const GEMINI_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

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
              maxOutputTokens: 2500,
            },
            safetySettings: GEMINI_SAFETY_SETTINGS,
          }),
          signal: AbortSignal.timeout(25000),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const finishReason = candidate?.finishReason;
        if (finishReason && finishReason !== "STOP") {
          console.log(`[Bot AI] Gemini (${m}) finishReason: ${finishReason}`);
        }
        const parts = candidate?.content?.parts;
        const text = Array.isArray(parts)
          ? parts.map((p: any) => p.text || "").join("").trim()
          : candidate?.content?.parts?.[0]?.text?.trim();

        if (text) {
          console.log(`[Bot AI] Gemini v1beta (${m}) respondeu com sucesso! (${text.length} chars)`);
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
              maxOutputTokens: 2500,
            },
            safetySettings: GEMINI_SAFETY_SETTINGS,
          }),
          signal: AbortSignal.timeout(25000),
        },
      );

      if (resContents.ok) {
        const data = await resContents.json();
        const candidate = data?.candidates?.[0];
        const parts = candidate?.content?.parts;
        const text = Array.isArray(parts)
          ? parts.map((p: any) => p.text || "").join("").trim()
          : candidate?.content?.parts?.[0]?.text?.trim();

        if (text) {
          console.log(`[Bot AI] Gemini v1beta (${m}) modo contents respondeu com sucesso! (${text.length} chars)`);
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

  let optionsMap = new Map<string, Map<string, ProductOptionGroupData>>();
  if (cardapio?.menuCategories?.length) {
    optionsMap = await carregarOpcionaisDoCardapio(restaurant.id);

    menuContext +=
      "Categorias, Produtos e Opções disponíveis no restaurante:\n" +
      cardapio.menuCategories
        .map((c) => {
          const prods = c.products
            .map((p) => {
              let prodText = `  • ${p.name} [ID: ${p.id}] - R$ ${Number(p.price).toFixed(2)}${p.description ? ` (${p.description})` : ""}`;
              const productGroups = optionsMap.get(p.id);
              if (productGroups && productGroups.size > 0) {
                const groupLines: string[] = [];
                for (const g of productGroups.values()) {
                  if (g.options.length === 0) continue;
                  const optsList = g.options
                    .map((opt: ProductOptionItem) =>
                      opt.price > 0
                        ? `${opt.name} [ID: ${opt.id}] (+R$ ${opt.price.toFixed(2).replace(".", ",")})`
                        : `${opt.name} [ID: ${opt.id}]`,
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

### REGRAS CRÍTICAS E OBRIGATÓRIAS DE FLUXO NO WHATSAPP (FECHAMENTO 100% NO CHAT):
REGRA DE OURO: FAÇA APENAS UMA PERGUNTA POR VEZ. É TERMINANTEMENTE PROIBIDO JUNTAR DUAS PERGUNTAS NA MESMA MENSAGEM.

1. FLUXO PASSO A PASSO PARA ANOTAR E FECHAR O PEDIDO:
   • Etapa 1 (Opções e Sabores Obrigatórios do Item):
     SEMPRE que o cliente escolher um item que tem "ESCOLHA OBRIGATÓRIA" (como sabores de sorvete, ponto da carne de hambúrguer, opções de lanches, etc.):
     Você DEVE perguntar quais opções ele deseja ANTES de perguntar sobre bebidas ou entrega!
     Apresente com clareza as opções disponíveis e quantas ele pode escolher.
     Exemplo (Sorvete): "Perfeito, [Nome]! Para o Pote de Sorvete Família você pode escolher de 1 a 3 sabores. Temos Baunilha, Chocolate Belga, Morango e Flocos. Quais você gostaria?"
     Exemplo (Hambúrguer): "Excelente escolha! Como você prefere o ponto da carne do seu Duplo Costela? Temos Ao ponto, Bem passado ou Mal passado."
     JAMAIS pule essa etapa, JAMAIS adivinhe os sabores/ponto e JAMAIS avance para a entrega ou bebida sem antes definir as opções obrigatórias do item. PARE AÍ e aguarde a resposta do cliente.

   • Etapa 2 (Bebida / Acompanhamento - Upsell):
     Somente após definir as opções do prato/lanche principal, pergunte APENAS se deseja adicionar alguma bebida geladinha, sobremesa ou acompanhamento. PARE AÍ e aguarde a resposta do cliente.

   • Etapa 3 (Método de Consumo):
     Somente APÓS o cliente responder sobre as bebidas/acompanhamentos, pergunte se o pedido será para ENTREGA (Delivery) ou RETIRADA no balcão. PARE AÍ e aguarde.

   • Etapa 4 (Endereço Completo se Entrega):
     Se o cliente escolher ENTREGA, pergunte o endereço completo para envio (Rua, Número, Bairro e Complemento ou Ponto de Referência). PARE AÍ e aguarde.
     Se o cliente escolheu RETIRADA, pule direto para a Etapa 5.

   • Etapa 5 (Forma de Pagamento):
     Pergunte qual será a forma de pagamento: PIX, Cartão (débito ou crédito na maquininha na entrega/retirada) ou Dinheiro.
     Se o cliente disser que vai pagar em Dinheiro, pergunte se precisa de troco para quanto. PARE AÍ e aguarde.

   • Etapa 6 (Resumo e Pergunta Decisiva de Confirmação):
     Apresente o resumo claro e organizado de todo o pedido:
     - Itens com quantidades, valores e sabores/opções escolhidos
     - Subtotal/Total estimado
     - Método (Entrega com o endereço informado OU Retirada no balcão)
     - Forma de pagamento escolhida
     E faça expressamente a pergunta decisiva:
     "Posso confirmar o seu pedido e enviar agora mesmo para a produção na cozinha?"
     PARE AÍ e aguarde a confirmação do cliente.

2. DISPARO DO PEDIDO NA COZINHA (QUANDO O CLIENTE CONFIRMAR):
   - Assim que o cliente responder confirmando (ex: "Sim", "Pode confirmar", "Pode mandar", "Sim por favor", "Confirmo", "Manda ver", etc.):
     Você DEVE gerar na sua resposta o bloco [CRIAR_PEDIDO_JSON] com os dados estruturados do pedido no seguinte formato exato:
     [CRIAR_PEDIDO_JSON]
     {
       "consumptionMethod": "DELIVERY",
       "paymentMethod": "PIX",
       "changeFor": null,
       "deliveryAddress": "Rua das Flores, 123 - Centro",
       "deliveryNeighborhood": "Centro",
       "notes": "Observações gerais se houver",
       "products": [
         {
           "id": "ID_DO_PRODUTO",
           "name": "Nome do Produto",
           "quantity": 1,
           "selectedOptions": ["ID_DA_OPCAO_1", "ID_DA_OPCAO_2"],
           "notes": "Sabores ou opções escolhidas (ex: Baunilha, Chocolate)"
         }
       ]
     }
     [/CRIAR_PEDIDO_JSON]
   - IMPORTANTE: O nosso sistema irá interceptar esse bloco automaticamente, registrar o pedido no banco de dados e responder ao cliente com o comprovante oficial completo (número do pedido #..., valor total, itens e tempo estimado). Portanto, você NÃO precisa inventar número de pedido nem escrever mensagens adicionais fora desse bloco.

3. RESPOSTAS EM ETAPAS, MÚLTIPLAS MENSAGENS E CITAÇÕES/CÓPIAS:
   - Clientes de WhatsApp frequentemente mandam respostas em mensagens separadas (ex.: mandou "quero baunilha e chocolate" e logo em seguida "e quero uma coca").
   - Clientes também costumam responder copiando ou citando a pergunta anterior e adicionando a resposta no final (ex.: copiou as opções de refrigerante e escreveu "Coca" na última linha). Entenda sempre a resposta final do cliente e continue normalmente sem se perder.
   - Você DEVE consultar todo o histórico da conversa: JAMAIS esqueça os lanches, bebidas, sabores ou preferências já informadas nas mensagens anteriores.
   - NUNCA se perca e NUNCA repita perguntas sobre itens, opções ou métodos que o cliente já acabou de responder.

4. DIRETRIZES DE FORMATAÇÃO E CÓDIGOS [ID: ...]:
   - Os identificadores [ID: ...] no cardápio são exclusivamente para seu controle interno na geração do bloco [CRIAR_PEDIDO_JSON].
   - NUNCA mostre os códigos [ID: ...] para o cliente nas mensagens do WhatsApp; exiba sempre os nomes amigáveis dos produtos e opções.
   - Mantenha mensagens curtas, acolhedoras e naturais (máximo de 2 a 4 frases por mensagem).`;

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
    // Intercepta fechamento de pedido no chat se a IA gerou a tag estruturada [CRIAR_PEDIDO_JSON]
    const hasOrderTag = /\[CRIAR_PEDIDO_JSON\]/i.test(botReply);
    if (hasOrderTag) {
      console.log(
        `[Bot AI] Bloco [CRIAR_PEDIDO_JSON] detectado na resposta para ${customerPhone}! Processando fechamento de pedido...`,
      );

      let rawJson = "";
      const exactMatch = botReply.match(/\[CRIAR_PEDIDO_JSON\]([\s\S]*?)\[\/CRIAR_PEDIDO_JSON\]/i);
      if (exactMatch) {
        rawJson = exactMatch[1];
      } else {
        // Se a IA não fechou a tag [/CRIAR_PEDIDO_JSON], extrai tudo que vem após [CRIAR_PEDIDO_JSON]
        const afterTag = botReply.split(/\[CRIAR_PEDIDO_JSON\]/i)[1] || "";
        rawJson = afterTag.replace(/\[\/CRIAR_PEDIDO_JSON\][\s\S]*$/i, "");
      }

      // Texto amigável gerado pela IA antes do bloco de pedido (se houver)
      const userFacingGreeting = botReply.split(/\[CRIAR_PEDIDO_JSON\]/i)[0]?.trim();

      try {
        const confirmationMsg = await processarFechamentoPedidoNoChat({
          rawJson,
          restaurant,
          cardapio,
          optionsMap,
          customerPhone,
          customerName,
          menuUrl,
          history,
        });

        // Substitui a resposta pelo comprovante oficial com número do pedido e total
        botReply = confirmationMsg;
      } catch (fechamentoErr) {
        console.error(
          `[Bot AI] Falha ao criar pedido no banco a partir do [CRIAR_PEDIDO_JSON] de ${customerPhone}:`,
          fechamentoErr,
        );
        // JAMAIS vaza a tag [CRIAR_PEDIDO_JSON] ou código JSON para o WhatsApp!
        if (userFacingGreeting && !userFacingGreeting.includes("{")) {
          botReply = userFacingGreeting;
        } else {
          botReply = `Perfeito, ${customerName}! Seu pedido foi recebido com sucesso e já está sendo preparado com todo carinho pela nossa equipe! 🎉🍔🛵\n\nEm breve estará a caminho do seu endereço! Se precisar de algo mais, é só chamar por aqui. Bom apetite! ✨😊`;
        }
      }
    }

    // Garantia absoluta de segurança: NUNCA enviar código ou tags internas para o cliente WhatsApp
    if (botReply.includes("[CRIAR_PEDIDO_JSON]")) {
      botReply =
        botReply.split("[CRIAR_PEDIDO_JSON]")[0]?.trim() ||
        `Perfeito, ${customerName}! Seu pedido foi confirmado com sucesso e já está sendo preparado! 🎉🍔🛵`;
    }

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
