"use server";

import {
  aiSettingsTable,
  buscarRestauranteComCardapioPorSlug,
  buscarRestaurantePorSlug,
  db,
  eq,
} from "@fsw/db";
import { assertRestaurantAccess } from "@/lib/auth/session";

export interface GenerateBannerAiInput {
  slug: string;
  topic?: string;
  campaignGoal?: "PROMO_DISCOUNT" | "LAUNCH" | "WEEKEND" | "FREE_SHIPPING" | "COMBO" | "CUSTOM";
  discountPercent?: number;
  productId?: string;
  categoryId?: string;
}

export interface GeneratedBannerResult {
  success: boolean;
  tagText: string;
  headline: string;
  subtitle: string;
  badgeText: string;
  ctaText: string;
  socialCaption: string;
  themeStyle: "dark-gourmet" | "vibrant-red" | "romantic" | "neon-night" | "clean-white" | "fresh-emerald" | "gold-luxury";
  layoutStyle: "split-modern" | "bold-promo" | "gourmet-minimal" | "neon-glow" | "fresh-clean";
  suggestedImageUrl?: string;
  suggestedCategory?: string;
  source: "gemini" | "smart-engine";
}

// Banco interno de imagens de alta definição por categoria
const CURATED_FOOD_IMAGES: Record<string, string[]> = {
  burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80",
  ],
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&auto=format&fit=crop&q=80",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&auto=format&fit=crop&q=80",
  ],
  dessert: [
    "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=1200&auto=format&fit=crop&q=80",
  ],
  meat: [
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1558030006-450675393462?w=1200&auto=format&fit=crop&q=80",
  ],
  drinks: [
    "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=1200&auto=format&fit=crop&q=80",
  ],
  pasta: [
    "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=1200&auto=format&fit=crop&q=80",
  ],
};

function pickCuratedImage(foodType: string): string {
  const list = CURATED_FOOD_IMAGES[foodType] || CURATED_FOOD_IMAGES.burger;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex] || list[0];
}

function detectFoodCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("pizza") || lower.includes("calabresa") || lower.includes("mussarela")) return "pizza";
  if (lower.includes("sushi") || lower.includes("japones") || lower.includes("temaki") || lower.includes("poke") || lower.includes("salm")) return "sushi";
  if (lower.includes("acai") || lower.includes("açaí") || lower.includes("doce") || lower.includes("sobremesa") || lower.includes("brownie") || lower.includes("bolo") || lower.includes("sorvete")) return "dessert";
  if (lower.includes("carne") || lower.includes("churrasco") || lower.includes("picanha") || lower.includes("costela") || lower.includes("espeto")) return "meat";
  if (lower.includes("chopp") || lower.includes("cerveja") || lower.includes("drink") || lower.includes("suco") || lower.includes("bebida") || lower.includes("refrigerante")) return "drinks";
  if (lower.includes("massa") || lower.includes("pasta") || lower.includes("lasanha") || lower.includes("espaguete") || lower.includes("italiano")) return "pasta";
  return "burger";
}

/**
 * Motor heurístico inteligente e criativo (zero custo, 100% autônomo e instantâneo)
 * Gera artes completas com copywriting profissional focado em gastronomia e conversão
 */
