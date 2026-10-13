"use client";

import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  FlameIcon,
  HeartIcon,
  ImageIcon,
  InstagramIcon,
  LayersIcon,
  MessageCircleIcon,
  PaletteIcon,
  PercentIcon,
  RefreshCwIcon,
  Share2Icon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  TvIcon,
  UtensilsCrossedIcon,
  Wand2Icon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type AspectRatioMode = "1:1" | "9:16" | "16:9";
type CampaignMode = "CATEGORY" | "PRODUCT" | "SEASONAL" | "CUSTOM";
type ThemeStyle = "dark-gourmet" | "vibrant-red" | "romantic" | "clean-white" | "neon-night";

interface SeasonalPreset {
  id: string;
  name: string;
  tag: string;
  headline: string;
  subtitle: string;
  badge: string;
  theme: ThemeStyle;
  suggestedDiscount: number;
  fallbackImage: string;
}

const SEASONAL_PRESETS: SeasonalPreset[] = [
  {
    id: "namorados",
    name: "Dia dos Namorados",
    tag: "❤️ ESPECIAL DIA DOS NAMORADOS",
    headline: "O AMOR TEM SABOR",
    subtitle: "Celebre momentos inesquecíveis a dois com nosso menu especial para casais.",
    badge: "COMBO CASAL",
    theme: "romantic",
    suggestedDiscount: 15,
    fallbackImage: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "combos10",
    name: "Todos os Combos 10% OFF",
    tag: "⚡ SÓ HOJE",
    headline: "TODOS OS COMBOS COM 10% OFF",
    subtitle: "Aproveite a nossa seleção especial de combos com desconto imperdível hoje!",
    badge: "10% DE DESCONTO",
    theme: "dark-gourmet",
    suggestedDiscount: 10,
    fallbackImage: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "sextou",
    name: "Sextou / Fim de Semana",
    tag: "🔥 SEXTOU COM PROMOÇÃO",
    headline: "SEU FIM DE SEMANA PEDE",
    subtitle: "Peça pelo nosso cardápio digital e receba rápido no conforto da sua casa.",
    badge: "OFERTA DO DIA",
    theme: "vibrant-red",
    suggestedDiscount: 10,
    fallbackImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "quarta-burger",
    name: "Quarta do Hambúrguer",
    tag: "🍔 QUARTA DO BURGER",
    headline: "FESTIVAL DE SMASH & ARTESANAL",
    subtitle: "Burgers suculentos com blend especial e fritas crocantes com preço exclusivo.",
    badge: "SUPER PREÇO",
    theme: "neon-night",
    suggestedDiscount: 20,
    fallbackImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "frete-gratis",
    name: "Frete Grátis Especial",
    tag: "🚚 FRETE GRÁTIS HOJE",
    headline: "ENTREGA POR NOSSA CONTA",
    subtitle: "Faça seu pedido agora pelo cardápio oficial e não pague nada na entrega!",
    badge: "FRETE ZERO",
    theme: "clean-white",
    suggestedDiscount: 0,
    fallbackImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80",
  },
];

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

  // Estilo Visual
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>("dark-gourmet");

  // Imagem
  const [customImageUrl, setCustomImageUrl] = useState<string>("");
  const [selectedProductImageUrl, setSelectedProductImageUrl] = useState<string>("");

  // Toggles Visuais
  const [showLogo, setShowLogo] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showCta, setShowCta] = useState(true);

  // Referência do Canvas Oculto para Exportação em Alta Resolução
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Atualizar textos automaticamente quando mudar o modo
  useEffect(() => {
    if (campaignMode === "CATEGORY" && selectedCategory) {
      const catName = selectedCategory.name.toUpperCase();
      setTagText(`🔥 PROMOÇÃO NA CATEGORIA ${catName}`);
      setHeadline(`TODOS OS ${catName} POR ${discountPercent}% OFF HOJE`);
      setSubtitle(`Peça agora e aproveite os melhores ${selectedCategory.name.toLowerCase()} com desconto imperdível!`);
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
      setSubtitle(selectedProduct.description || "Sabor inconfundível preparado com ingredientes selecionados.");
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
    setDiscountPercent(preset.suggestedDiscount);
    setCustomImageUrl(preset.fallbackImage);
    toast.success(`Tema "${preset.name}" aplicado com sucesso!`);
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
          gradient: "from-slate-950 via-slate-900/90 to-amber-950/40",
          accentColor: "#f59e0b",
          tagBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          badgeBg: "bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-amber-500/30",
          titleColor: "text-white",
          subColor: "text-slate-300",
          border: "border-amber-500/30",
        };
      case "vibrant-red":
        return {
          bg: "bg-red-950",
          gradient: "from-red-950 via-red-900/90 to-amber-900/40",
          accentColor: "#ef4444",
          tagBg: "bg-red-500/20 text-red-200 border-red-500/40",
          badgeBg: "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-red-500/30",
          titleColor: "text-white",
          subColor: "text-red-100",
          border: "border-red-500/30",
        };
      case "romantic":
        return {
          bg: "bg-[#2b0817]",
          gradient: "from-[#2b0817] via-[#4a0d26]/90 to-[#801438]/50",
          accentColor: "#f43f5e",
          tagBg: "bg-rose-500/20 text-rose-200 border-rose-500/40",
          badgeBg: "bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-rose-500/30",
          titleColor: "text-rose-50",
          subColor: "text-rose-200",
          border: "border-rose-500/30",
        };
      case "neon-night":
        return {
          bg: "bg-[#0b0c16]",
          gradient: "from-[#0b0c16] via-[#1a1233]/90 to-[#3b0764]/40",
          accentColor: "#a855f7",
          tagBg: "bg-purple-500/20 text-purple-200 border-purple-500/40",
          badgeBg: "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-purple-500/30",
          titleColor: "text-white",
          subColor: "text-purple-200",
          border: "border-purple-500/30",
        };
      case "clean-white":
        return {
          bg: "bg-white",
          gradient: "from-white via-slate-50 to-slate-100",
          accentColor: "#e11d48",
          tagBg: "bg-red-50 text-red-700 border-red-200",
          badgeBg: "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-500/20",
          titleColor: "text-slate-900",
          subColor: "text-slate-600",
          border: "border-slate-200",
        };
    }
  }, [themeStyle]);

  // Legenda Pronta para Redes Sociais (Copywriting IA)
  const socialCaption = useMemo(() => {
    return `🔥 ${tagText.replace(/^[^\w\s]+/, "").trim()}!

${headline}

${subtitle}

${showBadge && badgeText ? `✨ Destaque: ${badgeText}\n` : ""}🛵 Peça direto pelo nosso cardápio digital ou clique no link da bio!
👉 Acesse agora: ${socialHandle}

#delivery #gastronomia #${slug} #promocao #combos #restaurante #foodporn #delicia`;
  }, [tagText, headline, subtitle, showBadge, badgeText, socialHandle, slug]);

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(socialCaption);
    setCopiedCaption(true);
    toast.success("Legenda copiada! Cole direto no Instagram ou WhatsApp.");
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  // ── Renderização e Download em Alta Resolução (Canvas 2D) ──
  const handleDownloadBanner = async () => {
    setIsExporting(true);
    try {
      // Dimensões do Canvas baseadas no formato escolhido
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

      // 1. Fundo Gradiente
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (themeStyle === "dark-gourmet") {
        bgGrad.addColorStop(0, "#020617");
        bgGrad.addColorStop(0.5, "#0f172a");
        bgGrad.addColorStop(1, "#451a03");
      } else if (themeStyle === "vibrant-red") {
        bgGrad.addColorStop(0, "#450a0a");
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
      } else {
        bgGrad.addColorStop(0, "#ffffff");
        bgGrad.addColorStop(1, "#f1f5f9");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Carregar Imagem Principal do Produto com Efeito
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = resolve; // Não quebra se falhar imagem externa
          img.src = activeBannerImage;
        });

        if (img.width > 0) {
          ctx.save();
          // Posição central / fundo
          const imgH = height * (aspectRatio === "9:16" ? 0.48 : 0.52);
          const imgY = aspectRatio === "9:16" ? height * 0.28 : height * 0.25;

          // Desenhar imagem com corte elegante
          ctx.beginPath();
          ctx.roundRect(width * 0.08, imgY, width * 0.84, imgH, 32);
          ctx.clip();
          ctx.drawImage(img, width * 0.08, imgY, width * 0.84, imgH);
          ctx.restore();

          // Sombra interna e borda decorativa da imagem
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(width * 0.08, imgY, width * 0.84, imgH, 32);
          ctx.stroke();
        }
      } catch (e) {
        console.warn("Falha ao desenhar imagem externa:", e);
      }

      // 3. Textos do Topo (Logo + Selo)
      ctx.save();
      // Selo / Tag
      const tagY = height * 0.08;
      ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(tagText.toUpperCase(), width * 0.08, tagY);

      // Nome do Restaurante
      if (showLogo) {
        ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText(restaurantName, width * 0.08, tagY + 44);
      }
      ctx.restore();

      // 4. Headline Principal e Subtítulo (Parte Inferior)
      ctx.save();
      const textStartY = aspectRatio === "9:16" ? height * 0.80 : height * 0.82;

      // Badge de Desconto / Preço
      if (showBadge && badgeText) {
        ctx.fillStyle = themeStyle === "clean-white" ? "#e11d48" : "#f59e0b";
        ctx.beginPath();
        ctx.roundRect(width * 0.08, textStartY - 50, 260, 48, 24);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(badgeText, width * 0.12, textStartY - 18);
      }

      // Título
      ctx.fillStyle = themeStyle === "clean-white" ? "#0f172a" : "#ffffff";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(headline.slice(0, 38), width * 0.08, textStartY + 30);

      // Subtítulo
      ctx.fillStyle = themeStyle === "clean-white" ? "#475569" : "#cbd5e1";
      ctx.font = "normal 24px sans-serif";
      ctx.fillText(subtitle.slice(0, 60), width * 0.08, textStartY + 75);

      // CTA Rodapé
      if (showCta) {
        ctx.fillStyle = themeStyle === "clean-white" ? "#dc2626" : themeClasses.accentColor;
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(ctaText, width * 0.08, textStartY + 120);
      }
      ctx.restore();

      // 5. Download do Arquivo
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `banner-${slug}-${aspectRatio.replace(":", "x")}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Banner baixado com sucesso em alta definição!");
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
              Crie artes promocionais profissionais para Instagram, Stories e WhatsApp integradas aos seus produtos e combos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* ── Presets Rápidos / Sugestões Prontas ──────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap pl-1">
          Modelos Prontos:
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

          {/* 2. Tipo de Campanha & Seleção de Produtos / Combos */}
          <Card className="border-slate-200/80 bg-white shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TagIcon size={14} />
                <span>Tipo de Campanha e Produtos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
              {/* Seleção do Modo */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setCampaignMode("CATEGORY")}
                  className={cn(
                    "rounded-xl border p-2 text-center text-xs font-semibold transition-all",
                    campaignMode === "CATEGORY"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  Categoria / Combos
                </button>
                <button
                  type="button"
                  onClick={() => setCampaignMode("PRODUCT")}
                  className={cn(
                    "rounded-xl border p-2 text-center text-xs font-semibold transition-all",
                    campaignMode === "PRODUCT"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  Item Específico
                </button>
                <button
                  type="button"
                  onClick={() => setCampaignMode("SEASONAL")}
                  className={cn(
                    "rounded-xl border p-2 text-center text-xs font-semibold transition-all",
                    campaignMode === "SEASONAL"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  Data Comemorativa
                </button>
                <button
                  type="button"
                  onClick={() => setCampaignMode("CUSTOM")}
                  className={cn(
                    "rounded-xl border p-2 text-center text-xs font-semibold transition-all",
                    campaignMode === "CUSTOM"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  Personalizado
                </button>
              </div>

              {/* Se for Categoria */}
              {campaignMode === "CATEGORY" && (
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Selecione a Categoria Promocional
                    </Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                        <SelectValue placeholder="Selecione a categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {menuCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.products?.length || 0} itens cadastrados)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fotos disponíveis da categoria para destaque */}
                  {selectedCategory?.products && selectedCategory.products.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-500">
                        Selecione a foto de destaque da categoria:
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
                                "group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                                activeBannerImage === p.imageUrl
                                  ? "border-primary ring-2 ring-primary/30"
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
                </div>
              )}

              {/* Se for Produto Específico */}
              {campaignMode === "PRODUCT" && (
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Selecione o Produto do Cardápio
                    </Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs">
                        <SelectValue placeholder="Selecione um produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — R$ {p.price.toFixed(2).replace(".", ",")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Se for Data Comemorativa */}
              {campaignMode === "SEASONAL" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
                  {SEASONAL_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <CalendarIcon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-800">{p.name}</p>
                        <p className="truncate text-[10px] text-slate-400">{p.badge}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Ajuste de Desconto Rápido (%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Porcentagem de Desconto:</span>
                  <span className="font-bold text-primary">{discountPercent}% OFF</span>
                </div>
                <div className="flex gap-2">
                  {[0, 5, 10, 15, 20, 25, 30, 50].map((d) => (
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
            </CardContent>
          </Card>

          {/* 3. Textos e Conteúdo Personalizável */}
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

              {/* URL da Imagem Customizada */}
              <div className="space-y-1 pt-1">
                <Label htmlFor="customImageUrl" className="text-xs font-semibold text-slate-700">
                  URL de Imagem Personalizada (Opcional)
                </Label>
                <Input
                  id="customImageUrl"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-9 rounded-xl border-slate-200 text-xs"
                />
              </div>

              {/* Estilo Visual do Banner */}
              <div className="space-y-1 pt-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Estilo e Tema Visual do Banner
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => setThemeStyle("dark-gourmet")}
                    className={cn(
                      "rounded-xl border p-2 text-center text-xs font-bold transition-all",
                      themeStyle === "dark-gourmet"
                        ? "border-amber-500 bg-slate-900 text-amber-400 ring-2 ring-amber-500/30"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Dark Gourmet
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeStyle("vibrant-red")}
                    className={cn(
                      "rounded-xl border p-2 text-center text-xs font-bold transition-all",
                      themeStyle === "vibrant-red"
                        ? "border-red-500 bg-red-950 text-red-200 ring-2 ring-red-500/30"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Vibrant Red
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeStyle("romantic")}
                    className={cn(
                      "rounded-xl border p-2 text-center text-xs font-bold transition-all",
                      themeStyle === "romantic"
                        ? "border-pink-500 bg-[#2b0817] text-pink-200 ring-2 ring-pink-500/30"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Romântico
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeStyle("neon-night")}
                    className={cn(
                      "rounded-xl border p-2 text-center text-xs font-bold transition-all",
                      themeStyle === "neon-night"
                        ? "border-purple-500 bg-[#0b0c16] text-purple-200 ring-2 ring-purple-500/30"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Neon Night
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeStyle("clean-white")}
                    className={cn(
                      "rounded-xl border p-2 text-center text-xs font-bold transition-all",
                      themeStyle === "clean-white"
                        ? "border-slate-900 bg-white text-slate-900 ring-2 ring-slate-900/20"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Clean White
                  </button>
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
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Pré-visualização do Banner ({aspectRatio})
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

            {/* Container do Banner Renderizado */}
            <div className="flex items-center justify-center p-4 sm:p-6 bg-slate-950/80">
              <div
                className={cn(
                  "relative overflow-hidden rounded-3xl border shadow-2xl transition-all duration-300 flex flex-col justify-between p-6 sm:p-8",
                  themeClasses.bg,
                  themeClasses.border,
                  aspectRatio === "1:1" && "w-full max-w-[460px] aspect-square",
                  aspectRatio === "9:16" && "w-full max-w-[360px] aspect-[9/16]",
                  aspectRatio === "16:9" && "w-full max-w-[560px] aspect-[16/9]",
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
                  className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-30"
                  style={{ backgroundColor: themeClasses.accentColor }}
                />

                {/* ── Topo do Banner: Logo + Selo ─────────────── */}
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase",
                        themeClasses.tagBg,
                      )}
                    >
                      <span>{tagText}</span>
                    </span>

                    {showLogo && (
                      <div className="flex items-center gap-2 mt-2">
                        {restaurantLogo ? (
                          <div className="h-8 w-8 rounded-full overflow-hidden border border-white/20 bg-white/10 shrink-0">
                            <Image
                              src={restaurantLogo}
                              alt={restaurantName}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {restaurantName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={cn("text-xs font-bold tracking-tight", themeClasses.titleColor)}>
                          {restaurantName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tag Lateral Superior se houver */}
                  <div className="text-right">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                      {socialHandle}
                    </span>
                  </div>
                </div>

                {/* ── Centro do Banner: Imagem do Produto em Destaque ── */}
                <div className="relative z-10 my-auto flex items-center justify-center py-2">
                  <div className="relative w-full max-w-[85%] aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl group">
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
                <div className="relative z-10 space-y-2 pt-2">
                  {showBadge && badgeText && (
                    <div className="inline-flex">
                      <span
                        className={cn(
                          "rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-md",
                          themeClasses.badgeBg,
                        )}
                      >
                        {badgeText}
                      </span>
                    </div>
                  )}

                  <h3
                    className={cn(
                      "font-display font-extrabold uppercase tracking-tight leading-tight",
                      aspectRatio === "9:16" ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
                      themeClasses.titleColor,
                    )}
                  >
                    {headline}
                  </h3>

                  <p
                    className={cn(
                      "text-xs line-clamp-2 leading-relaxed font-medium",
                      themeClasses.subColor,
                    )}
                  >
                    {subtitle}
                  </p>

                  {showCta && (
                    <div className="pt-2 flex items-center justify-between border-t border-white/10 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5" style={{ color: themeClasses.accentColor }}>
                        <ShoppingBagIcon size={13} />
                        <span>{ctaText}</span>
                      </span>
                      <span className="text-slate-400">{socialHandle}</span>
                    </div>
                  )}
                </div>
              </div>
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
                💡 Dica: Clique em &quot;Copiar Legenda&quot;, publique a imagem baixada no Instagram Feed ou Stories e cole o texto acima.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
