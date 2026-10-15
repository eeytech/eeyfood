"use client";

import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FlameIcon,
  HeartIcon,
  ImageIcon,
  InstagramIcon,
  LayersIcon,
  LayoutGridIcon,
  MoveVerticalIcon,
  PaletteIcon,
  PercentIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TagIcon,
  TvIcon,
  TypeIcon,
  UtensilsCrossedIcon,
  Wand2Icon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { gerarBannerComIaAction } from "./banners-actions";

export interface MenuProductItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
}

export interface MenuCategoryItem {
  id: string;
  name: string;
  products?: MenuProductItem[];
}

interface BannersGeneratorClientProps {
  slug: string;
  restaurantName: string;
  restaurantLogo?: string | null;
  menuCategories: MenuCategoryItem[];
}

export type AspectRatioMode = "1:1" | "9:16" | "16:9";
export type CampaignMode = "CATEGORY" | "PRODUCT" | "SEASONAL" | "CUSTOM";
export type ThemeStyle =
  | "dark-gourmet"
  | "vibrant-red"
  | "romantic"
  | "neon-night"
  | "clean-white"
  | "fresh-emerald"
  | "gold-luxury";

export type LayoutStyle =
  | "split-modern"
  | "bold-promo"
  | "gourmet-minimal"
  | "neon-glow"
  | "fresh-clean";

export type TextAlignMode = "left" | "center" | "right";
export type TextPositionMode = "bottom" | "top";
export type BadgeLayoutMode = "inline" | "stacked";
export type HeadlineSizeMode = "sm" | "md" | "lg" | "xl";
export type SubtitleSizeMode = "sm" | "md" | "lg";

interface SeasonalPreset {
  id: string;
  name: string;
  tag: string;
  headline: string;
  subtitle: string;
  badge: string;
  theme: ThemeStyle;
  layout: LayoutStyle;
  suggestedDiscount: number;
}

// Modelos prontos de alta conversão (utilizam os produtos do próprio restaurante)
const SEASONAL_PRESETS: SeasonalPreset[] = [
  {
    id: "sextou",
    name: "Sextou / Fim de Semana",
    tag: "🔥 SEXTOU COM PROMOÇÃO",
    headline: "SEU FIM DE SEMANA PEDE O MELHOR",
    subtitle: "Peça pelo nosso cardápio digital e receba quentinho e rápido no conforto da sua casa.",
    badge: "OFERTA DO DIA",
    theme: "vibrant-red",
    layout: "bold-promo",
    suggestedDiscount: 15,
  },
  {
    id: "combos10",
    name: "Combos 10% OFF",
    tag: "⚡ SÓ HOJE",
    headline: "TODOS OS COMBOS COM 10% OFF",
    subtitle: "Aproveite a nossa seleção especial de combos com desconto imperdível por tempo limitado!",
    badge: "10% DE DESCONTO",
    theme: "dark-gourmet",
    layout: "split-modern",
    suggestedDiscount: 10,
  },
  {
    id: "quarta-burger",
    name: "Festival de Burgers",
    tag: "🍔 FESTIVAL DO SMASH",
    headline: "BURGER ARTESANAL EM DOBRO",
    subtitle: "Burgers suculentos com blend especial, queijo derretido e fritas crocantes com preço exclusivo.",
    badge: "SUPER PREÇO",
    theme: "neon-night",
    layout: "neon-glow",
    suggestedDiscount: 20,
  },
  {
    id: "namorados",
    name: "Especial Casal / Jantar",
    tag: "❤️ NOITE ESPECIAL",
    headline: "O AMOR TEM SABOR INCONFUNDÍVEL",
    subtitle: "Celebre momentos inesquecíveis a dois com nosso menu refinado preparado para você.",
    badge: "COMBO CASAL",
    theme: "romantic",
    layout: "gourmet-minimal",
    suggestedDiscount: 15,
  },
  {
    id: "frete-gratis",
    name: "Frete Grátis Delivery",
    tag: "🚚 FRETE GRÁTIS HOJE",
    headline: "ENTREGA POR NOSSA CONTA",
    subtitle: "Faça seu pedido agora pelo cardápio oficial e não pague absolutamente nada na entrega!",
    badge: "FRETE ZERO",
    theme: "clean-white",
    layout: "fresh-clean",
    suggestedDiscount: 0,
  },
  {
    id: "sushi-premium",
    name: "Festival do Sushi",
    tag: "🥢 FESTIVAL JAPONÊS",
    headline: "SALMÃO FRESCO & COMBINADOS",
    subtitle: "A melhor culinária oriental com peças selecionadas, frescor absoluto e entrega rápida.",
    badge: "PEÇAS NOBRES",
    theme: "gold-luxury",
    layout: "gourmet-minimal",
    suggestedDiscount: 10,
  },
];

// Presets fotográficos de fundos/cenários gastronômicos profissionais
export interface BackgroundPreset {
  id: string;
  name: string;
  url: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "none",
    name: "Cores & Gradiente",
    url: "",
  },
  {
    id: "dark-wood",
    name: "Madeira Rústica",
    url: "https://images.unsplash.com/photo-1546484475-7f7bd55792da?w=1400&auto=format&fit=crop&q=80",
  },
  {
    id: "dark-slate",
    name: "Ardósia Negra",
    url: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1400&auto=format&fit=crop&q=80",
  },
  {
    id: "black-marble",
    name: "Mármore Escuro",
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&auto=format&fit=crop&q=80",
  },
  {
    id: "brick-wall",
    name: "Tijolos Rústicos",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1400&auto=format&fit=crop&q=80",
  },
  {
    id: "bar-bokeh",
    name: "Luzes de Bar Noturno",
    url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1400&auto=format&fit=crop&q=80",
  },
  {
    id: "warm-amber",
    name: "Forno a Lenha / Brasa",
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&auto=format&fit=crop&q=80",
  },
  {
    id: "white-marble",
    name: "Mármore Branco Clean",
    url: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=1400&auto=format&fit=crop&q=80",
  },
];

// Helper para desenhar etiqueta com nome do produto sobre a imagem no Canvas
function drawProductPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number = 380,
) {
  if (!text) return;
  ctx.save();
  ctx.font = "bold 16px sans-serif";
  const metrics = ctx.measureText(text);
  const textW = Math.min(metrics.width, maxW);
  const pillW = textW + 20;
  const pillH = 32;

  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.beginPath();
  ctx.roundRect(x, y - pillH, pillW, pillH, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + 10, y - 10, maxW);
  ctx.restore();
}

// Helper para desenhar imagem em modo Cover no Canvas
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 0,
) {
  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
  }
  const imgAspect = img.width / img.height;
  const targetAspect = w / h;
  let sx = 0;
  let sy = 0;
  let sWidth = img.width;
  let sHeight = img.height;

  if (imgAspect > targetAspect) {
    sWidth = img.height * targetAspect;
    sx = (img.width - sWidth) / 2;
  } else {
    sHeight = img.width / targetAspect;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  ctx.restore();
}

// Helper para quebra de texto elegante no Canvas com suporte a alinhamento (esquerda, centro, direita)
function renderWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2,
  align: "left" | "center" | "right" = "left",
): number {
  ctx.save();
  ctx.textAlign = align;
  const words = text.split(" ");
  let currentLine = "";
  let lineCount = 0;
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(currentLine.trim(), x, currentY);
      currentLine = words[n] + " ";
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines) break;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.trim() && lineCount < maxLines) {
    ctx.fillText(currentLine.trim(), x, currentY);
    currentY += lineHeight;
  }
  ctx.restore();
  return currentY;
}