function generateSmartCreativeBanner(
  restaurantName: string,
  slug: string,
  input: GenerateBannerAiInput,
  itemContext?: { name: string; price?: number; description?: string },
): GeneratedBannerResult {
  const goal = input.campaignGoal || "PROMO_DISCOUNT";
  const discount = input.discountPercent ?? 15;
  const topic = input.topic?.trim() || "";
  const itemName = itemContext?.name || topic || "COMBOS SELECIONADOS";
  const foodType = detectFoodCategory(`${topic} ${itemName}`);

  let tagText = "🔥 PROMOÇÃO ESPECIAL";
  let headline = `${itemName.toUpperCase()} COM ${discount}% OFF`;
  let subtitle = "Aproveite a nossa seleção especial preparada com ingredientes nobres e entrega rápida na sua porta.";
  let badgeText = `${discount}% DE DESCONTO`;
  let ctaText = "Peça agora pelo cardápio • Link na bio";
  let themeStyle: GeneratedBannerResult["themeStyle"] = "dark-gourmet";
  let layoutStyle: GeneratedBannerResult["layoutStyle"] = "split-modern";

  if (goal === "FREE_SHIPPING") {
    tagText = "🚚 ENTREGA POR NOSSA CONTA";
    headline = "FRETE GRÁTIS EM TODO O CARDÁPIO";
    subtitle = `Faça seu pedido agora no ${restaurantName} e não pague nada na taxa de entrega. Válido por tempo limitado!`;
    badgeText = "FRETE GRÁTIS";
    ctaText = "Peça direto pelo link • Entrega Rápida";
    themeStyle = "vibrant-red";
    layoutStyle = "bold-promo";
  } else if (goal === "WEEKEND") {
    tagText = "⚡ SEXTOU COM DESCONTO";
    headline = "SEU FIM DE SEMANA PEDE O MELHOR";
    subtitle = `Reúna a família ou celebre com os amigos com os pratos mais pedidos do ${restaurantName} com preço especial.`;
    badgeText = `${discount}% OFF`;
    ctaText = "Garanta o seu antes que acabe • Link na Bio";
    themeStyle = "neon-night";
    layoutStyle = "neon-glow";
  } else if (goal === "LAUNCH") {
    tagText = "✨ NOVIDADE EXCLUSIVA NO CARDÁPIO";
    headline = `CHEGOU O NOVO ${itemName.toUpperCase()}`;
    subtitle = "Uma explosão irresistível de sabores criada especialmente para surpreender seu paladar. Venha experimentar!";
    badgeText = "LANÇAMENTO";
    ctaText = "Experimente hoje mesmo • Link na bio";
    themeStyle = "gold-luxury";
    layoutStyle = "gourmet-minimal";
  } else if (goal === "COMBO") {
    tagText = "🍔 COMBO FAMÍLIA EM OFERTA";
    headline = "PEÇA EM DOBRO E PAGUE MENOS";
    subtitle = "A combinação perfeita com acompanhamento e bebida inclusos com um super desconto imperdível.";
    badgeText = "COMBO ESPECIAL";
    ctaText = "Aproveite o combo agora • Link na Bio";
    themeStyle = "dark-gourmet";
    layoutStyle = "split-modern";
  } else if (foodType === "sushi") {
    tagText = "🥢 FESTIVAL DO JAPONÊS";
    headline = `${itemName.toUpperCase()} COM ${discount}% OFF`;
    subtitle = "Salmão fresco selecionado, peças maçaricadas e combinados com apresentação premium para você se deliciar.";
    badgeText = `${discount}% OFF`;
    themeStyle = "dark-gourmet";
    layoutStyle = "gourmet-minimal";
  } else if (foodType === "pizza") {
    tagText = "🍕 DIA DA PIZZA CROCANTE";
    headline = "A MELHOR PIZZA ARTESANAL DA CIDADE";
    subtitle = "Massa de fermentação lenta, molho de tomate fresco e muito queijo derretido quentinho na sua casa.";
    badgeText = "FORNO A LENHA";
    themeStyle = "vibrant-red";
    layoutStyle = "bold-promo";
  } else if (foodType === "dessert") {
    tagText = "🍰 MOMENTO DOCE DO DIA";
    headline = "ADOCE O SEU DIA COM O MELHOR";
    subtitle = "Sobremesas artesanais feitas para fechar sua refeição com chave de ouro e muito carinho.";
    badgeText = "DOCE IRRESISTÍVEL";
    themeStyle = "romantic";
    layoutStyle = "fresh-clean";
  }

  const socialCaption = `🔥 ${tagText.replace(/^[^\w\s]+/, "").trim()} no ${restaurantName}!

${headline}

${subtitle}

✨ Destaque exclusivo: ${badgeText}
🛵 Peça quentinho pelo nosso cardápio digital ou clique no link da bio!
👉 Acesse agora: @${slug}

#delivery #gastronomia #${slug} #${foodType} #promocao #foodporn #delicia`;

  return {
    success: true,
    tagText,
    headline,
    subtitle,
    badgeText,
    ctaText,
    socialCaption,
    themeStyle,
    layoutStyle,
    suggestedImageUrl: pickCuratedImage(foodType),
    suggestedCategory: foodType,
    source: "smart-engine",
  };
}

