"use client";

import {
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
  PaletteIcon,
  PercentIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TagIcon,
  TvIcon,
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
  fallbackImage: string;
}

// Modelos prontos de alta conversão
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
    fallbackImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
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
    fallbackImage: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=1200&auto=format&fit=crop&q=80",
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
    fallbackImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80",
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
    fallbackImage: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
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
    fallbackImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80",
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
    fallbackImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=80",
  },
];

// Curadoria de Imagens em Alta Definição Categorizadas
interface CuratedFoodImage {
  id: string;
  category: "burger" | "pizza" | "sushi" | "dessert" | "meat" | "drinks" | "pasta";
  title: string;
  url: string;
}

const CURATED_FOOD_GALLERY: CuratedFoodImage[] = [
  // Hambúrgueres
  {
    id: "b1",
    category: "burger",
    title: "Smash Burger Duplo com Cheddar",
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "b2",
    category: "burger",
    title: "Combo Artesanal com Fritas",
    url: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "b3",
    category: "burger",
    title: "Burger Clássico com Bacon",
    url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "b4",
    category: "burger",
    title: "Burger Gourmet com Molho Especial",
    url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80",
  },
  // Pizzas
  {
    id: "p1",
    category: "pizza",
    title: "Pizza Artesanal de Calabresa",
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "p2",
    category: "pizza",
    title: "Fatia com Queijo Puxando",
    url: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "p3",
    category: "pizza",
    title: "Pizza Napolitana com Manjericão",
    url: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "p4",
    category: "pizza",
    title: "Pizza Quatro Queijos Forno a Lenha",
    url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&auto=format&fit=crop&q=80",
  },
  // Sushi
  {
    id: "s1",
    category: "sushi",
    title: "Barca Especial de Sushis e Sashimis",
    url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "s2",
    category: "sushi",
    title: "Poke Havaiano com Salmão Fresco",
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "s3",
    category: "sushi",
    title: "Combinado Gourmet Maçaricado",
    url: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&auto=format&fit=crop&q=80",
  },
  // Sobremesas & Açaí
  {
    id: "d1",
    category: "dessert",
    title: "Taça de Açaí com Morangos e Granola",
    url: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "d2",
    category: "dessert",
    title: "Brownie Quente com Sorvete",
    url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "d3",
    category: "dessert",
    title: "Cheesecake com Frutas Vermelhas",
    url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=1200&auto=format&fit=crop&q=80",
  },
  // Carnes & Churrasco
  {
    id: "m1",
    category: "meat",
    title: "Picanha Nobre Fatiada na Tábua",
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "m2",
    category: "meat",
    title: "Costela Grelhada ao Barbecue",
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "m3",
    category: "meat",
    title: "Bife Ancho Grelhado com Ervas",
    url: "https://images.unsplash.com/photo-1558030006-450675393462?w=1200&auto=format&fit=crop&q=80",
  },
  // Bebidas & Chopp
  {
    id: "dr1",
    category: "drinks",
    title: "Chopp Artesanal Gelado",
    url: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "dr2",
    category: "drinks",
    title: "Drink Tropical Refrescante com Frutas",
    url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "dr3",
    category: "drinks",
    title: "Suco Natural de Laranja Fresco",
    url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=1200&auto=format&fit=crop&q=80",
  },
  // Massas & Italiano
  {
    id: "pa1",
    category: "pasta",
    title: "Espaguete Carbonara com Parmesão",
    url: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "pa2",
    category: "pasta",
    title: "Fettuccine Cremoso com Cogumelos",
    url: "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=1200&auto=format&fit=crop&q=80",
  },
];

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

