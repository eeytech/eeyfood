import {
  aiSettingsTable,
  and,
  asc,
  buscarRestauranteComCardapioPorSlug,
  buscarRestaurantePorSlug,
  criarPedido,
  db,
  DEFAULT_AI_SYSTEM_PROMPT,
  deliveryFeeRulesTable,
  eq,
  freeDeliveryRulesTable,
  getBrazilTime,
  getNextOpeningTime,
  isClientePausado,
  isNotNull,
  isRestaurantOpen,
  operatingHoursTable,
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
  "alterar pedido",
  "mudar pedido",
  "cancelar pedido",
  "trocar pedido",
  "modificar pedido",
  "alterar o pedido",
  "mudar o pedido",
  "cancelar o pedido",
  "trocar o pedido",
  "modificar o pedido",
  "alterar meu pedido",
  "mudar meu pedido",
  "cancelar meu pedido",
  "trocar meu pedido",
  "editar pedido",
  "editar o pedido",
  "editar meu pedido",
  "mudar endereco",
  "mudar endereço",
  "trocar endereco",
  "trocar endereço",
  "cancelamento",
];

const ALTER_OR_CANCEL_ORDER_REGEX =
  /(?:altera(?:r)?|muda(?:r)?|cancela(?:r)?|troca(?:r)?|modifica(?:r)?|edita(?:r)?)\s+(?:o\s+|meu\s+|algum\s+|esse\s+|o\s+item\s+do\s+)?pedido/i;