export function BannersGeneratorClient({
  slug,
  restaurantName,
  restaurantLogo,
  menuCategories,
}: BannersGeneratorClientProps) {
  // Formato / Dimensão
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>("1:1");

  // Modo de Fotos no Banner: 1 foto (destaque) ou 2 fotos (combo/duplo)
  const [photoCountMode, setPhotoCountMode] = useState<"1" | "2">("1");

  // Categoria Selecionada ("ALL" ou ID da categoria)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    menuCategories[0]?.id || "ALL",
  );

  // Produtos de todas as categorias
  const allProducts = useMemo(() => {
    return menuCategories.flatMap((c) => c.products || []);
  }, [menuCategories]);

  // Categoria Atual
  const selectedCategory = useMemo(() => {
    if (selectedCategoryId === "ALL") return null;
    return menuCategories.find((c) => c.id === selectedCategoryId) || null;
  }, [menuCategories, selectedCategoryId]);

  // Produtos da categoria atual ou todos
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return allProducts;
    return selectedCategory.products || [];
  }, [selectedCategory, allProducts]);

  // Produtos que têm imagem cadastrada
  const productsWithImage = useMemo(() => {
    return allProducts.filter((p) => Boolean(p.imageUrl));
  }, [allProducts]);

  // Produto 1 (Slot 1)
  const [selectedProduct1Id, setSelectedProduct1Id] = useState<string>(() => {
    const firstWithImg = menuCategories[0]?.products?.find((p) => p.imageUrl);
    return firstWithImg?.id || menuCategories[0]?.products?.[0]?.id || allProducts[0]?.id || "";
  });

  // Produto 2 (Slot 2 para combo)
  const [selectedProduct2Id, setSelectedProduct2Id] = useState<string>(() => {
    const secondWithImg = menuCategories[0]?.products?.filter((p) => p.imageUrl)?.[1];
    return secondWithImg?.id || menuCategories[0]?.products?.[1]?.id || allProducts[1]?.id || "";
  });

  const selectedProduct1 = useMemo(
    () => allProducts.find((p) => p.id === selectedProduct1Id) || allProducts[0] || null,
    [allProducts, selectedProduct1Id],
  );

  const selectedProduct2 = useMemo(
    () => allProducts.find((p) => p.id === selectedProduct2Id) || allProducts[1] || null,
    [allProducts, selectedProduct2Id],
  );

  // Imagens customizadas (URL externa se o usuário quiser inserir manualmente)
  const [customImageUrl1, setCustomImageUrl1] = useState<string>("");
  const [customImageUrl2, setCustomImageUrl2] = useState<string>("");

  // Textos e Conteúdo do Banner
  const [tagText, setTagText] = useState("🔥 PROMOÇÃO ESPECIAL");
  const [headline, setHeadline] = useState("TODOS OS COMBOS COM 10% DE DESCONTO");
  const [subtitle, setSubtitle] = useState("Aproveite hoje nossos combos selecionados com desconto exclusivo!");
  const [badgeText, setBadgeText] = useState("10% OFF");
  const [ctaText, setCtaText] = useState("Peça pelo cardápio digital • Link na Bio");
  const [socialHandle, setSocialHandle] = useState(`@${slug}`);

  // Desconto
  const [discountPercent, setDiscountPercent] = useState<number>(10);

  // Cenário & Fundo Fotográfico
  const [selectedBgId, setSelectedBgId] = useState<string>("none");
  const [customBgUrl, setCustomBgUrl] = useState<string>("");
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState<number>(65);

  // Posicionamento & Tipografia dos Textos
  const [textAlign, setTextAlign] = useState<TextAlignMode>("left");
  const [textPosition, setTextPosition] = useState<TextPositionMode>("bottom");
  const [badgeLayout, setBadgeLayout] = useState<BadgeLayoutMode>("inline");
  const [headlineSize, setHeadlineSize] = useState<HeadlineSizeMode>("md");
  const [subtitleSize, setSubtitleSize] = useState<SubtitleSizeMode>("md");

  // Estilo Visual e Layout
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>("dark-gourmet");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("split-modern");

  // Toggles Visuais
  const [showLogo, setShowLogo] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showCta, setShowCta] = useState(true);

  // Exportação e Legenda
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Modal de IA
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGoal, setAiGoal] = useState<"PROMO_DISCOUNT" | "LAUNCH" | "WEEKEND" | "FREE_SHIPPING" | "COMBO" | "CUSTOM">("PROMO_DISCOUNT");
  const [isGeneratingAi, startAiTransition] = useTransition();

  // Helper para selecionar produto (slot 1 ou slot 2)
  const handleSelectProduct = (product: MenuProductItem, slot?: 1 | 2) => {
    if (photoCountMode === "1" || slot === 1) {
      setSelectedProduct1Id(product.id);
      setCustomImageUrl1("");

      const prodName = product.name.toUpperCase();
      const originalPrice = product.price || 0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);

      setTagText("⚡ DESTAQUE DO CARDÁPIO");
      setHeadline(prodName);
      if (product.description) {
        setSubtitle(product.description);
      }
      setBadgeText(
        discountPercent > 0
          ? `${discountPercent}% OFF • R$ ${discountedPrice.toFixed(2).replace(".", ",")}`
          : `R$ ${originalPrice.toFixed(2).replace(".", ",")}`,
      );
    } else {
      setSelectedProduct2Id(product.id);
      setCustomImageUrl2("");

      if (selectedProduct1) {
        setTagText("🍔 COMBO ESPECIAL");
        setHeadline(`COMBO: ${selectedProduct1.name.toUpperCase()} + ${product.name.toUpperCase()}`);
        const total = (selectedProduct1.price || 0) + (product.price || 0);
        const comboDiscounted = total * (1 - discountPercent / 100);
        setBadgeText(
          discountPercent > 0
            ? `COMBO ${discountPercent}% OFF • R$ ${comboDiscounted.toFixed(2).replace(".", ",")}`
            : `COMBO • R$ ${total.toFixed(2).replace(".", ",")}`,
        );
        setSubtitle(`Peça agora este super combo com ${selectedProduct1.name} e ${product.name} com desconto e entrega rápida!`);
      }
    }
  };

  // Helper para selecionar categoria e atualizar sugestões
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    if (categoryId === "ALL") {
      setTagText("🔥 PROMOÇÃO ESPECIAL");
      setHeadline(`DESTAQUES DO CARDÁPIO COM ${discountPercent}% OFF`);
      setSubtitle("Aproveite os pratos mais pedidos preparados com ingredientes selecionados e entrega rápida!");
      return;
    }

    const cat = menuCategories.find((c) => c.id === categoryId);
    if (!cat) return;

    const catProds = cat.products || [];
    const prodsWithImg = catProds.filter((p) => p.imageUrl);

    if (prodsWithImg.length > 0) {
      setSelectedProduct1Id(prodsWithImg[0].id);
      setCustomImageUrl1("");
      if (prodsWithImg.length > 1) {
        setSelectedProduct2Id(prodsWithImg[1].id);
        setCustomImageUrl2("");
      }
    } else if (catProds.length > 0) {
      setSelectedProduct1Id(catProds[0].id);
      if (catProds.length > 1) {
        setSelectedProduct2Id(catProds[1].id);
      }
    }

    const catName = cat.name.toUpperCase();
    const isCombo = catName.includes("COMBO") || catName.includes("DUPLO") || catName.includes("KIT");

    if (isCombo && (prodsWithImg.length >= 2 || catProds.length >= 2)) {
      setPhotoCountMode("2");
      setTagText(`🍔 COMBO ESPECIAL`);
      setHeadline(`COMBOS DE ${catName} COM ${discountPercent}% OFF`);
      setSubtitle(`Peça os melhores combos de ${cat.name.toLowerCase()} preparados com carinho e entrega rápida!`);
    } else {
      setTagText(`🔥 PROMOÇÃO EM ${catName}`);
      setHeadline(`TODOS OS ${catName} COM ${discountPercent}% OFF`);
      setSubtitle(`Peça agora e aproveite os melhores itens de ${cat.name.toLowerCase()} preparados com carinho!`);
    }
    setBadgeText(`${discountPercent}% OFF`);
  };

  // Aplicar Preset Sazonal
  const handleApplyPreset = (preset: SeasonalPreset) => {
    setTagText(preset.tag);
    setHeadline(preset.headline);
    setSubtitle(preset.subtitle);
    setBadgeText(preset.badge);
    setThemeStyle(preset.theme);
    setLayoutStyle(preset.layout);
    setDiscountPercent(preset.suggestedDiscount);
    toast.success(`Modelo "${preset.name}" aplicado!`);
  };

  // Gerar com IA
  const handleGenerateWithAi = () => {
    startAiTransition(async () => {
      try {
        const result = await gerarBannerComIaAction({
          slug,
          topic: aiTopic,
          campaignGoal: aiGoal,
          discountPercent,
          productId: selectedProduct1Id || undefined,
          categoryId: selectedCategoryId !== "ALL" ? selectedCategoryId : undefined,
        });

        if (result.success) {
          setTagText(result.tagText);
          setHeadline(result.headline);
          setSubtitle(result.subtitle);
          setBadgeText(result.badgeText);
          setCtaText(result.ctaText);
          setThemeStyle(result.themeStyle);
          setLayoutStyle(result.layoutStyle);
          if (result.suggestedImageUrl) {
            setCustomImageUrl1(result.suggestedImageUrl);
          }
          setIsAiDialogOpen(false);
          toast.success(
            result.source === "gemini"
              ? "✨ Banner gerado com Google Gemini com sucesso!"
              : "✨ Banner gerado com Motor Criativo de IA com sucesso!",
          );
        }
      } catch (err) {
        console.error("Erro na geração com IA:", err);
        toast.error("Não foi possível gerar com IA. Tente novamente.");
      }
    });
  };

  // Imagens ativas para renderização (100% integradas aos produtos do restaurante)
  const activeBannerImage1 = useMemo(() => {
    if (customImageUrl1.trim()) return customImageUrl1.trim();
    if (selectedProduct1?.imageUrl) return selectedProduct1.imageUrl;
    // Fallback: primeiro produto com foto do cardápio ou logo do restaurante
    return productsWithImage[0]?.imageUrl || restaurantLogo || "";
  }, [customImageUrl1, selectedProduct1, productsWithImage, restaurantLogo]);

  const activeBannerImage2 = useMemo(() => {
    if (photoCountMode !== "2") return "";
    if (customImageUrl2.trim()) return customImageUrl2.trim();
    if (selectedProduct2?.imageUrl) return selectedProduct2.imageUrl;
    const second = productsWithImage.find((p) => p.id !== selectedProduct1?.id);
    return second?.imageUrl || "";
  }, [photoCountMode, customImageUrl2, selectedProduct2, productsWithImage, selectedProduct1]);

  // Cenário / Fundo Fotográfico Ativo
  const activeBgImageUrl = useMemo(() => {
    if (customBgUrl.trim()) return customBgUrl.trim();
    if (selectedBgId && selectedBgId !== "none") {
      const found = BACKGROUND_PRESETS.find((b) => b.id === selectedBgId);
      return found?.url || "";
    }
    return "";
  }, [customBgUrl, selectedBgId]);

  // Paleta de Estilos do Tema
  const themeClasses = useMemo(() => {
    switch (themeStyle) {
      case "dark-gourmet":
        return {
          bg: "bg-slate-950",
          gradient: "from-slate-950 via-slate-900/95 to-amber-950/40",
          accentColor: "#f59e0b",
          tagBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          badgeBg: "bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-amber-500/30",
          titleColor: "text-white",
          subColor: "text-slate-300",
          border: "border-amber-500/30",
          cardInner: "bg-slate-900/60 border-white/10",
        };
      case "vibrant-red":
        return {
          bg: "bg-[#280505]",
          gradient: "from-[#280505] via-[#450a0a]/95 to-[#7c2d12]/40",
          accentColor: "#ef4444",
          tagBg: "bg-red-500/20 text-red-200 border-red-500/40",
          badgeBg: "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-red-500/30",
          titleColor: "text-white",
          subColor: "text-red-100",
          border: "border-red-500/30",
          cardInner: "bg-red-950/40 border-red-500/20",
        };
      case "romantic":
        return {
          bg: "bg-[#2b0817]",
          gradient: "from-[#2b0817] via-[#4a0d26]/95 to-[#801438]/50",
          accentColor: "#f43f5e",
          tagBg: "bg-rose-500/20 text-rose-200 border-rose-500/40",
          badgeBg: "bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-rose-500/30",
          titleColor: "text-rose-50",
          subColor: "text-rose-200",
          border: "border-rose-500/30",
          cardInner: "bg-rose-950/40 border-rose-500/20",
        };
      case "neon-night":
        return {
          bg: "bg-[#0b0c16]",
          gradient: "from-[#0b0c16] via-[#1a1233]/95 to-[#3b0764]/40",
          accentColor: "#a855f7",
          tagBg: "bg-purple-500/20 text-purple-200 border-purple-500/40",
          badgeBg: "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-purple-500/30",
          titleColor: "text-white",
          subColor: "text-purple-200",
          border: "border-purple-500/30",
          cardInner: "bg-purple-950/30 border-purple-500/20",
        };
      case "fresh-emerald":
        return {
          bg: "bg-[#021f18]",
          gradient: "from-[#021f18] via-[#064e3b]/90 to-[#022c22]/40",
          accentColor: "#10b981",
          tagBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
          badgeBg: "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-500/30",
          titleColor: "text-emerald-50",
          subColor: "text-emerald-200",
          border: "border-emerald-500/30",
          cardInner: "bg-emerald-950/40 border-emerald-500/20",
        };
      case "gold-luxury":
        return {
          bg: "bg-[#0a0a0a]",
          gradient: "from-[#0a0a0a] via-[#1c1917]/95 to-[#443825]/40",
          accentColor: "#eab308",
          tagBg: "bg-amber-500/20 text-amber-200 border-amber-500/40",
          badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold shadow-amber-500/30",
          titleColor: "text-amber-50",
          subColor: "text-amber-100/80",
          border: "border-amber-500/40",
          cardInner: "bg-stone-900/60 border-amber-500/20",
        };
      case "clean-white":
      default:
        return {
          bg: "bg-white",
          gradient: "from-white via-slate-50 to-slate-100",
          accentColor: "#e11d48",
          tagBg: "bg-red-50 text-red-700 border-red-200",
          badgeBg: "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-500/20",
          titleColor: "text-slate-900",
          subColor: "text-slate-600",
          border: "border-slate-200",
          cardInner: "bg-slate-50 border-slate-200",
        };
    }
  }, [themeStyle]);

  // Legenda Pronta para Redes Sociais
  const socialCaption = useMemo(() => {
    return `🔥 ${tagText.replace(/^[^\w\s]+/, "").trim()}!

${headline}

${subtitle}

${showBadge && badgeText ? `✨ Destaque: ${badgeText}\n` : ""}🛵 Peça direto pelo nosso cardápio digital ou clique no link da bio!
👉 Acesse agora: ${socialHandle}

#delivery #gastronomia #${slug} #promocao #restaurante #foodporn #delicia`;
  }, [tagText, headline, subtitle, showBadge, badgeText, socialHandle, slug]);

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(socialCaption);
    setCopiedCaption(true);
    toast.success("Legenda copiada! Cole direto no Instagram ou WhatsApp.");
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  // ── Renderização e Download em Alta Resolução (Canvas 2D) ──
  // NUNCA CORTA no 1:1, 9:16 ou 16:9
  const handleDownloadBanner = async () => {
    setIsExporting(true);
    try {
      let width = 1080;
      let height = 1080;
      if (aspectRatio === "9:16") {
        width = 1080;
        height = 1920;
      } else if (aspectRatio === "16:9") {
        width = 1200;
        height = 675;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível inicializar o canvas.");

      // 1. Fundo Gradiente Rico
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (themeStyle === "dark-gourmet") {
        bgGrad.addColorStop(0, "#020617");
        bgGrad.addColorStop(0.5, "#0f172a");
        bgGrad.addColorStop(1, "#451a03");
      } else if (themeStyle === "vibrant-red") {
        bgGrad.addColorStop(0, "#280505");
        bgGrad.addColorStop(0.6, "#7f1d1d");
        bgGrad.addColorStop(1, "#7c2d12");
      } else if (themeStyle === "romantic") {
        bgGrad.addColorStop(0, "#2b0817");
        bgGrad.addColorStop(0.6, "#4a0d26");
        bgGrad.addColorStop(1, "#831843");
      } else if (themeStyle === "neon-night") {
        bgGrad.addColorStop(0, "#0b0c16");
        bgGrad.addColorStop(0.6, "#1e1b4b");
        bgGrad.addColorStop(1, "#3b0764");
      } else if (themeStyle === "fresh-emerald") {
        bgGrad.addColorStop(0, "#021f18");
        bgGrad.addColorStop(0.6, "#064e3b");
        bgGrad.addColorStop(1, "#022c22");
      } else if (themeStyle === "gold-luxury") {
        bgGrad.addColorStop(0, "#0a0a0a");
        bgGrad.addColorStop(0.6, "#1c1917");
        bgGrad.addColorStop(1, "#443825");
      } else {
        bgGrad.addColorStop(0, "#ffffff");
        bgGrad.addColorStop(1, "#f1f5f9");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Helper para carregar imagens com crossOrigin
      const loadImage = (url: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => {
            const fallback = new window.Image();
            fallback.onload = () => resolve(fallback);
            fallback.onerror = () => resolve(null);
            fallback.src = url;
          };
          img.src = url;
        });
      };

      // 1.1 Fundo Fotográfico / Cenário com Opacidade Customizável
      if (activeBgImageUrl) {
        const loadedBg = await loadImage(activeBgImageUrl);
        if (loadedBg) {
          drawImageCover(ctx, loadedBg, 0, 0, width, height);
          ctx.save();
          const opacity = Math.min(Math.max(bgOverlayOpacity / 100, 0), 1);
          ctx.fillStyle =
            themeStyle === "clean-white"
              ? `rgba(255, 255, 255, ${opacity})`
              : `rgba(0, 0, 0, ${opacity})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }

      // Iluminação Ambiente / Glow no fundo
      ctx.save();
      const glowGrad = ctx.createRadialGradient(
        aspectRatio === "16:9" ? width * 0.75 : width * 0.5,
        aspectRatio === "16:9" ? height * 0.5 : height * 0.35,
        10,
        aspectRatio === "16:9" ? width * 0.75 : width * 0.5,
        aspectRatio === "16:9" ? height * 0.5 : height * 0.35,
        aspectRatio === "16:9" ? 400 : 500,
      );
      glowGrad.addColorStop(0, `${themeClasses.accentColor}33`);
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Carregar Imagens dos Produtos do cardápio
      const loadedImage1 = await loadImage(activeBannerImage1);
      const loadedImage2 =
        photoCountMode === "2" && activeBannerImage2
          ? await loadImage(activeBannerImage2)
          : null;

      // Métricas Tipográficas Customizadas
      const headlineMetrics169 = {
        sm: { font: "bold 30px sans-serif", lh: 38 },
        md: { font: "bold 38px sans-serif", lh: 46 },
        lg: { font: "bold 44px sans-serif", lh: 52 },
        xl: { font: "900 50px sans-serif", lh: 58 },
      }[headlineSize];

      const subtitleMetrics169 = {
        sm: { font: "normal 16px sans-serif", lh: 22 },
        md: { font: "normal 20px sans-serif", lh: 28 },
        lg: { font: "normal 24px sans-serif", lh: 32 },
      }[subtitleSize];

      const headlineMetrics11 = {
        sm: { font: "bold 32px sans-serif", lh: 40 },
        md: { font: "bold 40px sans-serif", lh: 48 },
        lg: { font: "bold 48px sans-serif", lh: 56 },
        xl: { font: "900 58px sans-serif", lh: 66 },
      }[headlineSize];

      const subtitleMetrics11 = {
        sm: { font: "normal 18px sans-serif", lh: 24 },
        md: { font: "normal 22px sans-serif", lh: 30 },
        lg: { font: "normal 26px sans-serif", lh: 34 },
      }[subtitleSize];

      const headlineMetrics916 = {
        sm: { font: "bold 46px sans-serif", lh: 58 },
        md: { font: "bold 56px sans-serif", lh: 68 },
        lg: { font: "bold 68px sans-serif", lh: 80 },
        xl: { font: "900 80px sans-serif", lh: 92 },
      }[headlineSize];

      const subtitleMetrics916 = {
        sm: { font: "normal 24px sans-serif", lh: 34 },
        md: { font: "normal 30px sans-serif", lh: 42 },
        lg: { font: "normal 36px sans-serif", lh: 48 },
      }[subtitleSize];

      // ========================================================
      // COMPOSIÇÃO 16:9 (Paisagem Web / Facebook / Banner Horizontal)
      // LAYOUT HORIZONTAL 2-COLUNAS: TEXTOS À ESQUERDA, FOTO À DIREITA
      // ========================================================
      if (aspectRatio === "16:9") {
        // Coluna Direita: Imagem de Destaque (ou 2 Fotos Empilhadas para Combo)
        const imgX = 640;
        const imgY = 60;
        const imgW = 490;
        const imgH = 555;

        if (photoCountMode === "2" && loadedImage2) {
          const gap = 20;
          const cardH = Math.floor((imgH - gap) / 2);
          if (loadedImage1) {
            drawImageCover(ctx, loadedImage1, imgX, imgY, imgW, cardH, 20);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(imgX, imgY, imgW, cardH, 20);
            ctx.stroke();
            if (selectedProduct1?.name) {
              drawProductPill(ctx, selectedProduct1.name, imgX + 16, imgY + cardH - 14, 380);
            }
          }
          if (loadedImage2) {
            const y2 = imgY + cardH + gap;
            drawImageCover(ctx, loadedImage2, imgX, y2, imgW, cardH, 20);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(imgX, y2, imgW, cardH, 20);
            ctx.stroke();
            if (selectedProduct2?.name) {
              drawProductPill(ctx, selectedProduct2.name, imgX + 16, y2 + cardH - 14, 380);
            }
          }
        } else if (loadedImage1) {
          drawImageCover(ctx, loadedImage1, imgX, imgY, imgW, imgH, 28);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgW, imgH, 28);
          ctx.stroke();
          if (selectedProduct1?.name) {
            drawProductPill(ctx, selectedProduct1.name, imgX + 18, imgY + imgH - 18, 400);
          }
        }

        // Coluna Esquerda: Textos, Selos e CTA
        const leftX = 70;
        const maxTextW = 530;
        const textAnchorX =
          textAlign === "center"
            ? leftX + maxTextW / 2
            : textAlign === "right"
            ? leftX + maxTextW
            : leftX;

        // Selo / Tag Superior
        ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = textAlign;
        ctx.fillText(tagText.toUpperCase(), textAnchorX, 90);

        // Logo e Nome do Restaurante
        if (showLogo) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = textAlign;
          ctx.fillText(restaurantName, textAnchorX, 135);
        }

        // Badge de Desconto / Preço
        let contentStartY = 200;
        if (showBadge && badgeText) {
          ctx.font = "bold 20px sans-serif";
          const badgeMetrics = ctx.measureText(badgeText);
          const badgeW = Math.max(badgeMetrics.width + 36, 170);
          const badgeH = 44;
          let badgeDrawX = leftX;
          if (textAlign === "center") {
            badgeDrawX = leftX + (maxTextW - badgeW) / 2;
          } else if (textAlign === "right") {
            badgeDrawX = leftX + maxTextW - badgeW;
          }

          ctx.fillStyle = themeStyle === "clean-white" ? "#e11d48" : themeClasses.accentColor;
          ctx.beginPath();
          ctx.roundRect(badgeDrawX, contentStartY - 32, badgeW, badgeH, 22);
          ctx.fill();

          ctx.fillStyle = themeStyle === "gold-luxury" ? "#000000" : "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(badgeText, badgeDrawX + badgeW / 2, contentStartY - 3);
          contentStartY += 60;
        }

        // Headline Principal (com alinhamento e tamanho customizados)
        ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
        ctx.font = headlineMetrics169.font;
        const afterHeadlineY = renderWrappedText(
          ctx,
          headline,
          textAnchorX,
          contentStartY,
          maxTextW,
          headlineMetrics169.lh,
          2,
          textAlign,
        );

        // Subtítulo
        ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
        ctx.font = subtitleMetrics169.font;
        renderWrappedText(
          ctx,
          subtitle,
          textAnchorX,
          afterHeadlineY + 12,
          maxTextW,
          subtitleMetrics169.lh,
          2,
          textAlign,
        );

        // CTA Rodapé
        if (showCta) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = textAlign;
          ctx.fillText(ctaText, textAnchorX, 580);
        }
      }

      // ========================================================
      // COMPOSIÇÃO 1:1 (Feed Quadrado Instagram)
      // LAYOUT VERTICAL BALANCEADO SEM CORTES
      // ========================================================
      else if (aspectRatio === "1:1") {
        const paddingX = 90;
        const contentW = width - paddingX * 2;
        const textAnchorX =
          textAlign === "center"
            ? width / 2
            : textAlign === "right"
            ? width - paddingX
            : paddingX;

        const drawBadgePill11 = (y: number) => {
          ctx.save();
          ctx.font = "bold 22px sans-serif";
          const metrics = ctx.measureText(badgeText);
          const badgeW = Math.max(metrics.width + 40, 180);
          const badgeH = 46;
          let badgeX = paddingX;
          if (textAlign === "center") {
            badgeX = (width - badgeW) / 2;
          } else if (textAlign === "right") {
            badgeX = width - paddingX - badgeW;
          }
          ctx.fillStyle = themeStyle === "clean-white" ? "#e11d48" : themeClasses.accentColor;
          ctx.beginPath();
          ctx.roundRect(badgeX, y - 34, badgeW, badgeH, 23);
          ctx.fill();

          ctx.fillStyle = themeStyle === "gold-luxury" ? "#000000" : "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(badgeText, badgeX + badgeW / 2, y - 3);
          ctx.restore();
        };

        const drawPhotos11 = (imgY: number, imgH: number) => {
          if (photoCountMode === "2" && loadedImage2) {
            const gap = 20;
            const colW = Math.floor((contentW - gap) / 2);
            if (loadedImage1) {
              drawImageCover(ctx, loadedImage1, paddingX, imgY, colW, imgH, 22);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.roundRect(paddingX, imgY, colW, imgH, 22);
              ctx.stroke();
              if (selectedProduct1?.name) {
                drawProductPill(ctx, selectedProduct1.name, paddingX + 14, imgY + imgH - 14, 340);
              }
            }
            if (loadedImage2) {
              const x2 = paddingX + colW + gap;
              drawImageCover(ctx, loadedImage2, x2, imgY, colW, imgH, 22);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.roundRect(x2, imgY, colW, imgH, 22);
              ctx.stroke();
              if (selectedProduct2?.name) {
                drawProductPill(ctx, selectedProduct2.name, x2 + 14, imgY + imgH - 14, 340);
              }
            }
          } else if (loadedImage1) {
            drawImageCover(ctx, loadedImage1, paddingX, imgY, contentW, imgH, 26);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(paddingX, imgY, contentW, imgH, 26);
            ctx.stroke();
            if (selectedProduct1?.name) {
              drawProductPill(ctx, selectedProduct1.name, paddingX + 18, imgY + imgH - 18, 400);
            }
          }
        };

        if (textPosition === "bottom") {
          // Topo: Tag e Nome do Restaurante
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = textAlign;
          ctx.fillText(tagText.toUpperCase(), textAnchorX, 85);

          if (showLogo) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
            ctx.font = "bold 30px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(restaurantName, textAnchorX, 130);
          }

          // Imagem Central
          drawPhotos11(175, 460);

          // Bloco Inferior de Textos
          let textStartY = 705;
          if (showBadge && badgeText) {
            drawBadgePill11(textStartY);
            textStartY += 60;
          }

          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = headlineMetrics11.font;
          const afterHeadlineY = renderWrappedText(
            ctx,
            headline,
            textAnchorX,
            textStartY,
            contentW,
            headlineMetrics11.lh,
            2,
            textAlign,
          );

          ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
          ctx.font = subtitleMetrics11.font;
          renderWrappedText(
            ctx,
            subtitle,
            textAnchorX,
            afterHeadlineY + 12,
            contentW,
            subtitleMetrics11.lh,
            2,
            textAlign,
          );

          if (showCta) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
            ctx.font = "bold 22px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(ctaText, textAnchorX, 1000);
          }
        } else {
          // Layout Invertido: Textos no topo, Fotos na base
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = textAlign;
          ctx.fillText(tagText.toUpperCase(), textAnchorX, 75);

          if (showLogo) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
            ctx.font = "bold 28px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(restaurantName, textAnchorX, 115);
          }

          let curY = 175;
          if (showBadge && badgeText) {
            drawBadgePill11(curY);
            curY += 55;
          }

          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = headlineMetrics11.font;
          const afterHeadlineY = renderWrappedText(
            ctx,
            headline,
            textAnchorX,
            curY,
            contentW,
            headlineMetrics11.lh,
            2,
            textAlign,
          );

          ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
          ctx.font = subtitleMetrics11.font;
          const afterSubtitleY = renderWrappedText(
            ctx,
            subtitle,
            textAnchorX,
            afterHeadlineY + 12,
            contentW,
            subtitleMetrics11.lh,
            2,
            textAlign,
          );

          const photoY = Math.max(afterSubtitleY + 25, 410);
          const photoH = 955 - photoY;
          drawPhotos11(photoY, photoH);

          if (showCta) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
            ctx.font = "bold 22px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(ctaText, textAnchorX, 1025);
          }
        }
      }

      // ========================================================
      // COMPOSIÇÃO 9:16 (Stories & Status 1080 x 1920)
      // LAYOUT VERTICAL MOBILE COM MARGENS SEGURAS
      // ========================================================
      else {
        const paddingX = 90;
        const contentW = width - paddingX * 2;
        const textAnchorX =
          textAlign === "center"
            ? width / 2
            : textAlign === "right"
            ? width - paddingX
            : paddingX;

        const drawBadgePill916 = (y: number) => {
          ctx.save();
          ctx.font = "bold 28px sans-serif";
          const metrics = ctx.measureText(badgeText);
          const badgeW = Math.max(metrics.width + 50, 240);
          const badgeH = 58;
          let badgeX = paddingX;
          if (textAlign === "center") {
            badgeX = (width - badgeW) / 2;
          } else if (textAlign === "right") {
            badgeX = width - paddingX - badgeW;
          }
          ctx.fillStyle = themeStyle === "clean-white" ? "#e11d48" : themeClasses.accentColor;
          ctx.beginPath();
          ctx.roundRect(badgeX, y - 46, badgeW, badgeH, 29);
          ctx.fill();

          ctx.fillStyle = themeStyle === "gold-luxury" ? "#000000" : "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(badgeText, badgeX + badgeW / 2, y - 7);
          ctx.restore();
        };

        const drawPhotos916 = (imgY: number, totalH: number) => {
          if (photoCountMode === "2" && loadedImage2) {
            const gap = 24;
            const cardH = Math.floor((totalH - gap) / 2);
            if (loadedImage1) {
              drawImageCover(ctx, loadedImage1, paddingX, imgY, contentW, cardH, 28);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.roundRect(paddingX, imgY, contentW, cardH, 28);
              ctx.stroke();
              if (selectedProduct1?.name) {
                drawProductPill(ctx, selectedProduct1.name, paddingX + 20, imgY + cardH - 20, 420);
              }
            }
            if (loadedImage2) {
              const y2 = imgY + cardH + gap;
              drawImageCover(ctx, loadedImage2, paddingX, y2, contentW, cardH, 28);
              ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.roundRect(paddingX, y2, contentW, cardH, 28);
              ctx.stroke();
              if (selectedProduct2?.name) {
                drawProductPill(ctx, selectedProduct2.name, paddingX + 20, y2 + cardH - 20, 420);
              }
            }
          } else if (loadedImage1) {
            drawImageCover(ctx, loadedImage1, paddingX, imgY, contentW, totalH, 36);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(paddingX, imgY, contentW, totalH, 36);
            ctx.stroke();
            if (selectedProduct1?.name) {
              drawProductPill(ctx, selectedProduct1.name, paddingX + 24, imgY + totalH - 24, 460);
            }
          }
        };

        if (textPosition === "bottom") {
          // Layout Padrão: Fotos no centro, Textos na base
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 26px sans-serif";
          ctx.textAlign = textAlign;
          ctx.fillText(tagText.toUpperCase(), textAnchorX, 220);

          if (showLogo) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
            ctx.font = "bold 36px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(restaurantName, textAnchorX, 275);
          }

          drawPhotos916(340, 860);

          let textStartY = 1290;
          if (showBadge && badgeText) {
            drawBadgePill916(textStartY);
            textStartY += 80;
          }

          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = headlineMetrics916.font;
          const afterHeadlineY = renderWrappedText(
            ctx,
            headline,
            textAnchorX,
            textStartY,
            contentW,
            headlineMetrics916.lh,
            2,
            textAlign,
          );

          ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
          ctx.font = subtitleMetrics916.font;
          renderWrappedText(
            ctx,
            subtitle,
            textAnchorX,
            afterHeadlineY + 20,
            contentW,
            subtitleMetrics916.lh,
            2,
            textAlign,
          );

          if (showCta) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
            ctx.font = "bold 28px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(ctaText, textAnchorX, 1750);
          }
        } else {
          // Layout Invertido: Textos no topo, Fotos na base
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 26px sans-serif";
          ctx.textAlign = textAlign;
          ctx.fillText(tagText.toUpperCase(), textAnchorX, 200);

          if (showLogo) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
            ctx.font = "bold 34px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(restaurantName, textAnchorX, 250);
          }

          let curY = 330;
          if (showBadge && badgeText) {
            drawBadgePill916(curY);
            curY += 75;
          }

          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = headlineMetrics916.font;
          const afterHeadlineY = renderWrappedText(
            ctx,
            headline,
            textAnchorX,
            curY,
            contentW,
            headlineMetrics916.lh,
            2,
            textAlign,
          );

          ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
          ctx.font = subtitleMetrics916.font;
          const afterSubtitleY = renderWrappedText(
            ctx,
            subtitle,
            textAnchorX,
            afterHeadlineY + 20,
            contentW,
            subtitleMetrics916.lh,
            2,
            textAlign,
          );

          const photoY = Math.max(afterSubtitleY + 40, 680);
          const totalH = 1680 - photoY;
          drawPhotos916(photoY, totalH);

          if (showCta) {
            ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
            ctx.font = "bold 28px sans-serif";
            ctx.textAlign = textAlign;
            ctx.fillText(ctaText, textAnchorX, 1770);
          }
        }
      }

      // 5. Download do Arquivo
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `banner-${slug}-${aspectRatio.replace(":", "x")}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Banner baixado com sucesso em altíssima definição!");
    } catch (err) {
      console.error("Erro ao gerar banner:", err);
      toast.error("Erro ao exportar banner. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <SparklesIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Gerador de Banners para Redes Sociais
            </h1>
            <p className="text-sm text-slate-500">
              Crie artes promocionais profissionais para Instagram, Stories e WhatsApp integradas aos seus produtos e IA.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Criação com IA */}
          <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-full border-primary/30 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-all shadow-xs"
              >
                <Wand2Icon size={15} />
                <span>Criar com IA</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <SparklesIcon size={18} className="text-primary" />
                  Assistente de IA para Banners
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  A IA analisa seu cardápio e gera uma campanha completa: títulos magnéticos, legenda, layout e foto profissional.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Objetivo da Campanha</Label>
                  <Select
                    value={aiGoal}
                    onValueChange={(val: any) => setAiGoal(val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                      <SelectValue placeholder="Selecione o objetivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROMO_DISCOUNT">🔥 Promoção / Desconto Relâmpago</SelectItem>
                      <SelectItem value="WEEKEND">⚡ Sextou / Fim de Semana</SelectItem>
                      <SelectItem value="FREE_SHIPPING">🚚 Frete Grátis Especial</SelectItem>
                      <SelectItem value="COMBO">🍔 Combo em Dobro / Família</SelectItem>
                      <SelectItem value="LAUNCH">✨ Lançamento de Prato / Novidade</SelectItem>
                      <SelectItem value="CUSTOM">🎯 Personalizado / Tema Livre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Ideia ou Prato Específico (Opcional)
                  </Label>
                  <Textarea
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Ex: Quero uma promoção de pizza em dobro com refri na sexta-feira ou burger smash..."
                    className="rounded-xl border-slate-200 text-xs"
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Desconto sugerido:</span>
                    <span className="font-bold text-primary">{discountPercent}% OFF</span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 10, 15, 20, 25, 30, 50].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiscountPercent(d)}
                        className={cn(
                          "flex-1 rounded-lg border py-1 text-center text-xs font-bold transition-all",
                          discountPercent === d
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {d}%
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerateWithAi}
                  disabled={isGeneratingAi}
                  className="w-full h-11 gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCwIcon size={16} className="animate-spin" />
                      <span>Criando arte com IA...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon size={16} />
                      <span>Gerar Arte Completa com IA</span>
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handleCopyCaption}
            className="h-10 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {copiedCaption ? <CheckIcon size={14} className="text-emerald-600" /> : <CopyIcon size={14} />}
            <span>Copiar Legenda</span>
          </Button>

          <Button
            onClick={handleDownloadBanner}
            disabled={isExporting}
            className="h-10 gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            {isExporting ? (
              <RefreshCwIcon size={16} className="animate-spin" />
            ) : (
              <DownloadIcon size={16} />
            )}
            <span>Baixar Banner PNG</span>
          </Button>
        </div>
      </div>

      {/* ── Modelos Prontos de Alta Conversão ───────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap pl-1">
          Modelos Rápidos:
        </span>
        {SEASONAL_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleApplyPreset(p)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all whitespace-nowrap"
          >
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {/* ── Grid Principal: Editor (Esquerda) vs Preview (Direita) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Painel de Configurações e Personalização ─────── */}
        <div className="space-y-5 lg:col-span-6 xl:col-span-5">
          {/* 1. Formato e Dimensões */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TvIcon size={14} />
                <span>Formato da Rede Social</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio("1:1")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all",
                    aspectRatio === "1:1"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300",
                  )}
                >
                  <div className="h-7 w-7 rounded-md border-2 border-current mb-1.5 flex items-center justify-center text-[10px] font-bold">
                    1:1
                  </div>
                  <span className="text-xs font-bold">Feed Instagram</span>
                  <span className="text-[10px] text-slate-400">1080 × 1080</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all",
                    aspectRatio === "9:16"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300",
                  )}
                >
                  <div className="h-9 w-5 rounded-md border-2 border-current mb-1.5 flex items-center justify-center text-[9px] font-bold">
                    9:16
                  </div>
                  <span className="text-xs font-bold">Stories & Status</span>
                  <span className="text-[10px] text-slate-400">1080 × 1920</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all",
                    aspectRatio === "16:9"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300",
                  )}
                >
                  <div className="h-5 w-9 rounded-md border-2 border-current mb-1.5 flex items-center justify-center text-[9px] font-bold">
                    16:9
                  </div>
                  <span className="text-xs font-bold">Paisagem / Web</span>
                  <span className="text-[10px] text-slate-400">1200 × 675</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Seleção de Layouts e Estilos Visuais */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <LayoutGridIcon size={14} />
                <span>Layout & Estilo da Composição</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              {/* Layout Styles */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Composição do Banner</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { id: "split-modern", label: "Split Moderno", desc: "Equilibrado & elegante" },
                    { id: "bold-promo", label: "Super Promoção", desc: "Tipografia de impacto" },
                    { id: "gourmet-minimal", label: "Gourmet Minimal", desc: "Fotografia & sofisticação" },
                    { id: "neon-glow", label: "Neon Night", desc: "Brilho cyber gastronômico" },
                    { id: "fresh-clean", label: "Fresh Clean", desc: "Leve e apetitoso" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLayoutStyle(l.id as LayoutStyle)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-all",
                        layoutStyle === l.id
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40"
                          : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <p className="text-xs font-bold leading-none">{l.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{l.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Palettes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Paleta de Cores e Atmosfera</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "dark-gourmet", label: "Dark Gourmet", color: "bg-slate-950 border-amber-500" },
                    { id: "vibrant-red", label: "Vibrant Red", color: "bg-red-950 border-red-500" },
                    { id: "gold-luxury", label: "Gold Luxury", color: "bg-stone-950 border-yellow-500" },
                    { id: "neon-night", label: "Neon Night", color: "bg-purple-950 border-purple-500" },
                    { id: "fresh-emerald", label: "Emerald Green", color: "bg-emerald-950 border-emerald-500" },
                    { id: "romantic", label: "Romântico Rose", color: "bg-[#2b0817] border-pink-500" },
                    { id: "clean-white", label: "Clean White", color: "bg-white border-slate-300 text-slate-800" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeStyle(t.id as ThemeStyle)}
                      className={cn(
                        "rounded-xl border p-2 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        themeStyle === t.id
                          ? "ring-2 ring-primary border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <span className={cn("h-3 w-3 rounded-full border shrink-0", t.color)} />
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Seleção de Produtos e Fotos do Cardápio */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UtensilsCrossedIcon size={14} className="text-primary" />
                <span>Fotos dos Produtos do Cardápio</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-slate-50">
                {productsWithImage.length} fotos cadastradas
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              {/* Quantidade de fotos: 1 foto ou 2 fotos (combo) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Composição das Fotos</Label>
                  <span className="text-[10px] text-slate-400">
                    {photoCountMode === "1" ? "1 foto de destaque" : "2 fotos lado a lado / combo"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoCountMode("1")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border py-2 px-3 text-xs font-bold transition-all",
                      photoCountMode === "1"
                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <ImageIcon size={14} />
                    <span>1 Foto (Destaque)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoCountMode("2");
                      if (!selectedProduct2Id || selectedProduct2Id === selectedProduct1Id) {
                        const other = productsWithImage.find((p) => p.id !== selectedProduct1Id);
                        if (other) {
                          setSelectedProduct2Id(other.id);
                          setCustomImageUrl2("");
                        }
                      }
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border py-2 px-3 text-xs font-bold transition-all",
                      photoCountMode === "2"
                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <LayersIcon size={14} />
                    <span>2 Fotos (Combo / Duplo)</span>
                  </button>
                </div>
              </div>

              {/* Filtro por Categoria */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Categoria do Cardápio</Label>
                  <span className="text-[10px] text-slate-400">
                    {categoryProducts.length} itens encontrados
                  </span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => handleSelectCategory("ALL")}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap",
                      selectedCategoryId === "ALL"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    Todas ({allProducts.length})
                  </button>
                  {menuCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap",
                        selectedCategoryId === cat.id
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {cat.name} ({cat.products?.length || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Slots de Itens Selecionados Atualmente */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Itens selecionados para a arte:</span>
                  <span className="text-[10px] text-slate-400">Clique nos produtos para escolher</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Slot 1 */}
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                    <div className="relative h-11 w-11 rounded-lg overflow-hidden border border-primary/20 shrink-0 bg-slate-200">
                      {activeBannerImage1 ? (
                        <Image src={activeBannerImage1} alt="Foto 1" fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400 text-[10px]">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="rounded bg-primary px-1.5 py-0.2 text-[9px] font-bold text-primary-foreground">
                          Foto 1
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {selectedProduct1?.name || "Nenhum selecionado"}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-primary mt-0.5">
                        {selectedProduct1?.price
                          ? `R$ ${selectedProduct1.price.toFixed(2).replace(".", ",")}`
                          : "Selecione abaixo"}
                      </p>
                    </div>
                  </div>

                  {/* Slot 2 */}
                  {photoCountMode === "2" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-50/50 p-2">
                      <div className="relative h-11 w-11 rounded-lg overflow-hidden border border-indigo-500/20 shrink-0 bg-slate-200">
                        {activeBannerImage2 ? (
                          <Image src={activeBannerImage2} alt="Foto 2" fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400 text-[10px]">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                            Foto 2
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {selectedProduct2?.name || "Nenhum selecionado"}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                          {selectedProduct2?.price
                            ? `R$ ${selectedProduct2.price.toFixed(2).replace(".", ",")}`
                            : "Selecione abaixo"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:flex items-center justify-center rounded-lg border border-dashed border-slate-200 p-2 text-center text-[11px] text-slate-400">
                      <span>Ative &quot;2 Fotos&quot; para criar combo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista Interativa de Produtos com Imagens */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Produtos do cardápio ({categoryProducts.length}):
                </Label>

                {categoryProducts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    Nenhum produto cadastrado nesta categoria.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
                    {categoryProducts.map((p) => {
                      const isSlot1 = selectedProduct1Id === p.id;
                      const isSlot2 = photoCountMode === "2" && selectedProduct2Id === p.id;

                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "group relative flex flex-col justify-between rounded-xl border p-2 transition-all cursor-pointer text-left",
                            isSlot1
                              ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-xs"
                              : isSlot2
                              ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/40 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs",
                          )}
                          onClick={() => {
                            if (photoCountMode === "1") {
                              handleSelectProduct(p, 1);
                            } else {
                              if (!isSlot1 && !isSlot2) {
                                handleSelectProduct(p, 2);
                              }
                            }
                          }}
                        >
                          {/* Thumbnail */}
                          <div className="relative h-20 w-full rounded-lg overflow-hidden bg-slate-100 mb-1.5 border border-slate-100">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center text-slate-400 p-1">
                                <ImageIcon size={18} className="text-slate-300 mb-1" />
                                <span className="text-[9px] text-center text-slate-400">Sem foto</span>
                              </div>
                            )}

                            {/* Badges de Seleção */}
                            {isSlot1 && (
                              <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow-xs">
                                Foto 1
                              </span>
                            )}
                            {isSlot2 && (
                              <span className="absolute top-1 left-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                                Foto 2
                              </span>
                            )}
                          </div>

                          {/* Título & Preço */}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate" title={p.name}>
                              {p.name}
                            </p>
                            <p className="text-[11px] font-semibold text-primary">
                              R$ {p.price.toFixed(2).replace(".", ",")}
                            </p>
                          </div>

                          {/* Botões de Ação para Escolher Slot */}
                          {photoCountMode === "2" && (
                            <div className="mt-2 flex gap-1 pt-1.5 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectProduct(p, 1);
                                }}
                                className={cn(
                                  "flex-1 rounded py-0.5 text-[9px] font-bold transition-all",
                                  isSlot1
                                    ? "bg-primary text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                                )}
                              >
                                Foto 1
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectProduct(p, 2);
                                }}
                                className={cn(
                                  "flex-1 rounded py-0.5 text-[9px] font-bold transition-all",
                                  isSlot2
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                                )}
                              >
                                Foto 2
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* URL Customizada */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <Label htmlFor="customImageUrl" className="text-[11px] font-semibold text-slate-500">
                  Ou informe um link direto de foto externa:
                </Label>
                <Input
                  id="customImageUrl"
                  value={customImageUrl1}
                  onChange={(e) => setCustomImageUrl1(e.target.value)}
                  placeholder="https://..."
                  className="h-8 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Cenário & Fundo Fotográfico */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-primary" />
                <span>Fundo & Cenário da Arte</span>
              </CardTitle>
              {selectedBgId !== "none" && (
                <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/5">
                  Fundo Ativo
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              {/* Presets de Texturas Gastronômicas */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Texturas & Cenários Fotográficos</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BACKGROUND_PRESETS.map((preset) => {
                    const isSelected = selectedBgId === preset.id && !customBgUrl.trim();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedBgId(preset.id);
                          setCustomBgUrl("");
                        }}
                        className={cn(
                          "group relative flex flex-col items-center rounded-xl border p-1.5 text-center transition-all overflow-hidden",
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xs"
                            : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100",
                        )}
                      >
                        <div className="relative h-12 w-full rounded-lg overflow-hidden border border-slate-200/80 mb-1.5 bg-slate-900">
                          {preset.url ? (
                            <Image
                              src={preset.url}
                              alt={preset.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">Gradiente</span>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <span className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-white">
                                <CheckIcon size={10} strokeWidth={3} />
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 truncate w-full">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opacidade do Fundo / Overlay */}
              {selectedBgId !== "none" && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      Escurecimento do Fundo (Contraste)
                    </Label>
                    <span className="text-xs font-bold text-primary">{bgOverlayOpacity}%</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ajuste o contraste para que os produtos e textos fiquem 100% legíveis:
                  </p>
                  <div className="flex gap-2">
                    {[30, 50, 65, 80, 90].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setBgOverlayOpacity(op)}
                        className={cn(
                          "flex-1 rounded-lg border py-1 text-center text-xs font-bold transition-all",
                          bgOverlayOpacity === op
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {op}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* URL Customizada de Fundo */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <Label htmlFor="customBgUrl" className="text-[11px] font-semibold text-slate-500">
                  Ou informe um link direto de imagem de fundo personalizada:
                </Label>
                <Input
                  id="customBgUrl"
                  value={customBgUrl}
                  onChange={(e) => setCustomBgUrl(e.target.value)}
                  placeholder="https://... (ex: foto do seu restaurante ou textura)"
                  className="h-8 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* 5. Posicionamento & Tipografia dos Textos */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <SlidersHorizontalIcon size={14} className="text-primary" />
                <span>Posicionamento & Tipografia dos Textos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              {/* Alinhamento dos Textos */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Alinhamento dos Textos</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTextAlign("left")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all",
                      textAlign === "left"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <AlignLeftIcon size={14} />
                    <span>Esquerda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign("center")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all",
                      textAlign === "center"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <AlignCenterIcon size={14} />
                    <span>Centro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign("right")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all",
                      textAlign === "right"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <AlignRightIcon size={14} />
                    <span>Direita</span>
                  </button>
                </div>
              </div>

              {/* Posição dos Textos vs Foto */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Posição do Bloco de Texto (Feed & Stories)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTextPosition("bottom")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all",
                      textPosition === "bottom"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <span className="text-xs font-bold">Texto Abaixo</span>
                    <span className="text-[10px] text-slate-400">Fotos no centro, textos na base</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextPosition("top")}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all",
                      textPosition === "top"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <span className="text-xs font-bold">Texto Acima</span>
                    <span className="text-[10px] text-slate-400">Textos no topo, fotos na base</span>
                  </button>
                </div>
              </div>

              {/* Disposição dos Selos (Lado a lado vs Empilhado) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Disposição dos Selos (Tag & Badge)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBadgeLayout("inline")}
                    className={cn(
                      "rounded-xl border p-2 text-center transition-all",
                      badgeLayout === "inline"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <span className="text-xs font-bold">Lado a Lado</span>
                    <span className="block text-[10px] text-slate-400">Dispostos na mesma linha</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBadgeLayout("stacked")}
                    className={cn(
                      "rounded-xl border p-2 text-center transition-all",
                      badgeLayout === "stacked"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <span className="text-xs font-bold">Um Embaixo do Outro</span>
                    <span className="block text-[10px] text-slate-400">Empilhados verticalmente</span>
                  </button>
                </div>
              </div>

              {/* Tamanhos das Fontes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tamanho do Título</Label>
                  <div className="flex gap-1.5">
                    {(["sm", "md", "lg", "xl"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setHeadlineSize(size)}
                        className={cn(
                          "flex-1 rounded-lg border py-1.5 text-center text-xs font-bold transition-all",
                          headlineSize === size
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tamanho do Subtítulo</Label>
                  <div className="flex gap-1.5">
                    {(["sm", "md", "lg"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSubtitleSize(size)}
                        className={cn(
                          "flex-1 rounded-lg border py-1.5 text-center text-xs font-bold transition-all",
                          subtitleSize === size
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Textos e Chamadas da Arte */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <LayersIcon size={14} />
                <span>Textos e Chamadas da Arte</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="tagText" className="text-xs font-semibold text-slate-700">
                    Selo / Tag Superior
                  </Label>
                  <Input
                    id="tagText"
                    value={tagText}
                    onChange={(e) => setTagText(e.target.value)}
                    placeholder="Ex: 🔥 SÓ HOJE"
                    className="h-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="badgeText" className="text-xs font-semibold text-slate-700">
                    Badge de Desconto / Preço
                  </Label>
                  <Input
                    id="badgeText"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Ex: 10% OFF"
                    className="h-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="headline" className="text-xs font-semibold text-slate-700">
                  Título Principal (Headline)
                </Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ex: TODOS OS COMBOS COM 10% OFF"
                  className="h-9 rounded-xl border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="subtitle" className="text-xs font-semibold text-slate-700">
                  Subtítulo / Descrição
                </Label>
                <Textarea
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ex: Peça hoje e aproveite os melhores combos com desconto..."
                  className="rounded-xl border-slate-200 text-xs"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="ctaText" className="text-xs font-semibold text-slate-700">
                    Chamada para Ação (CTA)
                  </Label>
                  <Input
                    id="ctaText"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Ex: Peça pelo link na bio!"
                    className="h-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="socialHandle" className="text-xs font-semibold text-slate-700">
                    Instagram / WhatsApp
                  </Label>
                  <Input
                    id="socialHandle"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    placeholder="Ex: @seurestaurante"
                    className="h-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                  <span>Logo do Restaurante</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <Switch checked={showBadge} onCheckedChange={setShowBadge} />
                  <span>Badge de Desconto</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <Switch checked={showCta} onCheckedChange={setShowCta} />
                  <span>Chamada para Ação</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Painel de Visualização em Tempo Real (Direita) ─── */}
        <div className="space-y-5 lg:col-span-6 xl:col-span-7">
          <Card className="overflow-hidden border-slate-200/80 bg-slate-900/95 shadow-xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Pré-visualização do Banner ({aspectRatio}) • {layoutStyle}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleDownloadBanner}
                  disabled={isExporting}
                  className="h-8 gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  <DownloadIcon size={13} />
                  <span>Baixar PNG</span>
                </Button>
              </div>
            </div>

            {/* Container Responsivo do Banner com ZERO CORTE */}
            <div className="flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 min-h-[440px]">
              {/* ========================================================
                  16:9 LANDSCAPE: LAYOUT HORIZONTAL 2-COLUNAS (ZERO CORTE)
                  ======================================================== */}
              {aspectRatio === "16:9" ? (
                <div
                  className={cn(
                    "relative overflow-hidden rounded-3xl border shadow-2xl transition-all duration-300 w-full max-w-[580px] aspect-[16/9] p-4 sm:p-5 flex flex-row items-stretch gap-4",
                    themeClasses.bg,
                    themeClasses.border,
                  )}
                >
                  {/* Gradiente de Fundo */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-gradient-to-r opacity-90",
                      themeClasses.gradient,
                    )}
                  />

                  {/* Fundo Fotográfico / Cenário com Opacidade Customizável */}
                  {activeBgImageUrl && (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      <Image
                        src={activeBgImageUrl}
                        alt="Fundo Fotográfico"
                        fill
                        className="object-cover"
                        priority
                      />
                      <div
                        className={cn(
                          "absolute inset-0",
                          themeStyle === "clean-white" ? "bg-white" : "bg-black",
                        )}
                        style={{ opacity: bgOverlayOpacity / 100 }}
                      />
                    </div>
                  )}

                  {/* Ambient Glow */}
                  <div
                    className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full blur-2xl opacity-35"
                    style={{ backgroundColor: themeClasses.accentColor }}
                  />

                  {/* Coluna Esquerda: Textos, Selo, Logo, CTA */}
                  <div
                    className={cn(
                      "relative z-10 flex-1 flex flex-col justify-between min-w-0 pr-1",
                      textAlign === "center"
                        ? "text-center items-center"
                        : textAlign === "right"
                        ? "text-right items-end"
                        : "text-left items-start",
                    )}
                  >
                    <div className="space-y-1.5 w-full">
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          textAlign === "center"
                            ? "justify-center"
                            : textAlign === "right"
                            ? "justify-end"
                            : "justify-between",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase truncate",
                              themeClasses.tagBg,
                            )}
                          >
                            {tagText}
                          </span>
                          {badgeLayout === "inline" && showBadge && badgeText && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-xs",
                                themeClasses.badgeBg,
                              )}
                            >
                              {badgeText}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-semibold text-slate-400 truncate">
                          {socialHandle}
                        </span>
                      </div>

                      {showLogo && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5",
                            textAlign === "center" && "justify-center",
                            textAlign === "right" && "justify-end",
                          )}
                        >
                          {restaurantLogo ? (
                            <div className="h-6 w-6 rounded-full overflow-hidden border border-white/20 bg-white/10 shrink-0">
                              <Image
                                src={restaurantLogo}
                                alt={restaurantName}
                                width={24}
                                height={24}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                              {restaurantName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className={cn("text-xs font-bold truncate", themeClasses.titleColor)}>
                            {restaurantName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Headline & Subtitle */}
                    <div className="space-y-1 my-auto w-full">
                      {badgeLayout === "stacked" && showBadge && badgeText && (
                        <div
                          className={cn(
                            "inline-flex mb-1",
                            textAlign === "center" && "w-full justify-center",
                            textAlign === "right" && "w-full justify-end",
                          )}
                        >
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs",
                              themeClasses.badgeBg,
                            )}
                          >
                            {badgeText}
                          </span>
                        </div>
                      )}

                      <h3
                        className={cn(
                          "font-display font-extrabold uppercase tracking-tight leading-tight line-clamp-2",
                          headlineSize === "sm" && "text-xs sm:text-sm",
                          headlineSize === "md" && "text-sm sm:text-base",
                          headlineSize === "lg" && "text-base sm:text-lg",
                          headlineSize === "xl" && "text-lg sm:text-xl font-black",
                          layoutStyle === "bold-promo" && "font-black tracking-normal",
                          themeClasses.titleColor,
                        )}
                      >
                        {headline}
                      </h3>

                      <p
                        className={cn(
                          "line-clamp-2 leading-snug font-medium",
                          subtitleSize === "sm" && "text-[9px] sm:text-[10px]",
                          subtitleSize === "md" && "text-[10px] sm:text-[11px]",
                          subtitleSize === "lg" && "text-[11px] sm:text-xs",
                          themeClasses.subColor,
                        )}
                      >
                        {subtitle}
                      </p>
                    </div>

                    {/* CTA Inferior */}
                    {showCta && (
                      <div
                        className={cn(
                          "pt-1.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] font-bold w-full",
                          textAlign === "center" && "justify-center",
                          textAlign === "right" && "justify-end",
                        )}
                      >
                        <ShoppingBagIcon size={12} style={{ color: themeClasses.accentColor }} />
                        <span className="truncate" style={{ color: themeClasses.accentColor }}>
                          {ctaText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Coluna Direita: Imagem do Produto (ou 2 Fotos Empilhadas) */}
                  {photoCountMode === "2" && activeBannerImage2 ? (
                    <div className="relative z-10 w-[42%] shrink-0 flex flex-col gap-2 justify-center h-full">
                      <div className="relative flex-1 w-full rounded-xl overflow-hidden border border-white/20 shadow-md group">
                        {activeBannerImage1 ? (
                          <Image
                            src={activeBannerImage1}
                            alt={selectedProduct1?.name || "Foto 1"}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            priority
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                            Foto 1
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        {selectedProduct1?.name && (
                          <span className="absolute bottom-1 left-1.5 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-bold text-white truncate max-w-[85%]">
                            {selectedProduct1.name}
                          </span>
                        )}
                      </div>

                      <div className="relative flex-1 w-full rounded-xl overflow-hidden border border-white/20 shadow-md group">
                        {activeBannerImage2 ? (
                          <Image
                            src={activeBannerImage2}
                            alt={selectedProduct2?.name || "Foto 2"}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            priority
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                            Foto 2
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        {selectedProduct2?.name && (
                          <span className="absolute bottom-1 left-1.5 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-bold text-white truncate max-w-[85%]">
                            {selectedProduct2.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 w-[42%] shrink-0 flex items-center justify-center">
                      <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20 shadow-xl group">
                        {activeBannerImage1 ? (
                          <Image
                            src={activeBannerImage1}
                            alt={selectedProduct1?.name || "Foto do Prato"}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            priority
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs text-slate-400">
                            Sem foto
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                        {selectedProduct1?.name && (
                          <span className="absolute bottom-1.5 left-2 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[85%]">
                            {selectedProduct1.name}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ========================================================
                   1:1 OU 9:16: LAYOUT VERTICAL PROPORCIONAL (ZERO CORTE)
                   ======================================================== */
                <div
                  className={cn(
                    "relative overflow-hidden rounded-3xl border shadow-2xl transition-all duration-300 flex flex-col justify-between",
                    themeClasses.bg,
                    themeClasses.border,
                    aspectRatio === "1:1" && "w-full max-w-[430px] aspect-square p-5 sm:p-6",
                    aspectRatio === "9:16" && "w-full max-w-[340px] aspect-[9/16] p-6 sm:p-7",
                  )}
                >
                  {/* Gradiente de Fundo Decorativo */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-gradient-to-b opacity-85",
                      themeClasses.gradient,
                    )}
                  />

                  {/* Fundo Fotográfico / Cenário com Opacidade Customizável */}
                  {activeBgImageUrl && (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      <Image
                        src={activeBgImageUrl}
                        alt="Fundo Fotográfico"
                        fill
                        className="object-cover"
                        priority
                      />
                      <div
                        className={cn(
                          "absolute inset-0",
                          themeStyle === "clean-white" ? "bg-white" : "bg-black",
                        )}
                        style={{ opacity: bgOverlayOpacity / 100 }}
                      />
                    </div>
                  )}

                  {/* Efeito Glow / Iluminação Ambiente */}
                  <div
                    className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full blur-3xl opacity-30"
                    style={{ backgroundColor: themeClasses.accentColor }}
                  />

                  {/* ── Topo do Banner: Logo + Selo ─────────────── */}
                  <div className="relative z-10 flex items-start justify-between gap-2 shrink-0">
                    <div
                      className={cn(
                        "flex flex-col gap-1 w-full",
                        textAlign === "center"
                          ? "items-center text-center"
                          : textAlign === "right"
                          ? "items-end text-right"
                          : "items-start text-left",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase",
                            themeClasses.tagBg,
                          )}
                        >
                          <span>{tagText}</span>
                        </span>
                        {badgeLayout === "inline" && showBadge && badgeText && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-xs",
                              themeClasses.badgeBg,
                            )}
                          >
                            {badgeText}
                          </span>
                        )}
                      </div>

                      {showLogo && (
                        <div className="flex items-center gap-2 mt-1">
                          {restaurantLogo ? (
                            <div className="h-7 w-7 rounded-full overflow-hidden border border-white/20 bg-white/10 shrink-0">
                              <Image
                                src={restaurantLogo}
                                alt={restaurantName}
                                width={28}
                                height={28}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {restaurantName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className={cn("text-xs font-bold tracking-tight truncate", themeClasses.titleColor)}>
                            {restaurantName}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-semibold tracking-wider uppercase text-slate-400">
                        {socialHandle}
                      </span>
                    </div>
                  </div>

                  {/* ── Renderização Condicional por Posição dos Textos ── */}
                  {textPosition === "top" ? (
                    <>
                      {/* Bloco de Textos no Topo */}
                      <div
                        className={cn(
                          "relative z-10 flex flex-col space-y-1 py-1 shrink-0 w-full",
                          textAlign === "center"
                            ? "items-center text-center"
                            : textAlign === "right"
                            ? "items-end text-right"
                            : "items-start text-left",
                        )}
                      >
                        {badgeLayout === "stacked" && showBadge && badgeText && (
                          <div className="inline-flex">
                            <span
                              className={cn(
                                "rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md",
                                themeClasses.badgeBg,
                              )}
                            >
                              {badgeText}
                            </span>
                          </div>
                        )}

                        <h3
                          className={cn(
                            "font-display font-extrabold uppercase tracking-tight leading-tight line-clamp-2",
                            aspectRatio === "9:16"
                              ? headlineSize === "sm"
                                ? "text-base sm:text-lg"
                                : headlineSize === "md"
                                ? "text-lg sm:text-xl"
                                : headlineSize === "lg"
                                ? "text-xl sm:text-2xl"
                                : "text-2xl sm:text-3xl font-black"
                              : headlineSize === "sm"
                              ? "text-sm sm:text-base"
                              : headlineSize === "md"
                              ? "text-base sm:text-lg"
                              : headlineSize === "lg"
                              ? "text-lg sm:text-xl"
                              : "text-xl sm:text-2xl font-black",
                            layoutStyle === "bold-promo" && "font-black tracking-normal",
                            themeClasses.titleColor,
                          )}
                        >
                          {headline}
                        </h3>

                        <p
                          className={cn(
                            "text-[11px] line-clamp-2 leading-relaxed font-medium",
                            subtitleSize === "sm" && "text-[9px] sm:text-[10px]",
                            subtitleSize === "md" && "text-[10px] sm:text-[11px]",
                            subtitleSize === "lg" && "text-[11px] sm:text-xs",
                            themeClasses.subColor,
                          )}
                        >
                          {subtitle}
                        </p>
                      </div>

                      {/* Fotos na Base */}
                      {photoCountMode === "2" && activeBannerImage2 ? (
                        aspectRatio === "1:1" ? (
                          <div className="relative z-10 my-auto flex items-center justify-center py-1 shrink-0 w-full">
                            <div className="grid grid-cols-2 gap-2 w-full max-w-[94%] h-[150px] sm:h-[170px]">
                              <div className="relative h-full w-full rounded-xl overflow-hidden border border-white/20 shadow-xl group">
                                {activeBannerImage1 ? (
                                  <Image
                                    src={activeBannerImage1}
                                    alt={selectedProduct1?.name || "Foto 1"}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    priority
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                    Foto 1
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                {selectedProduct1?.name && (
                                  <span className="absolute bottom-1 left-1.5 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-bold text-white truncate max-w-[85%]">
                                    {selectedProduct1.name}
                                  </span>
                                )}
                              </div>
                              <div className="relative h-full w-full rounded-xl overflow-hidden border border-white/20 shadow-xl group">
                                {activeBannerImage2 ? (
                                  <Image
                                    src={activeBannerImage2}
                                    alt={selectedProduct2?.name || "Foto 2"}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    priority
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                    Foto 2
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                {selectedProduct2?.name && (
                                  <span className="absolute bottom-1 left-1.5 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-bold text-white truncate max-w-[85%]">
                                    {selectedProduct2.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative z-10 my-auto flex flex-col gap-2 py-1 shrink-0 w-full max-w-[95%] h-[230px] sm:h-[260px]">
                            <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-white/20 shadow-xl group">
                              {activeBannerImage1 ? (
                                <Image
                                  src={activeBannerImage1}
                                  alt={selectedProduct1?.name || "Foto 1"}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  priority
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                  Foto 1
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                              {selectedProduct1?.name && (
                                <span className="absolute bottom-1.5 left-2 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[85%]">
                                  {selectedProduct1.name}
                                </span>
                              )}
                            </div>
                            <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-white/20 shadow-xl group">
                              {activeBannerImage2 ? (
                                <Image
                                  src={activeBannerImage2}
                                  alt={selectedProduct2?.name || "Foto 2"}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  priority
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                  Foto 2
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                              {selectedProduct2?.name && (
                                <span className="absolute bottom-1.5 left-2 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[85%]">
                                  {selectedProduct2.name}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="relative z-10 my-auto flex items-center justify-center py-2 shrink-0">
                          <div
                            className={cn(
                              "relative w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl group",
                              aspectRatio === "1:1" ? "h-[155px] sm:h-[175px] max-w-[92%]" : "h-[220px] sm:h-[260px] max-w-[95%]",
                            )}
                          >
                            {activeBannerImage1 ? (
                              <Image
                                src={activeBannerImage1}
                                alt={selectedProduct1?.name || "Banner Promocional"}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                priority
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs text-slate-400">
                                Sem foto
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                            {selectedProduct1?.name && (
                              <span className="absolute bottom-2 left-2 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[85%]">
                                {selectedProduct1.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Fotos no Centro */}
                      {photoCountMode === "2" && activeBannerImage2 ? (
                        aspectRatio === "1:1" ? (
                          <div className="relative z-10 my-auto flex items-center justify-center py-1 shrink-0 w-full">
                            <div className="grid grid-cols-2 gap-2 w-full max-w-[94%] h-[160px] sm:h-[180px]">
                              <div className="relative h-full w-full rounded-xl overflow-hidden border border-white/20 shadow-xl group">
                                {activeBannerImage1 ? (
                                  <Image
                                    src={activeBannerImage1}
                                    alt={selectedProduct1?.name || "Foto 1"}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    priority
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                    Foto 1
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                {selectedProduct1?.name && (
                                  <span className="absolute bottom-1 left-1.5 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-bold text-white truncate max-w-[85%]">
                                    {selectedProduct1.name}
                                  </span>
                                )}
                              </div>
                              <div className="relative h-full w-full rounded-xl overflow-hidden border border-white/20 shadow-xl group">
                                {activeBannerImage2 ? (
                                  <Image
                                    src={activeBannerImage2}
                                    alt={selectedProduct2?.name || "Foto 2"}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    priority
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                    Foto 2
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                {selectedProduct2?.name && (
                                  <span className="absolute bottom-1 left-1.5 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-bold text-white truncate max-w-[85%]">
                                    {selectedProduct2.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative z-10 my-auto flex flex-col gap-2.5 py-1 shrink-0 w-full max-w-[95%] h-[240px] sm:h-[280px]">
                            <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-white/20 shadow-xl group">
                              {activeBannerImage1 ? (
                                <Image
                                  src={activeBannerImage1}
                                  alt={selectedProduct1?.name || "Foto 1"}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  priority
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                  Foto 1
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                              {selectedProduct1?.name && (
                                <span className="absolute bottom-1.5 left-2 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[85%]">
                                  {selectedProduct1.name}
                                </span>
                              )}
                            </div>
                            <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-white/20 shadow-xl group">
                              {activeBannerImage2 ? (
                                <Image
                                  src={activeBannerImage2}
                                  alt={selectedProduct2?.name || "Foto 2"}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  priority
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                                  Foto 2
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                              {selectedProduct2?.name && (
                                <span className="absolute bottom-1.5 left-2 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[85%]">
                                  {selectedProduct2.name}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="relative z-10 my-auto flex items-center justify-center py-2 shrink-0">
                          <div
                            className={cn(
                              "relative w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl group",
                              aspectRatio === "1:1" ? "h-[160px] sm:h-[180px] max-w-[92%]" : "h-[220px] sm:h-[260px] max-w-[95%]",
                            )}
                          >
                            {activeBannerImage1 ? (
                              <Image
                                src={activeBannerImage1}
                                alt={selectedProduct1?.name || "Banner Promocional"}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                priority
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs text-slate-400">
                                Sem foto
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                            {selectedProduct1?.name && (
                              <span className="absolute bottom-2 left-2 rounded bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[85%]">
                                {selectedProduct1.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bloco de Textos na Base */}
                      <div
                        className={cn(
                          "relative z-10 flex flex-col space-y-1.5 pt-1 shrink-0 w-full",
                          textAlign === "center"
                            ? "items-center text-center"
                            : textAlign === "right"
                            ? "items-end text-right"
                            : "items-start text-left",
                        )}
                      >
                        {badgeLayout === "stacked" && showBadge && badgeText && (
                          <div className="inline-flex">
                            <span
                              className={cn(
                                "rounded-full px-3 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md",
                                themeClasses.badgeBg,
                              )}
                            >
                              {badgeText}
                            </span>
                          </div>
                        )}

                        <h3
                          className={cn(
                            "font-display font-extrabold uppercase tracking-tight leading-tight line-clamp-2",
                            aspectRatio === "9:16"
                              ? headlineSize === "sm"
                                ? "text-lg sm:text-xl"
                                : headlineSize === "md"
                                ? "text-xl sm:text-2xl"
                                : headlineSize === "lg"
                                ? "text-2xl sm:text-3xl"
                                : "text-3xl sm:text-4xl font-black"
                              : headlineSize === "sm"
                              ? "text-sm sm:text-base"
                              : headlineSize === "md"
                              ? "text-base sm:text-lg"
                              : headlineSize === "lg"
                              ? "text-lg sm:text-xl"
                              : "text-xl sm:text-2xl font-black",
                            layoutStyle === "bold-promo" && "font-black tracking-normal text-lg sm:text-xl",
                            themeClasses.titleColor,
                          )}
                        >
                          {headline}
                        </h3>

                        <p
                          className={cn(
                            "text-[11px] line-clamp-2 leading-relaxed font-medium",
                            subtitleSize === "sm" && "text-[9px] sm:text-[10px]",
                            subtitleSize === "md" && "text-[10px] sm:text-[11px]",
                            subtitleSize === "lg" && "text-[11px] sm:text-xs",
                            themeClasses.subColor,
                          )}
                        >
                          {subtitle}
                        </p>
                      </div>
                    </>
                  )}

                  {/* CTA Inferior */}
                  {showCta && (
                    <div
                      className={cn(
                        "relative z-10 pt-2 flex items-center justify-between border-t border-white/10 text-[10px] sm:text-[11px] font-bold w-full",
                        textAlign === "center" && "justify-center",
                        textAlign === "right" && "justify-end",
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate" style={{ color: themeClasses.accentColor }}>
                        <ShoppingBagIcon size={13} />
                        <span className="truncate">{ctaText}</span>
                      </span>
                      {textAlign === "left" && <span className="text-slate-400 shrink-0">{socialHandle}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* ── Card de Copywriting e Legenda Pronta para Redes Sociais ── */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <InstagramIcon size={14} className="text-pink-600" />
                <span>Legenda Pronta para o Instagram / WhatsApp</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCaption}
                className="h-8 gap-1.5 rounded-full border-slate-200 text-xs font-semibold"
              >
                {copiedCaption ? <CheckIcon size={13} className="text-emerald-600" /> : <CopyIcon size={13} />}
                <span>{copiedCaption ? "Copiado!" : "Copiar Legenda"}</span>
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 font-sans text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {socialCaption}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                💡 Dica: Clique em &quot;Copiar Legenda&quot;, publique a arte baixada no Instagram Feed, Stories ou status do WhatsApp e cole o texto acima para maximizar suas vendas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