// Helper para quebra de texto elegante no Canvas (nunca corta texto)
function renderWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2,
): number {
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

  // Modo da Campanha
  const [campaignMode, setCampaignMode] = useState<CampaignMode>("CATEGORY");

  // Categoria e Produto Selecionados
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    menuCategories[0]?.id || "",
  );
  const selectedCategory = useMemo(
    () => menuCategories.find((c) => c.id === selectedCategoryId) || menuCategories[0],
    [menuCategories, selectedCategoryId],
  );

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const allProducts = useMemo(() => {
    return menuCategories.flatMap((c) => c.products || []);
  }, [menuCategories]);

  const selectedProduct = useMemo(
    () => allProducts.find((p) => p.id === selectedProductId) || allProducts[0],
    [allProducts, selectedProductId],
  );

  // Textos e Conteúdo do Banner
  const [tagText, setTagText] = useState("🔥 PROMOÇÃO ESPECIAL");
  const [headline, setHeadline] = useState("TODOS OS COMBOS COM 10% DE DESCONTO");
  const [subtitle, setSubtitle] = useState("Aproveite hoje nossos combos selecionados com desconto exclusivo!");
  const [badgeText, setBadgeText] = useState("10% OFF");
  const [ctaText, setCtaText] = useState("Peça pelo cardápio digital • Link na Bio");
  const [socialHandle, setSocialHandle] = useState(`@${slug}`);

  // Desconto
  const [discountPercent, setDiscountPercent] = useState<number>(10);

  // Estilo Visual e Layout
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>("dark-gourmet");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("split-modern");

  // Imagem
  const [customImageUrl, setCustomImageUrl] = useState<string>("");
  const [selectedProductImageUrl, setSelectedProductImageUrl] = useState<string>("");
  const [galleryCategory, setGalleryCategory] = useState<string>("burger");

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

  // Atualizar textos automaticamente quando mudar o modo
  useEffect(() => {
    if (campaignMode === "CATEGORY" && selectedCategory) {
      const catName = selectedCategory.name.toUpperCase();
      setTagText(`🔥 PROMOÇÃO EM ${catName}`);
      setHeadline(`TODOS OS ${catName} COM ${discountPercent}% OFF`);
      setSubtitle(`Peça agora e aproveite os melhores ${selectedCategory.name.toLowerCase()} preparados com carinho!`);
      setBadgeText(`${discountPercent}% OFF`);

      // Escolher a foto do primeiro produto que tiver imagem
      const prodWithImg = selectedCategory.products?.find((p) => p.imageUrl);
      if (prodWithImg?.imageUrl) {
        setSelectedProductImageUrl(prodWithImg.imageUrl);
      }
    } else if (campaignMode === "PRODUCT" && selectedProduct) {
      const prodName = selectedProduct.name.toUpperCase();
      const originalPrice = selectedProduct.price || 0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);

      setTagText("⚡ DESTAQUE DO CARDÁPIO");
      setHeadline(`${prodName}`);
      setSubtitle(selectedProduct.description || "Sabor inconfundível preparado com ingredientes selecionados e entrega rápida.");
      setBadgeText(
        discountPercent > 0
          ? `${discountPercent}% OFF • R$ ${discountedPrice.toFixed(2).replace(".", ",")}`
          : `R$ ${originalPrice.toFixed(2).replace(".", ",")}`,
      );
      if (selectedProduct.imageUrl) {
        setSelectedProductImageUrl(selectedProduct.imageUrl);
      }
    }
  }, [campaignMode, selectedCategory, selectedProduct, discountPercent]);

  // Aplicar Preset Sazonal
  const handleApplyPreset = (preset: SeasonalPreset) => {
    setTagText(preset.tag);
    setHeadline(preset.headline);
    setSubtitle(preset.subtitle);
    setBadgeText(preset.badge);
    setThemeStyle(preset.theme);
    setLayoutStyle(preset.layout);
    setDiscountPercent(preset.suggestedDiscount);
    setCustomImageUrl(preset.fallbackImage);
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
          productId: campaignMode === "PRODUCT" ? selectedProductId : undefined,
          categoryId: campaignMode === "CATEGORY" ? selectedCategoryId : undefined,
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
            setCustomImageUrl(result.suggestedImageUrl);
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

  // Imagem ativa para o banner
  const activeBannerImage = useMemo(() => {
    if (customImageUrl.trim()) return customImageUrl.trim();
    if (selectedProductImageUrl) return selectedProductImageUrl;
    if (campaignMode === "PRODUCT" && selectedProduct?.imageUrl) return selectedProduct.imageUrl;
    if (campaignMode === "CATEGORY") {
      const p = selectedCategory?.products?.find((item) => item.imageUrl);
      if (p?.imageUrl) return p.imageUrl;
    }
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80";
  }, [customImageUrl, selectedProductImageUrl, campaignMode, selectedProduct, selectedCategory]);

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

      // 2. Carregar Imagem com crossOrigin
      let loadedImage: HTMLImageElement | null = null;
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          img.onload = () => {
            loadedImage = img;
            resolve(true);
          };
          img.onerror = () => resolve(false);
          img.src = activeBannerImage;
        });
      } catch (e) {
        console.warn("Falha ao carregar imagem para canvas:", e);
      }

      // ========================================================
      // COMPOSIÇÃO 16:9 (Paisagem Web / Facebook / Banner Horizontal)
      // LAYOUT HORIZONTAL 2-COLUNAS: TEXTOS À ESQUERDA, FOTO À DIREITA
      // ========================================================
      if (aspectRatio === "16:9") {
        // Coluna Direita: Imagem de Destaque
        const imgX = 640;
        const imgY = 60;
        const imgW = 490;
        const imgH = 555;

        if (loadedImage) {
          drawImageCover(ctx, loadedImage, imgX, imgY, imgW, imgH, 28);
          // Borda decorativa
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgW, imgH, 28);
          ctx.stroke();
        }

        // Coluna Esquerda: Textos, Selos e CTA
        const leftX = 70;
        const maxTextW = 530;

        // Selo / Tag Superior
        ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(tagText.toUpperCase(), leftX, 90);

        // Logo e Nome do Restaurante
        if (showLogo) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = "bold 28px sans-serif";
          ctx.fillText(restaurantName, leftX, 135);
        }

        // Badge de Desconto / Preço
        let contentStartY = 200;
        if (showBadge && badgeText) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#e11d48" : themeClasses.accentColor;
          ctx.beginPath();
          ctx.roundRect(leftX, contentStartY - 32, 230, 44, 22);
          ctx.fill();

          ctx.fillStyle = themeStyle === "gold-luxury" ? "#000000" : "#ffffff";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText(badgeText, leftX + 18, contentStartY - 3);
          contentStartY += 60;
        }

        // Headline Principal (com quebra de linha elegante)
        ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
        ctx.font = "bold 38px sans-serif";
        const afterHeadlineY = renderWrappedText(
          ctx,
          headline,
          leftX,
          contentStartY,
          maxTextW,
          46,
          2,
        );

        // Subtítulo
        ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
        ctx.font = "normal 20px sans-serif";
        renderWrappedText(
          ctx,
          subtitle,
          leftX,
          afterHeadlineY + 12,
          maxTextW,
          28,
          2,
        );

        // CTA Rodapé
        if (showCta) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 20px sans-serif";
          ctx.fillText(ctaText, leftX, 580);
        }
      }

      // ========================================================
      // COMPOSIÇÃO 1:1 (Feed Quadrado Instagram)
      // LAYOUT VERTICAL BALANCEADO SEM CORTES
      // ========================================================
      else if (aspectRatio === "1:1") {
        const paddingX = 90;
        const contentW = width - paddingX * 2;

        // Topo: Tag e Nome do Restaurante
        ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(tagText.toUpperCase(), paddingX, 85);

        if (showLogo) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = "bold 30px sans-serif";
          ctx.fillText(restaurantName, paddingX, 130);
        }

        // Imagem Central
        const imgY = 175;
        const imgH = 460;
        if (loadedImage) {
          drawImageCover(ctx, loadedImage, paddingX, imgY, contentW, imgH, 26);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(paddingX, imgY, contentW, imgH, 26);
          ctx.stroke();
        }

        // Badge Flutuante ou no Bloco Inferior
        let textStartY = 705;
        if (showBadge && badgeText) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#e11d48" : themeClasses.accentColor;
          ctx.beginPath();
          ctx.roundRect(paddingX, textStartY - 34, 240, 46, 23);
          ctx.fill();

          ctx.fillStyle = themeStyle === "gold-luxury" ? "#000000" : "#ffffff";
          ctx.font = "bold 22px sans-serif";
          ctx.fillText(badgeText, paddingX + 20, textStartY - 3);
          textStartY += 60;
        }

        // Headline Principal
        ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
        ctx.font = "bold 40px sans-serif";
        const afterHeadlineY = renderWrappedText(
          ctx,
          headline,
          paddingX,
          textStartY,
          contentW,
          48,
          2,
        );

        // Subtítulo
        ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
        ctx.font = "normal 22px sans-serif";
        renderWrappedText(
          ctx,
          subtitle,
          paddingX,
          afterHeadlineY + 12,
          contentW,
          30,
          2,
        );

        // CTA Rodapé
        if (showCta) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 22px sans-serif";
          ctx.fillText(ctaText, paddingX, 1000);
        }
      }

      // ========================================================
      // COMPOSIÇÃO 9:16 (Stories & Status 1080 x 1920)
      // LAYOUT VERTICAL MOBILE COM MARGENS SEGURAS
      // ========================================================
      else {
        const paddingX = 90;
        const contentW = width - paddingX * 2;

        // Top Safe Area (Instagram UI)
        ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText(tagText.toUpperCase(), paddingX, 220);

        if (showLogo) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
          ctx.font = "bold 36px sans-serif";
          ctx.fillText(restaurantName, paddingX, 275);
        }

        // Imagem Central Grande
        const imgY = 340;
        const imgH = 860;
        if (loadedImage) {
          drawImageCover(ctx, loadedImage, paddingX, imgY, contentW, imgH, 36);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(paddingX, imgY, contentW, imgH, 36);
          ctx.stroke();
        }

        // Badge de Destaque
        let textStartY = 1290;
        if (showBadge && badgeText) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#e11d48" : themeClasses.accentColor;
          ctx.beginPath();
          ctx.roundRect(paddingX, textStartY - 46, 300, 58, 29);
          ctx.fill();

          ctx.fillStyle = themeStyle === "gold-luxury" ? "#000000" : "#ffffff";
          ctx.font = "bold 28px sans-serif";
          ctx.fillText(badgeText, paddingX + 26, textStartY - 7);
          textStartY += 80;
        }

        // Headline Principal Grande
        ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
        ctx.font = "bold 56px sans-serif";
        const afterHeadlineY = renderWrappedText(
          ctx,
          headline,
          paddingX,
          textStartY,
          contentW,
          68,
          2,
        );

        // Subtítulo
        ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
        ctx.font = "normal 30px sans-serif";
        renderWrappedText(
          ctx,
          subtitle,
          paddingX,
          afterHeadlineY + 20,
          contentW,
          42,
          2,
        );

        // CTA Rodapé Safe
        if (showCta) {
          ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
          ctx.font = "bold 28px sans-serif";
          ctx.fillText(ctaText, paddingX, 1750);
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

          {/* 3. Galeria de Imagens em Alta Resolução */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ImageIcon size={14} />
                <span>Banco de Imagens em Alta Definição</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "burger", label: "🍔 Burgers" },
                  { id: "pizza", label: "🍕 Pizzas" },
                  { id: "sushi", label: "🍣 Sushi & Poke" },
                  { id: "meat", label: "🥩 Carnes" },
                  { id: "dessert", label: "🍰 Doces & Açaí" },
                  { id: "drinks", label: "🍹 Bebidas" },
                  { id: "pasta", label: "🍝 Massas" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setGalleryCategory(cat.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap",
                      galleryCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid de Fotos em Alta Resolução */}
              <div className="grid grid-cols-4 gap-2">
                {CURATED_FOOD_GALLERY.filter((img) => img.category === galleryCategory).map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      setCustomImageUrl(img.url);
                      setSelectedProductImageUrl("");
                    }}
                    className={cn(
                      "group relative h-16 overflow-hidden rounded-xl border-2 transition-all",
                      activeBannerImage === img.url
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-slate-200 hover:border-slate-400",
                    )}
                    title={img.title}
                  >
                    <Image
                      src={img.url}
                      alt={img.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ))}
              </div>

              {/* Fotos dos Produtos do Próprio Cardápio */}
              {selectedCategory?.products && selectedCategory.products.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500">
                    Ou use fotos dos seus produtos cadastrados:
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedCategory.products
                      .filter((p) => p.imageUrl)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductImageUrl(p.imageUrl || "");
                            setCustomImageUrl("");
                          }}
                          className={cn(
                            "group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                            activeBannerImage === p.imageUrl
                              ? "border-primary ring-2 ring-primary/40"
                              : "border-slate-200 hover:border-slate-400",
                          )}
                          title={p.name}
                        >
                          <Image
                            src={p.imageUrl || ""}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* URL Customizada */}
              <div className="space-y-1 pt-1">
                <Label htmlFor="customImageUrl" className="text-[11px] font-semibold text-slate-500">
                  Ou cole um link de foto externa:
                </Label>
                <Input
                  id="customImageUrl"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="h-8 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Textos e Chamadas da Arte */}
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
                  {/* Ambient Glow */}
                  <div
                    className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full blur-2xl opacity-35"
                    style={{ backgroundColor: themeClasses.accentColor }}
                  />

                  {/* Coluna Esquerda: Textos, Selo, Logo, CTA */}
                  <div className="relative z-10 flex-1 flex flex-col justify-between min-w-0 pr-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase truncate",
                            themeClasses.tagBg,
                          )}
                        >
                          {tagText}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 truncate">
                          {socialHandle}
                        </span>
                      </div>

                      {showLogo && (
                        <div className="flex items-center gap-1.5">
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
                    <div className="space-y-1 my-auto">
                      {showBadge && badgeText && (
                        <div className="inline-flex mb-1">
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
                          "font-display font-extrabold uppercase tracking-tight leading-tight line-clamp-2 text-sm sm:text-base",
                          layoutStyle === "bold-promo" && "text-base sm:text-lg tracking-normal font-black",
                          themeClasses.titleColor,
                        )}
                      >
                        {headline}
                      </h3>

                      <p
                        className={cn(
                          "text-[10px] line-clamp-2 leading-snug font-medium",
                          themeClasses.subColor,
                        )}
                      >
                        {subtitle}
                      </p>
                    </div>

                    {/* CTA Inferior */}
                    {showCta && (
                      <div className="pt-1.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] font-bold">
                        <ShoppingBagIcon size={12} style={{ color: themeClasses.accentColor }} />
                        <span className="truncate" style={{ color: themeClasses.accentColor }}>
                          {ctaText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Coluna Direita: Foto Principal com Borda Estilosa */}
                  <div className="relative z-10 w-[42%] shrink-0 flex items-center justify-center">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20 shadow-xl group">
                      <Image
                        src={activeBannerImage}
                        alt="Foto do Prato"
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
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

                  {/* Efeito Glow / Iluminação Ambiente */}
                  <div
                    className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full blur-3xl opacity-30"
                    style={{ backgroundColor: themeClasses.accentColor }}
                  />

                  {/* ── Topo do Banner: Logo + Selo ─────────────── */}
                  <div className="relative z-10 flex items-start justify-between gap-2 shrink-0">
                    <div className="flex flex-col gap-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase",
                          themeClasses.tagBg,
                        )}
                      >
                        <span>{tagText}</span>
                      </span>

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

                    <div className="text-right">
                      <span className="text-[9px] font-semibold tracking-wider uppercase text-slate-400">
                        {socialHandle}
                      </span>
                    </div>
                  </div>

                  {/* ── Centro do Banner: Imagem do Produto em Destaque ── */}
                  <div className="relative z-10 my-auto flex items-center justify-center py-2 shrink-0">
                    <div
                      className={cn(
                        "relative w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl group",
                        aspectRatio === "1:1" ? "h-[160px] sm:h-[180px] max-w-[92%]" : "h-[220px] sm:h-[260px] max-w-[95%]",
                      )}
                    >
                      <Image
                        src={activeBannerImage}
                        alt="Banner Promocional"
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* ── Base do Banner: Título, Descrição e CTA ─── */}
                  <div className="relative z-10 space-y-1.5 pt-1 shrink-0">
                    {showBadge && badgeText && (
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
                        aspectRatio === "9:16" ? "text-lg sm:text-xl" : "text-base sm:text-lg",
                        layoutStyle === "bold-promo" && "font-black tracking-normal text-lg sm:text-xl",
                        themeClasses.titleColor,
                      )}
                    >
                      {headline}
                    </h3>

                    <p
                      className={cn(
                        "text-[11px] line-clamp-2 leading-relaxed font-medium",
                        themeClasses.subColor,
                      )}
                    >
                      {subtitle}
                    </p>

                    {showCta && (
                      <div className="pt-2 flex items-center justify-between border-t border-white/10 text-[10px] sm:text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 truncate" style={{ color: themeClasses.accentColor }}>
                          <ShoppingBagIcon size={13} />
                          <span className="truncate">{ctaText}</span>
                        </span>
                        <span className="text-slate-400 shrink-0">{socialHandle}</span>
                      </div>
                    )}
                  </div>
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