export const detectaHandoff = (text: string): boolean => {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (ALTER_OR_CANCEL_ORDER_REGEX.test(text)) {
    return true;
  }
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
 * Remove qualquer vazamento de raciocínio interno, rascunhos ("Draft 1", "Draft 2")
 * ou metadados de pensamento da IA antes de enviar para o cliente final.
 */
function cleanInternalReasoning(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();

  // Remove tags <thought>...</thought>
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();

  // Se contiver blocos de rascunho como "Draft 1:", "Draft 2:", etc., pega a mensagem final após o último draft
  if (/Draft \d+/i.test(cleaned)) {
    const drafts = cleaned.split(/Draft \d+.*?:/i);
    if (drafts.length > 1) {
      cleaned = drafts[drafts.length - 1].trim();
    }
  }

  // Se contiver análise interna da IA antes da resposta ao cliente (ex: listagens de constraint, tone, action)
  if (
    cleaned.includes("Constraint Check:") ||
    cleaned.includes("Intelligent Virtual Attendant") ||
    cleaned.includes("Tone: Welcoming")
  ) {
    const lines = cleaned.split("\n");
    let realMsgStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Detecta onde começa a fala real para o cliente
      if (
        /^(?:["“])?(?:Olá|Oi|Boa tarde|Bom dia|Boa noite|Seja bem-vindo|Opa|Tudo bem)/i.test(line) &&
        !line.includes(":") &&
        !line.includes("Greeting")
      ) {
        realMsgStartIndex = i;
        break;
      }
    }
    if (realMsgStartIndex !== -1) {
      cleaned = lines.slice(realMsgStartIndex).join("\n").trim();
    }
  }

  // Remove aspas envolventes se a IA tiver colocado toda a resposta entre aspas
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith('“') && cleaned.endsWith('”'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

/**
 * Garante que nenhum link enviado ao WhatsApp fique grudado com pontuações ('.', ')', ',', '!', '?'),
 * parênteses ou emojis, isolando os links de forma limpa em linhas dedicadas.
 */
export function sanitizeLinksInMessage(text: string): string {
  if (!text) return "";
  let res = text;

  // 1. Extrai links presos entre parênteses: "(cardápio: https://...)" ou "(https://...)"
  res = res.replace(/\((?:[^)]*?)?(https?:\/\/[^\s\)]+)(?:[^)]*?)?\)/gi, "\n\n👉 $1\n\n");

  // 2. Remove pontuações coladas imediatamente no final do link: ., ), ,, !, ?, ;, :
  res = res.replace(/(https?:\/\/[^\s]+?)([.,\)!?:;]+)(?=\s|$)/gi, "$1 $2");

  // 3. Remove emojis ou caracteres não-URL colados imediatamente no final da URL sem espaço
  res = res.replace(/(https?:\/\/[^\s]+?)([^\w\s\/\-_=~#@%&?+.:]+)(?=\s|$)/gi, "$1 $2");

  // 4. Quebra links que estejam na mesma linha com outros textos para que fiquem isolados com espaço
  res = res.replace(
    /(?:^|\n)([^\n]*?)(https?:\/\/[^\s]+)([^\n]*?)(?:\n|$)/g,
    (match, before, url, after) => {
      const b = before.replace(/👉/g, "").trim();
      const a = after.trim();
      const cleanUrl = url.trim().replace(/[.,\)!?:;]+$/, "");
      const parts: string[] = [];
      if (b) parts.push(b);
      parts.push(`👉 ${cleanUrl}`);
      if (a) parts.push(a);
      return `\n\n${parts.join("\n\n")}\n\n`;
    },
  );

  // 5. Normaliza excesso de marcadores e quebras de linha
  res = res.replace(/(?:👉\s*)+/g, "👉 ");
  res = res.replace(/\n{3,}/g, "\n\n").trim();

  return res;
}

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

      // Suporte especial para Pizza Meio a Meio (2 sabores):
      // Se não encontrou pelo nome "Pizza Meio a Meio", localiza através dos sabores descritos nas notas
      if (
        !matchedProduct &&
        (normText(rawName).includes("meio a meio") ||
          normText(item.notes).includes("meio a meio") ||
          normText(item.notes).includes("metade"))
      ) {
        const notesStr = normText(item.notes) + " " + normText(rawName);
        matchedProduct = allDbProducts.find(
          (p: any) =>
            normText(p.name).includes("pizza") &&
            notesStr.includes(normText(p.name).replace("pizza", "").trim()),
        );
        if (!matchedProduct) {
          matchedProduct = allDbProducts.find(
            (p: any) => Boolean((p as any).isPizzaCategory) || normText(p.name).includes("pizza"),
          );
        }
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

      // Se for pizza ou não tiver opções diretas, busca opções de outros produtos da mesma categoria ou pizzas
      if (normText(matchedProduct.name).includes("pizza") || productDbOptions.length === 0) {
        for (const [prodId, groups] of optionsMap.entries()) {
          const otherProd = allDbProducts.find((p: any) => p.id === prodId);
          if (
            otherProd &&
            (otherProd.menuCategoryId === matchedProduct.menuCategoryId ||
              (normText(matchedProduct.name).includes("pizza") && normText(otherProd.name).includes("pizza")))
          ) {
            for (const g of groups.values()) {
              for (const opt of g.options) {
                if (!productDbOptions.some((o) => o.id === opt.id)) {
                  productDbOptions.push(opt);
                }
              }
            }
          }
        }
      }

      const resolvedOptions: string[] = [];
      const unmappedOptionNotes: string[] = [];

      // 1. Resolução a partir de selectedOptions informado no JSON
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

      // 2. TRAVA DE SEGURANÇA INTELIGENTE 1: Varredura nas notas e observações do item
      // Se a IA mencionou uma borda/adicional nas notas mas não passou o ID em selectedOptions, vincula e cobra!
      const textToScan = normText(`${item.notes || ""} ${rawName} ${unmappedOptionNotes.join(" ")}`);
      for (const dbOpt of productDbOptions) {
        if (resolvedOptions.includes(dbOpt.id)) continue;
        const normOptName = normText(dbOpt.name);
        if (normOptName.length >= 3) {
          if (textToScan.includes(normOptName)) {
            resolvedOptions.push(dbOpt.id);
            console.log(
              `[Bot AI Trava de Segurança] Opcional identificado nas observações e vinculado: "${dbOpt.name}" (ID: ${dbOpt.id}, +R$ ${dbOpt.price}) no produto "${matchedProduct.name}"`,
            );
          } else {
            const keywords = normOptName.split(" ").filter((w) => w.length >= 4);
            const matchesAll = keywords.length > 0 && keywords.every((kw) => textToScan.includes(kw));
            if (matchesAll) {
              resolvedOptions.push(dbOpt.id);
              console.log(
                `[Bot AI Trava de Segurança] Opcional vinculado por palavras-chave nas observações: "${dbOpt.name}" (+R$ ${dbOpt.price})`,
              );
            }
          }
        }
      }

      // 3. TRAVA DE SEGURANÇA INTELIGENTE 2: Varredura no histórico recente do chat
      // Se o cliente pediu uma borda ou adicional pago na conversa, mas a IA esqueceu de incluir no JSON
      if (Array.isArray(history) && history.length > 0) {
        const recentHistoryText = normText(
          history
            .slice(-8)
            .map((h) => h.text)
            .join(" "),
        );
        for (const dbOpt of productDbOptions) {
          if (resolvedOptions.includes(dbOpt.id)) continue;
          if (dbOpt.price > 0 || normText(dbOpt.name).includes("borda")) {
            const normOptName = normText(dbOpt.name);
            const keywords = normOptName.split(" ").filter((w) => w.length >= 4);
            const hasAllKeywords = keywords.length > 0 && keywords.every((kw) => recentHistoryText.includes(kw));
            if (recentHistoryText.includes(normOptName) || hasAllKeywords) {
              resolvedOptions.push(dbOpt.id);
              console.log(
                `[Bot AI Trava de Segurança] Adicional pago resgatado do histórico do chat e vinculado: "${dbOpt.name}" (+R$ ${dbOpt.price})`,
              );
            }
          }
        }
      }

      // Limpa de unmappedOptionNotes opções que foram vinculadas via trava de segurança
      const cleanedUnmapped = unmappedOptionNotes.filter(
        (u) =>
          !resolvedOptions.some((ro) => {
            const opt = productDbOptions.find((p) => p.id === ro);
            return (
              opt &&
              (normText(opt.name) === normText(u) ||
                normText(u).includes(normText(opt.name)))
            );
          }),
      );

      const combinedNotes = [
        item.notes?.trim(),
        cleanedUnmapped.length > 0 ? `Opções: ${cleanedUnmapped.join(", ")}` : "",
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

    // Auto-recuperação de bairro: se deliveryNeighborhood não veio especificado, tenta identificar a partir do endereço e regras do restaurante
    if (consumptionMethod === "DELIVERY" && !deliveryNeighborhood) {
      const fullAddressToSearch = normText(
        `${deliveryAddress || ""} ${payload.deliveryAddress || ""} ${
          Array.isArray(history) ? history.filter((h) => h.role === "user").map((h) => h.text).join(" ") : ""
        }`,
      );

      try {
        const feeRules = await db
          .select({ neighborhood: deliveryFeeRulesTable.neighborhood })
          .from(deliveryFeeRulesTable)
          .where(
            and(
              eq(deliveryFeeRulesTable.restaurantId, restaurant.id),
              eq(deliveryFeeRulesTable.isActive, true),
              eq(deliveryFeeRulesTable.type, "NEIGHBORHOOD"),
            ),
          );

        for (const r of feeRules) {
          if (r.neighborhood && fullAddressToSearch.includes(normText(r.neighborhood))) {
            deliveryNeighborhood = r.neighborhood;
            console.log(
              `[Bot AI Fechamento] Bairro identificado no endereço e vinculado automaticamente: "${deliveryNeighborhood}"`,
            );
            break;
          }
        }
      } catch (err) {
        console.warn("[Bot AI Fechamento] Falha ao extrair bairro das regras:", err);
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
        const isHalfAndHalf =
          normText(p.name).includes("meio a meio") ||
          normText(p.notes).includes("meio a meio") ||
          normText(p.notes).includes("metade");

        let l = `• *${p.quantity}x ${p.name}*`;
        if (p.notes) {
          l += isHalfAndHalf ? `\n   └─ 🍕 ${p.notes}` : `\n   └─ Obs: ${p.notes}`;
        }
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
    if (msg.toLowerCase().includes("fechado")) {
      return `Olá, ${customerName}! No momento o *${restaurant.name}* está fechado e nossa cozinha não está recebendo novos pedidos. Você pode conferir nosso cardápio completo pelo link oficial:\n👉 ${menuUrl}\n\nAssim que abrirmos, teremos o maior prazer em preparar o seu pedido! 😊`;
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
          // Excluir modelos específicos de áudio/imagem/tts, experimentais e de raciocínio (thinking)
          if (
            lower.includes("tts") ||
            lower.includes("image") ||
            lower.includes("audio") ||
            lower.includes("embed") ||
            lower.includes("imagen") ||
            lower.includes("robotics") ||
            lower.includes("thinking") ||
            lower.includes("exp")
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
          /^gemini-1\.5-flash$/i,
          /^gemini-1\.5-flash-latest$/i,
          /^gemini-2\.0-flash$/i,
          /^gemini-1\.5-pro$/i,
          /^gemini-1\.5-flash/i,
          /^gemini-2\.0-flash/i,
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
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash",
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
        // FILTRO ABSOLUTO: descarta qualquer bloco marcado com 'thought: true' (raciocínio interno da IA)
        const validParts = Array.isArray(parts)
          ? parts.filter((p: any) => !p.thought)
          : [];
        let text = validParts.map((p: any) => p.text || "").join("").trim();
        if (!text && candidate?.content?.parts?.[0]?.text && !candidate?.content?.parts?.[0]?.thought) {
          text = candidate.content.parts[0].text.trim();
        }
        // Remove quaisquer tags residuais de pensamento
        if (text) {
          text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
        }

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
        const validParts = Array.isArray(parts)
          ? parts.filter((p: any) => !p.thought)
          : [];
        let text = validParts.map((p: any) => p.text || "").join("").trim();
        if (!text && candidate?.content?.parts?.[0]?.text && !candidate?.content?.parts?.[0]?.thought) {
          text = candidate.content.parts[0].text.trim();
        }
        if (text) {
          text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
        }

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

  // 2.1. Verifica horário de funcionamento e regras de entrega em tempo real
  const [operatingHours, feeRulesRaw, freeDeliveryRulesRaw] = await Promise.all([
    db
      .select()
      .from(operatingHoursTable)
      .where(eq(operatingHoursTable.restaurantId, restaurant.id))
      .orderBy(asc(operatingHoursTable.dayOfWeek)),
    db
      .select()
      .from(deliveryFeeRulesTable)
      .where(
        and(
          eq(deliveryFeeRulesTable.restaurantId, restaurant.id),
          eq(deliveryFeeRulesTable.isActive, true),
        ),
      )
      .orderBy(asc(deliveryFeeRulesTable.displayOrder)),
    db
      .select()
      .from(freeDeliveryRulesTable)
      .where(
        and(
          eq(freeDeliveryRulesTable.restaurantId, restaurant.id),
          eq(freeDeliveryRulesTable.isActive, true),
        ),
      )
      .catch(() => []),
  ]);

  const { isOpen, closeTime } = isRestaurantOpen(
    restaurant.status,
    operatingHours,
  );
  const nextOpening = getNextOpeningTime(operatingHours);

  let nextOpeningText = "";
  if (nextOpening) {
    const { dayOfWeek } = getBrazilTime();
    const dias = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    const diaTexto =
      nextOpening.dayOfWeek === dayOfWeek
        ? "hoje"
        : nextOpening.dayOfWeek === (dayOfWeek + 1) % 7
          ? "amanhã"
          : `neste(a) ${dias[nextOpening.dayOfWeek]}`;
    nextOpeningText = `Abriremos ${diaTexto} às ${nextOpening.openTime}`;
  }

  const diasNomes = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const operatingHoursSummary =
    operatingHours.length > 0
      ? operatingHours
          .map(
            (h) => `• ${diasNomes[h.dayOfWeek]}: das ${h.openTime} às ${h.closeTime}`,
          )
          .join("\n")
      : "• Não configurado";

  let storeStatusContext = "";
  if (isOpen) {
    storeStatusContext = `\n### STATUS DE FUNCIONAMENTO DO RESTAURANTE EM TEMPO REAL:
Status Atual: 🟢 ABERTO NO MOMENTO (Cozinha operando normalmente e recebendo pedidos)
${closeTime ? `Horário previsto de encerramento hoje: ${closeTime}` : ""}
Horários da semana:
${operatingHoursSummary}\n`;
  } else {
    storeStatusContext = `\n### STATUS DE FUNCIONAMENTO DO RESTAURANTE EM TEMPO REAL:
Status Atual: 🔴 FECHADO NO MOMENTO (Fora do expediente / Cozinha fechada)
${nextOpeningText ? `Previsão de reabertura: ${nextOpeningText}` : ""}
Horários da semana:
${operatingHoursSummary}

🚨 ATENÇÃO MÁXIMA - O RESTAURANTE ESTÁ FECHADO NO MOMENTO:
1. O restaurante encontra-se FORA do horário de atendimento. A cozinha está FECHADA e NÃO pode aceitar pedidos para agora.
2. Logo na PRIMEIRA MENSAGEM ou caso o cliente saúde/tente pedir:
   - Informe cordialmente e de imediato que o restaurante está FECHADO no momento.
   - Informe a previsão de reabertura: "${nextOpeningText || "consulte nossos horários de funcionamento"}".
   - Envie o link oficial do cardápio online (${menuUrl}) isolado em linha própria para que o cliente possa navegar pelos pratos e preços.
3. É TERMINANTEMENTE PROIBIDO iniciar o fluxo de anotação de pedido (NÃO pergunte sabores obrigatórios, NÃO pergunte bebidas, NÃO pergunte se é entrega/retirada, NÃO pergunte endereço nem forma de pagamento).
4. NUNCA gere o bloco [CRIAR_PEDIDO_JSON].
5. Se o cliente tiver dúvidas sobre ingredientes, itens do cardápio ou horários, responda com gentileza, mas SEMPRE reiterando que os pedidos só poderão ser realizados assim que o restaurante abrir.\n`;
  }

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
          const isPizzaCategory =
            Boolean((c as any).isPizzaCategory) ||
            c.name.toLowerCase().includes("pizza");

          let catHeader = `*${c.name}*`;
          if (isPizzaCategory) {
            catHeader += ` 🍕 (CATEGORIA DE PIZZAS - PERMITE 1 SABOR INTEIRO OU DIVIDIR EM 2 SABORES MEIO A MEIO! SEMPRE OFEREÇA 2 SABORES AO CLIENTE)`;
          }

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
          return `${catHeader}:\n${prods}`;
        })
        .join("\n\n");
  }

  let baseSystemPrompt = aiSettings.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT;
  if (baseSystemPrompt.includes("Burger Craft SP") || baseSystemPrompt.includes("Craft Bot")) {
    baseSystemPrompt = DEFAULT_AI_SYSTEM_PROMPT;
  }

  let deliveryRulesContext = "\n### REGRAS E TAXAS DE ENTREGA (DELIVERY) DO RESTAURANTE:\n";
  const fixedDeliveryFee = Number(restaurant.deliveryFee ?? 0);
  deliveryRulesContext += `• Taxa de Entrega Fixa Padrão: ${fixedDeliveryFee > 0 ? `R$ ${fixedDeliveryFee.toFixed(2).replace(".", ",")}` : "R$ 0,00 (Sem taxa fixa)"} (aplicada para entregas que não se enquadrem nas regras específicas de bairro/zona abaixo).\n`;

  if (feeRulesRaw.length > 0) {
    deliveryRulesContext += "• Zonas e Regras de Frete cadastradas no restaurante:\n";
    for (const rule of feeRulesRaw) {
      let desc = "";
      if (rule.type === "NEIGHBORHOOD") desc = `Bairro: ${rule.neighborhood}`;
      else if (rule.type === "RADIUS_KM") desc = `Raio de até ${rule.maxDistanceKm} km da loja`;
      else if (rule.type === "CEP_RANGE") desc = `Faixa de CEP: ${rule.cepFrom} a ${rule.cepTo}`;

      const fee = Number(rule.fee).toFixed(2).replace(".", ",");
      const minOrder = Number(rule.minimumOrderValue || 0);
      const minStr = minOrder > 0 ? ` | Pedido mínimo: R$ ${minOrder.toFixed(2).replace(".", ",")}` : "";
      const freeThresh = rule.freeDeliveryThreshold !== null ? Number(rule.freeDeliveryThreshold) : null;
      const freeStr = freeThresh !== null ? ` | Frete GRÁTIS para pedidos a partir de R$ ${freeThresh.toFixed(2).replace(".", ",")}` : "";

      deliveryRulesContext += `  - ${rule.name} (${desc}): Taxa R$ ${fee}${minStr}${freeStr}\n`;
    }
  }

  if (freeDeliveryRulesRaw.length > 0) {
    deliveryRulesContext += "• Promoções Ativas de Frete Grátis:\n";
    for (const fRule of freeDeliveryRulesRaw) {
      if (fRule.criterion === "MIN_ORDER_VALUE") {
        deliveryRulesContext += `  - ${fRule.name}: Frete GRÁTIS geral em qualquer entrega para pedidos a partir de R$ ${Number(fRule.minOrderValue).toFixed(2).replace(".", ",")}\n`;
      }
    }
  }

  const fullSystemPrompt = `${baseSystemPrompt}
${storeStatusContext}
${deliveryRulesContext}
${menuContext}

### REGRAS CRÍTICAS E OBRIGATÓRIAS DE FLUXO NO WHATSAPP (FECHAMENTO 100% NO CHAT):
REGRA DE OURO: FAÇA APENAS UMA PERGUNTA POR VEZ. É TERMINANTEMENTE PROIBIDO JUNTAR DUAS PERGUNTAS NA MESMA MENSAGEM.

1. REGRAS PARA A PRIMEIRA MENSAGEM VS MENSAGENS EM ANDAMENTO:
   • SE FOR O PRIMEIRO CONTATO DO CLIENTE (início da conversa):
     - Dê as boas-vindas com simpatia ao ${restaurant.name}.
${
  isOpen
    ? `     - Apresente os principais pratos/categorias ou pergunte como pode ajudar.
     - Envie o link oficial do cardápio online isolado em linha própria:
       👉 ${menuUrl}
     - OBRIGATÓRIO: Termine a primeira mensagem com esta instrução:
       💡 *Dica:* Para um atendimento mais ágil e sem falhas, por favor envie *uma mensagem de cada vez* e aguarde minha resposta antes de mandar a próxima. 😊`
    : `     - AVISO OBRIGATÓRIO DE RESTAURANTE FECHADO: Informe imediatamente que o restaurante está FECHADO no momento e que a cozinha não está recebendo pedidos agora.
     - Informe quando irá abrir: "${nextOpeningText || "consulte nossos horários"}".
     - Convide o cliente a conferir o cardápio oficial para ir escolhendo os pratos com calma:
       👉 ${menuUrl}
     - JAMAIS pergunte o que ele deseja pedir e JAMAIS inicie anotação de pedido enquanto fechado.`
}
   • SE A CONVERSA JÁ ESTIVER EM ANDAMENTO:
     - JAMAIS repita saudações formais longas ("Olá!", "Boa noite!", "Seja bem-vindo...").
     - JAMAIS reenvie a instrução de "uma mensagem de cada vez".
     - Vá direto ao ponto, respondendo objetivamente ao que o cliente falou.
${!isOpen ? `     - Se o cliente tentar pedir itens ou fechar pedido, lembre-o com carinho que a cozinha está fechada e informe a previsão de reabertura (${nextOpeningText || "em breve"}).` : ""}

2. REGRAS ESPECIAIS PARA PIZZAS (1 OU 2 SABORES / MEIO A MEIO):
   - Nossas pizzas PODEM ser pedidas inteiras (1 sabor) OU divididas em até 2 sabores (meio a meio)!
   - QUANDO O CLIENTE PEDIR PIZZA OU PERGUNTAR SOBRE PIZZAS:
     Apresente os sabores disponíveis E pergunte expressamente:
     "Você gostaria da sua pizza inteira de um único sabor ou prefere dividir em 2 sabores (meio a meio)? 🍕"
   - QUANDO O CLIENTE ESCOLHER 2 SABORES (ex: "metade calabresa e metade portuguesa" ou "meio a meio frango e quatro queijos"):
      ACEITE IMEDIATAMENTE e anote com entusiasmo!
      Exemplo: "Excelente escolha! Pizza meio a meio (metade Calabresa e metade Portuguesa) anotada! 🍕✨"
      JAMAIS diga que não é permitido ou que o sistema só aceita pizzas inteiras. Pizzas meio a meio são 100% aceitas!
      Em seguida, pergunte sobre a borda recheada (se houver bordas cadastradas no cardápio).
      ATENÇÃO OBRIGATÓRIA AOS PREÇOS DAS BORDAS: Apresente SEMPRE as opções de borda acompanhadas do respectivo valor adicional (+R$ XX,XX)!
      Exemplo: "Você gostaria de adicionar alguma borda recheada na sua pizza? Temos as opções: Catupiry Original (+R$ 8,00), Cheddar Cremoso (+R$ 8,00) ou Chocolate ao Leite (+R$ 10,00). 😊"
      NUNCA pergunte sobre bordas sem exibir os preços de cada uma!
    - NO BLOCO [CRIAR_PEDIDO_JSON] PARA PIZZA DE 2 SABORES:
      Use o ID do sabor principal (se preços diferentes, use o de maior valor). No campo "name", use "Pizza Meio a Meio". No campo "selectedOptions", inclua OBRIGATORIAMENTE o ID da borda escolhida se houver. E no campo "notes", coloque obrigatoriamente: "Meio a Meio: Metade [Sabor 1] / Metade [Sabor 2]" e a borda se houver.

3. REGRA CRÍTICA - ALTERAÇÃO OU CANCELAMENTO DE PEDIDO JÁ CONFIRMADO:
   - Se o cliente solicitar alterar, mudar, cancelar ou editar um pedido que já foi confirmado ou enviado para a produção:
     Você NÃO PODE alterar o pedido e NÃO PODE registrar um novo pedido corretivo.
     Você DEVE responder educadamente:
     "Por motivos de segurança e agilidade da cozinha, pedidos já enviados para produção não podem ser alterados automaticamente por aqui. Estou chamando um atendente humano agora mesmo para verificar com a nossa equipe! Por favor, aguarde um momento."
     e emitir a tag __HANDOFF_REQUIRED__.

4. REGRAS DE FORMATAÇÃO DE LINKS:
   - O link do cardápio online (${menuUrl}) DEVE SEMPRE estar isolado em sua própria linha, cercado por linhas em branco.
   - NUNCA coloque parênteses ao redor do link, como "(http://...)".
   - NUNCA coloque pontos finais, vírgulas, parênteses ou emojis colados no final do link (ex: "http://.../.", "http://.../)" ou "http://.../🍕").

5. FLUXO PASSO A PASSO PARA ANOTAR E FECHAR O PEDIDO:
   • Etapa 1 (Opções, Sabores e Adicionais do Item):
     SEMPRE que o cliente escolher um item que possui opções ou adicionais disponíveis no cardápio:
     Você DEVE perguntar quais opções ele deseja ANTES de perguntar sobre bebidas ou entrega!
     - REGRAS DE PREÇO PARA OPCIONAIS E ADICIONAIS:
       * OPÇÕES GRATUITAS OU INCLUSAS (ex: ponto da carne de hambúrguer [Ao ponto, Bem passado, Mal passado], sabores inclusos de sorvete, caldas sem acréscimo):
         Apresente apenas os nomes com clareza, SEM colocar valor adicional.
         Exemplo (Hambúrguer): "Excelente escolha! Como você prefere o ponto da carne do seu Duplo Costela? Temos Ao ponto, Bem passado ou Mal passado."
         Exemplo (Sorvete): "Perfeito! Para o Pote de Sorvete Família você pode escolher de 1 a 3 sabores. Temos Baunilha, Chocolate Belga, Morango e Flocos. Quais você gostaria?"
       * ADICIONAIS E BORDAS PAGAS (opções com valor extra > 0 cadastrado no cardápio):
         É TERMINANTEMENTE OBRIGATÓRIO apresentar cada opção paga acompanhada do seu respectivo valor adicional (+R$ XX,XX)!
         Exemplo (Bordas de Pizza): "Você gostaria de adicionar alguma borda recheada na sua pizza? Temos as opções: Catupiry Original (+R$ 8,00), Cheddar Cremoso (+R$ 8,00) ou Chocolate ao Leite (+R$ 10,00). 😊"
         Exemplo (Adicionais de Lanche): "Deseja turbinar seu lanche com algum adicional? Temos Bacon Extra (+R$ 4,50), Cheddar Fatiado (+R$ 3,00) ou Hambúrguer Extra (+R$ 8,00)."
     JAMAIS pule essa etapa, JAMAIS adivinhe os sabores/ponto/borda e JAMAIS avance para a entrega ou bebida sem antes definir as opções do item. PARE AÍ e aguarde a resposta do cliente.

   • Etapa 2 (Bebida / Acompanhamento - Upsell):
     Somente após definir as opções do prato/lanche principal, pergunte APENAS se deseja adicionar alguma bebida geladinha, sobremesa ou acompanhamento. PARE AÍ e aguarde a resposta do cliente.

   • Etapa 3 (Método de Consumo):
     Somente APÓS o cliente responder sobre as bebidas/acompanhamentos, pergunte se o pedido será para ENTREGA (Delivery) ou RETIRADA no balcão. PARE AÍ e aguarde.

   • Etapa 4 (Endereço Completo se Entrega):
     Se o cliente escolher ENTREGA, pergunte o endereço completo para envio (Rua, Número, BAIRRO e Complemento ou Ponto de Referência).
     - É FUNDAMENTAL solicitar o BAIRRO para calcular o valor exato da taxa de entrega! PARE AÍ e aguarde.
     Se o cliente escolheu RETIRADA, pule direto para a Etapa 5.

   • Etapa 5 (Forma de Pagamento e Troco):
     Pergunte qual será a forma de pagamento: PIX, Cartão (débito ou crédito na maquininha na entrega/retirada) ou Dinheiro.
     - Se o cliente escolher DINHEIRO:
       Informe logo o valor total dos itens do pedido e pergunte se vai precisar de troco para quanto ou se tem o valor exato!
       Exemplo: "Perfeito! O valor total do seu pedido ficou em R$ XX,XX. Você vai precisar de troco para quanto, ou tem o valor certinho? 💵"
     - REGRA CRÍTICA SOBRE O VALOR DO PEDIDO:
       Se o cliente perguntar "Quanto ficou?", "Qual o valor do pedido?" ou qualquer dúvida sobre preços em QUALQUER momento da conversa:
       Você DEVE somar os produtos escolhidos e informar o valor total IMEDIATAMENTE!
       JAMAIS diga frases como "para calcular o valor preciso saber o troco". O valor do pedido é a soma dos produtos e NÃO depende do troco!

   • Etapa 6 (Resumo Completo e Confirmação OBRIGATÓRIA com SOMA MATEMÁTICA REAL):
     SEMPRE que tiver todos os dados do pedido (itens, opções/bordas, endereço/retirada e forma de pagamento com troco se houver), você DEVE apresentar o resumo claro e organizado:
     - Itens com quantidades, valores e sabores/opções/bordas escolhidos (detalhando o valor da borda/adicional pago)
     - Se o método for ENTREGA:
       Informe a linha com o frete calculado com base nas regras acima:
       * Se o bairro do cliente for atendido por regra de bairro (ex: Bairro Pinheiros): aplique a taxa da regra (ex: R$ 7,90, ou R$ 0,00 se o valor dos produtos atingir o frete grátis do bairro de R$ 100,00).
       * Se for outro bairro: aplique a Taxa Fixa Padrão (ex: R$ 4,99).
       * Se o valor dos produtos atingir a regra geral de Frete Grátis (ex: R$ 1.000,00): informe Frete GRÁTIS!
       * Exemplo: "🛵 Taxa de Entrega (Bairro Pinheiros): R$ 7,90" (ou "🛵 Frete Grátis!")
     - SOMA MATEMÁTICA RIGOROSA: some Produtos + Opcionais/Bordas Pagas + Bebidas + Taxa de Entrega (se entrega) = Total Real.
       JAMAIS esqueça de somar os adicionais e o frete no total do resumo!
     - Método (Entrega no endereço informado OU Retirada no balcão)
     - Forma de pagamento escolhida (e troco se houver)
     E faça OBRIGATORIAMENTE a pergunta decisiva:
     "Posso confirmar o seu pedido e enviar agora mesmo para a produção na cozinha? 😊"
     PARE AÍ e aguarde a resposta do cliente.
     NUNCA GERE O BLOCO [CRIAR_PEDIDO_JSON] NESTA ETAPA!

6. DISPARO DO PEDIDO NA COZINHA (SOMENTE APÓS O CLIENTE CONFIRMAR O RESUMO):
   - REGRA INVIOLÁVEL: O bloco [CRIAR_PEDIDO_JSON] SÓ PODE SER GERADO se o cliente responder CONFIRMANDO expressamente o Resumo da Etapa 6 (ex.: "Sim", "Pode confirmar", "Pode mandar", "Sim por favor", "Confirmo", "Manda ver", etc.).
   - Se a mensagem do cliente for informando o troco (ex: "Troco para 200", "Tenho 50 reais"), NUNCA gere o bloco [CRIAR_PEDIDO_JSON] nessa resposta! Em vez disso, monte o Resumo Completo (Etapa 6) e pergunte se pode enviar para a produção.
   - REGRA DE VINCULAÇÃO DE ADICIONAIS E BORDAS NO JSON:
     Se o cliente escolheu qualquer borda ou opcional (ex: Borda Catupiry Original [ID: ...]), você DEVE OBRIGATORIAMENTE incluir o ID dessa opção no array "selectedOptions": ["ID_DA_BORDA_OU_OPCAO"], além de anotar nas "notes". Isso garante a cobrança correta no caixa!
   - Assim que o cliente responder confirmando expressamente:
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
           "notes": "Sabores ou opções escolhidas (ex: Metade Frango / Metade Calabresa com Borda Catupiry Original)"
         }
       ]
     }
     [/CRIAR_PEDIDO_JSON]
   - IMPORTANTE: O nosso sistema irá interceptar esse bloco automaticamente, registrar o pedido no banco de dados e responder ao cliente com o comprovante oficial completo (número do pedido #..., valor total, itens e tempo estimado). Portanto, você NÃO precisa inventar número de pedido nem escrever mensagens adicionais fora desse bloco.

7. RESPOSTAS EM ETAPAS, MÚLTIPLAS MENSAGENS E CITAÇÕES/CÓPIAS:
   - Clientes de WhatsApp frequentemente mandam respostas em mensagens separadas (ex.: mandou "quero baunilha e chocolate" e logo em seguida "e quero uma coca").
   - Clientes também costumam responder copiando ou citando a pergunta anterior e adicionando a resposta no final (ex.: copiou as opções de refrigerante e escreveu "Coca" na última linha). Entenda sempre a resposta final do cliente e continue normalmente sem se perder.
   - Você DEVE consultar todo o histórico da conversa: JAMAIS esqueça os lanches, bebidas, sabores ou preferências já informadas nas mensagens anteriores.
   - NUNCA se perca e NUNCA repita perguntas sobre itens, opções ou métodos que o cliente já acabou de responder.

8. DIRETRIZES DE FORMATAÇÃO E CÓDIGOS [ID: ...]:
   - Os identificadores [ID: ...] no cardápio são exclusivamente para seu controle interno na geração do bloco [CRIAR_PEDIDO_JSON].
   - NUNCA mostre os códigos [ID: ...] para o cliente nas mensagens do WhatsApp; exiba sempre os nomes amigáveis dos produtos e opções.
   - Mantenha mensagens curtas, acolhedoras e naturais (máximo de 2 a 4 frases por mensagem).

9. MENSAGENS DE ÁUDIO E VOZ:
   - O nosso sistema transcreve automaticamente os áudios e mensagens de voz enviados pelos clientes para texto.
   - JAMAIS diga frases como "não consigo ouvir áudios", "sou apenas um robô de texto" ou "escreva pois não consigo escutar".
   - Você aceita áudios e mensagens de texto com a mesma naturalidade! Se o cliente perguntar se você ouviu o áudio dele ou se pode enviar áudio, confirme amigavelmente e dê sequência ao atendimento normalmente.`;

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
      if (!isOpen) {
        console.warn(
          `[Bot AI] Bloco [CRIAR_PEDIDO_JSON] interceptado e recusado pois o restaurante está FECHADO para ${customerPhone}.`,
        );
        botReply = `Olá, ${customerName}! No momento o *${restaurant.name}* está *fechado* e nossa cozinha não está recebendo novos pedidos. 🕒\n\n${nextOpeningText ? `*Previsão de abertura:* ${nextOpeningText}\n\n` : ""}Você pode ir escolhendo os pratos pelo nosso cardápio online oficial:\n👉 ${menuUrl}\n\nAssim que abrirmos, teremos o maior prazer em preparar o seu pedido! 😊`;
      } else {
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
    }

    // Limpeza de segurança: remove qualquer resquício de raciocínio interno ou rascunhos da IA
    botReply = cleanInternalReasoning(botReply);

    // Se a IA sinalizou necessidade de handoff (ex: cliente pediu para alterar/cancelar pedido já confirmado)
    if (
      botReply.includes("__HANDOFF_REQUIRED__") ||
      botReply.includes("[HANDOFF_REQUIRED]")
    ) {
      console.log(`[Bot AI] Handoff signal detectado na resposta para ${customerPhone}.`);
      clearConversationHistory(sessionKey);
      return HANDOFF_SIGNAL;
    }

    // Se o restaurante estiver fechado, garante que o aviso esteja presente na mensagem
    if (!isOpen) {
      const normReply = botReply.toLowerCase();
      const mentionsClosed =
        normReply.includes("fechad") ||
        normReply.includes("horário") ||
        normReply.includes("horario") ||
        normReply.includes("abrim") ||
        normReply.includes("abrir") ||
        normReply.includes("abre ");

      if (!mentionsClosed) {
        const closedWarning = `*Aviso:* No momento estamos *fechados* e não estamos aceitando pedidos. ${nextOpeningText ? `(${nextOpeningText})` : ""}\n\n`;
        botReply = `${closedWarning}${botReply.trim()}`;
      }
    }

    // Se for o primeiro contato e estiver ABERTO, garante a dica de 1 mensagem por vez
    const TIP_MSG =
      "💡 *Dica:* Para um atendimento mais ágil e sem falhas, por favor envie *uma mensagem de cada vez* e aguarde minha resposta antes de mandar a próxima. 😊";

    const isFirstInteraction = history.length === 0;

    if (isFirstInteraction && isOpen) {
      if (
        !botReply.includes("uma mensagem de cada vez") &&
        !botReply.includes("uma mensagem por vez")
      ) {
        botReply = `${botReply.trim()}\n\n${TIP_MSG}`;
      }
    } else {
      // Se já está em conversa, remove eventuais saudações completas repetidas geradas pela IA
      botReply = botReply
        .replace(
          /^(?:["“])?(?:Olá|Oi|Boa noite|Bom dia|Boa tarde)[^!\n]+! Seja muito bem-vindo[^\n]+\n*/i,
          "",
        )
        .trim();
    }

    // Sanitiza links para que NUNCA fiquem grudados com '.', ')', ',', emojis, etc.
    botReply = sanitizeLinksInMessage(botReply);

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
  if (!isOpen) {
    return sanitizeLinksInMessage(
      `Olá, ${customerName ? customerName : "tudo bem"}! Seja muito bem-vindo ao *${restaurant.name}*! 😊\n\nNo momento nosso restaurante está *fechado* e a cozinha não está recebendo pedidos. ${nextOpeningText ? `(${nextOpeningText})\n\n` : "\n\n"}Você pode acessar nosso cardápio oficial para conhecer nossas opções e valores:\n👉 ${menuUrl}\n\nAssim que abrirmos teremos o maior prazer em te atender! ✨`,
    );
  }

  return sanitizeLinksInMessage(
    `Olá, ${customerName ? customerName : "tudo bem"}! Seja muito bem-vindo ao *${restaurant.name}*! 😊\n\nAcesse nosso cardápio completo online para conferir as opções, valores e fazer seu pedido com facilidade:\n👉 ${menuUrl}\n\n💡 *Dica:* Para um atendimento mais ágil e sem falhas, por favor envie *uma mensagem de cada vez* e aguarde minha resposta antes de mandar a próxima. 😊`,
  );
};