export async function gerarBannerComIaAction(
  input: GenerateBannerAiInput,
): Promise<GeneratedBannerResult> {
  await assertRestaurantAccess(input.slug);
  const restaurant = await buscarRestaurantePorSlug(input.slug);
  if (!restaurant) {
    throw new Error("Restaurante não encontrado.");
  }

  // 1. Coletar dados de contexto do cardápio se fornecido
  let itemContext: { name: string; price?: number; description?: string } | undefined;
  if (input.productId || input.categoryId) {
    const cardapioData = await buscarRestauranteComCardapioPorSlug(restaurant.slug);
    if (input.productId && cardapioData?.menuCategories) {
      for (const cat of cardapioData.menuCategories) {
        const prod = cat.products?.find((p) => p.id === input.productId);
        if (prod) {
          itemContext = {
            name: prod.name,
            price: prod.price,
            description: prod.description || undefined,
          };
          break;
        }
      }
    } else if (input.categoryId && cardapioData?.menuCategories) {
      const cat = cardapioData.menuCategories.find((c) => c.id === input.categoryId);
      if (cat) {
        itemContext = {
          name: cat.name,
        };
      }
    }
  }

  // 2. Verificar se existe chave Gemini configurada no restaurante ou no ambiente
  const aiSettings = await db.query.aiSettingsTable.findFirst({
    where: eq(aiSettingsTable.restaurantId, restaurant.id),
  });

  const rawKey =
    aiSettings?.geminiApiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();

  // Se não houver chave Gemini, roda o motor criativo nativo que é 100% gratuito e instantâneo
  if (!rawKey) {
    return generateSmartCreativeBanner(restaurant.name, restaurant.slug, input, itemContext);
  }

  // 3. Chamar API oficial do Google Gemini via REST
  try {
    const promptInstructions = `Você é um diretor de arte e copywriter sênior especialista em marketing para delivery e restaurantes brasileiros.
Crie o conteúdo de uma arte promocional de alta conversão para o restaurante "${restaurant.name}".

Contexto da campanha:
- Objetivo: ${input.campaignGoal || "Promoção de vendas"}
- Tópico / Instrução do restaurante: ${input.topic || "Promoção imperdível"}
- Produto ou Categoria em destaque: ${itemContext?.name || "Destaques do cardápio"}
- Desconto sugerido: ${input.discountPercent ? `${input.discountPercent}%` : "Especial"}

Responda ESTRITAMENTE em formato JSON puro, sem crases de markdown e sem texto adicional:
{
  "tagText": "Selo superior curto em caixa alta com emoji (Ex: 🔥 SÓ HOJE)",
  "headline": "Título chamativo e persuasivo em caixa alta de até 40 caracteres (Ex: BURGER DUPLO COM 20% OFF)",
  "subtitle": "Subtítulo atraente e apetitoso de 1 a 2 frases para dar água na boca",
  "badgeText": "Texto de selo adesivo curto (Ex: 20% OFF ou COMBO CASAL)",
  "ctaText": "Chamada para ação curta (Ex: Peça pelo cardápio • Link na bio)",
  "socialCaption": "Legenda completa para postar no Instagram / WhatsApp com emojis, proposta e hashtags",
  "themeStyle": "dark-gourmet" | "vibrant-red" | "romantic" | "neon-night" | "clean-white" | "fresh-emerald" | "gold-luxury",
  "layoutStyle": "split-modern" | "bold-promo" | "gourmet-minimal" | "neon-glow" | "fresh-clean",
  "suggestedCategory": "burger" | "pizza" | "sushi" | "dessert" | "meat" | "drinks" | "pasta"
}`;

    const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    for (const model of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(rawKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptInstructions }] }],
              generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 800,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(6000),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawText) {
            const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
            const parsed = JSON.parse(cleanJson);

            const category = parsed.suggestedCategory || detectFoodCategory(parsed.headline || "");
            return {
              success: true,
              tagText: parsed.tagText || "🔥 PROMOÇÃO ESPECIAL",
              headline: parsed.headline || "OFERTA EXCLUSIVA DO DIA",
              subtitle: parsed.subtitle || "Aproveite hoje nossos pratos selecionados com desconto!",
              badgeText: parsed.badgeText || "OFERTA DO DIA",
              ctaText: parsed.ctaText || "Peça pelo cardápio digital • Link na Bio",
              socialCaption: parsed.socialCaption || "",
              themeStyle: parsed.themeStyle || "dark-gourmet",
              layoutStyle: parsed.layoutStyle || "split-modern",
              suggestedImageUrl: pickCuratedImage(category),
              suggestedCategory: category,
              source: "gemini",
            };
          }
        }
      } catch (e) {
        console.warn(`[Banner AI] Tentativa com ${model} falhou:`, e);
      }
    }
  } catch (err) {
    console.warn("[Banner AI] Falha ao consultar Gemini, usando fallback criativo:", err);
  }

  // Fallback seguro caso a chamada de API falhe
  return generateSmartCreativeBanner(restaurant.name, restaurant.slug, input, itemContext);
}
