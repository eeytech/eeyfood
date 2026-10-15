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
  itemContext?: { name: string; price?: number; description?: string; imageUrl?: string },
  restaurantLogo?: string | null,
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
    suggestedImageUrl: itemContext?.imageUrl || restaurantLogo || undefined,
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

  // 1. Coletar dados de contexto do cardápio real do restaurante
  let itemContext: { name: string; price?: number; description?: string; imageUrl?: string } | undefined;
  const cardapioData = await buscarRestauranteComCardapioPorSlug(restaurant.slug);
  if (cardapioData?.menuCategories) {
    if (input.productId) {
      for (const cat of cardapioData.menuCategories) {
        const prod = cat.products?.find((p) => p.id === input.productId);
        if (prod) {
          itemContext = {
            name: prod.name,
            price: prod.price,
            description: prod.description || undefined,
            imageUrl: prod.imageUrl || undefined,
          };
          break;
        }
      }
    } else if (input.categoryId) {
      const cat = cardapioData.menuCategories.find((c) => c.id === input.categoryId);
      if (cat) {
        const prodWithImg = cat.products?.find((p) => p.imageUrl);
        itemContext = {
          name: cat.name,
          imageUrl: prodWithImg?.imageUrl || cat.imageUrl || undefined,
        };
      }
    } else {
      for (const cat of cardapioData.menuCategories) {
        const prodWithImg = cat.products?.find((p) => p.imageUrl);
        if (prodWithImg) {
          itemContext = {
            name: prodWithImg.name,
            imageUrl: prodWithImg.imageUrl || undefined,
          };
          break;
        }
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
    return generateSmartCreativeBanner(
      restaurant.name,
      restaurant.slug,
      input,
      itemContext,
      restaurant.avatarImageUrl,
    );
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
  "layoutStyle": "split-modern" | "bold-promo" | "gourmet-minimal" | "neon-glow" | "fresh-clean"
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
              suggestedImageUrl: itemContext?.imageUrl || restaurant.avatarImageUrl || undefined,
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
  return generateSmartCreativeBanner(
    restaurant.name,
    restaurant.slug,
    input,
    itemContext,
    restaurant.avatarImageUrl,
  );
}
