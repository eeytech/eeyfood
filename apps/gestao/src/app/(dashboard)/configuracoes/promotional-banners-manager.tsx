"use client";

import type { PromotionalBannerItem } from "@fsw/db";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  CheckCircle2Icon,
  CoinsIcon,
  ExternalLinkIcon,
  FlameIcon,
  ImageIcon,
  LayersIcon,
  LinkIcon,
  PaletteIcon,
  PencilIcon,
  PercentIcon,
  PlusIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
  TruckIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface MenuProductSimple {
  id: string;
  name: string;
  imageUrl?: string | null;
  price?: number | null;
}

export interface MenuCategorySimple {
  id: string;
  name: string;
  imageUrl?: string | null;
  products?: MenuProductSimple[];
}

interface PromotionalBannersManagerProps {
  showPromotionalBanners: boolean;
  onToggleShow: (val: boolean) => void;
  banners: PromotionalBannerItem[];
  onBannersChange: (banners: PromotionalBannerItem[]) => void;
  isCashbackEnabled?: boolean;
  isCouponsEnabled?: boolean;
  isDeliveryEnabled?: boolean;
  menuCategories?: MenuCategorySimple[];
  disabled?: boolean;
}

const GRADIENT_OPTIONS: Array<{
  id: string;
  label: string;
  classes: string;
}> = [
  {
    id: "primary",
    label: "Padrão da Loja",
    classes: "from-primary via-rose-600 to-amber-600",
  },
  {
    id: "rose",
    label: "Rosa / Carmim",
    classes: "from-rose-600 via-pink-600 to-red-600",
  },
  {
    id: "amber",
    label: "Âmbar / Dourado",
    classes: "from-amber-600 via-amber-500 to-orange-500",
  },
  {
    id: "emerald",
    label: "Verde Esmeralda",
    classes: "from-emerald-600 via-teal-600 to-emerald-700",
  },
  {
    id: "violet",
    label: "Roxo / Violeta",
    classes: "from-violet-700 via-purple-600 to-indigo-600",
  },
  {
    id: "blue",
    label: "Azul Elétrico",
    classes: "from-blue-600 via-sky-600 to-indigo-700",
  },
  {
    id: "dark",
    label: "Escuro / Premium",
    classes: "from-slate-900 via-slate-800 to-zinc-900",
  },
];

const PRESET_MODELS = [
  {
    id: "pizza-promo",
    title: "TODAS AS PIZZAS COM 20% OFF",
    subtitle: "Aproveite nossa seleção especial assada no forno a lenha com desconto imperdível!",
    tag: "🔥 20% OFF",
    gradient: "rose",
    buttonText: "Ver Pizzas",
    align: "left" as const,
    textColor: "white" as const,
    categoryKeyword: "pizza",
    discount: 20,
    icon: "🍕",
    label: "Festival da Pizza (-20%)",
  },
  {
    id: "combos-promo",
    title: "COMBOS EM OFERTA ESPECIAL",
    subtitle: "Peça seu combo completo com lanche, acompanhamento e bebida e economize muito mais!",
    tag: "🍔 COMBO DO DIA",
    gradient: "amber",
    buttonText: "Pedir Combo",
    align: "left" as const,
    textColor: "white" as const,
    categoryKeyword: "combo",
    discount: 15,
    icon: "🍔",
    label: "Combos & Ofertas",
  },
  {
    id: "coupons-promo",
    title: "USE O CUPOM E ECONOMIZE MAIS",
    subtitle: "Insira seu código promocional direto no carrinho e garanta seu desconto exclusivo hoje!",
    tag: "🏷️ CUPOM ATIVO",
    gradient: "violet",
    buttonText: "Aproveitar Desconto",
    align: "center" as const,
    textColor: "white" as const,
    categoryKeyword: "",
    discount: 10,
    icon: "🎟️",
    label: "Cupons de Desconto",
  },
  {
    id: "frete-promo",
    title: "FRETE GRÁTIS EM TODO O CARDÁPIO",
    subtitle: "Peça agora seus pratos e bebidas favoritos e a entrega é 100% por nossa conta!",
    tag: "🚚 FRETE ZERO",
    gradient: "emerald",
    buttonText: "Pedir Agora",
    align: "center" as const,
    textColor: "white" as const,
    categoryKeyword: "",
    discount: 0,
    icon: "🚚",
    label: "Frete Grátis Delivery",
  },
  {
    id: "cashback-promo",
    title: "CASHBACK TURBINADO NA LOJA",
    subtitle: "Receba dinheiro de volta na sua carteira digital para usar em novos pedidos!",
    tag: "💰 CASHBACK",
    gradient: "amber",
    buttonText: "Ver Cardápio",
    align: "left" as const,
    textColor: "white" as const,
    categoryKeyword: "",
    discount: 10,
    icon: "💰",
    label: "Cashback Especial",
  },
  {
    id: "flash-promo",
    title: "OFERTA RELÂMPAGO DO DIA",
    subtitle: "Desconto especial válido somente para pedidos realizados hoje até o final do expediente!",
    tag: "⚡ SÓ HOJE",
    gradient: "primary",
    buttonText: "Garantir Oferta",
    align: "left" as const,
    textColor: "white" as const,
    categoryKeyword: "",
    discount: 25,
    icon: "⚡",
    label: "Oferta Relâmpago",
  },
];

export function PromotionalBannersManager({
  showPromotionalBanners,
  onToggleShow,
  banners,
  onBannersChange,
  isCashbackEnabled = true,
  isCouponsEnabled = true,
  isDeliveryEnabled = true,
  menuCategories = [],
  disabled = false,
}: PromotionalBannersManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newTag, setNewTag] = useState("PROMOÇÃO");
  const [newGradient, setNewGradient] = useState("primary");
  const [newButtonText, setNewButtonText] = useState("Aproveitar");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newTextColor, setNewTextColor] = useState<"white" | "dark" | "amber">("white");
  const [newAlign, setNewAlign] = useState<"left" | "center">("left");
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [newDiscountPercent, setNewDiscountPercent] = useState<string>("");
  const [imageTab, setImageTab] = useState<"upload" | "menu" | "url">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista plana de produtos do cardápio com foto para escolha rápida
  const productsWithImages = useMemo(() => {
    const list: Array<{
      productId: string;
      productName: string;
      imageUrl: string;
      categoryName: string;
      categoryId: string;
    }> = [];

    for (const cat of menuCategories) {
      if (cat.products) {
        for (const prod of cat.products) {
          if (prod.imageUrl) {
            list.push({
              productId: prod.id,
              productName: prod.name,
              imageUrl: prod.imageUrl,
              categoryName: cat.name,
              categoryId: cat.id,
            });
          }
        }
      }
    }
    return list;
  }, [menuCategories]);

  const openCreateDialog = () => {
    setEditingBannerId(null);
    setNewTitle("");
    setNewSubtitle("");
    setNewTag("PROMOÇÃO");
    setNewGradient("primary");
    setNewButtonText("Aproveitar");
    setNewImageUrl("");
    setNewLinkUrl("");
    setNewTextColor("white");
    setNewAlign("left");
    setNewCategoryId("");
    setNewDiscountPercent("");
    setImageTab("upload");
    setIsDialogOpen(true);
  };

  const openEditDialog = (banner: PromotionalBannerItem) => {
    setEditingBannerId(banner.id);
    setNewTitle(banner.title);
    setNewSubtitle(banner.subtitle || "");
    setNewTag(banner.tag || "DESTAQUE");
    setNewGradient(banner.gradient || "primary");
    setNewButtonText(banner.buttonText || "Aproveitar");
    setNewImageUrl(banner.imageUrl || "");
    setNewLinkUrl(banner.linkUrl || "");
    setNewTextColor((banner.textColor as "white" | "dark" | "amber") || "white");
    setNewAlign((banner.align as "left" | "center") || "left");
    setNewCategoryId(banner.categoryId || "");
    setNewDiscountPercent(banner.discountPercent ? String(banner.discountPercent) : "");
    setImageTab(banner.imageUrl ? (banner.imageUrl.startsWith("data:") ? "upload" : "url") : "upload");
    setIsDialogOpen(true);
  };

  const handleApplyPreset = (preset: (typeof PRESET_MODELS)[0]) => {
    setNewTitle(preset.title);
    setNewSubtitle(preset.subtitle);
    setNewTag(preset.tag);
    setNewGradient(preset.gradient);
    setNewButtonText(preset.buttonText);
    setNewAlign(preset.align);
    setNewTextColor(preset.textColor);
    if (preset.discount > 0) {
      setNewDiscountPercent(String(preset.discount));
    }

    // Se houver categoria correspondente no cardápio real (ex: "Pizza", "Combo"), seleciona automaticamente
    if (preset.categoryKeyword && menuCategories.length > 0) {
      const match = menuCategories.find((c) =>
        c.name.toLowerCase().includes(preset.categoryKeyword),
      );
      if (match) {
        setNewCategoryId(match.id);
        setNewLinkUrl(`#category-${match.id}`);
        setNewButtonText(`Ver ${match.name}`);

        // Se tiver produto com foto nesta categoria e não tiver foto definida, sugere a primeira
        const prodWithImg = match.products?.find((p) => p.imageUrl);
        if (prodWithImg?.imageUrl && !newImageUrl) {
          setNewImageUrl(prodWithImg.imageUrl);
        } else if (match.imageUrl && !newImageUrl) {
          setNewImageUrl(match.imageUrl);
        }
      }
    }
    toast.success(`Modelo "${preset.label}" aplicado! Personalize como desejar.`);
  };

  const handleCategorySelect = (categoryId: string) => {
    setNewCategoryId(categoryId);
    if (!categoryId || categoryId === "none") {
      setNewLinkUrl("");
      return;
    }

    const cat = menuCategories.find((c) => c.id === categoryId);
    if (cat) {
      setNewLinkUrl(`#category-${cat.id}`);
      // Se o botão ainda for padrão, sugere "Ver Categoria"
      if (!newButtonText || newButtonText === "Aproveitar") {
        setNewButtonText(`Ver ${cat.name}`);
      }
      // Se não tiver imagem ainda, puxa uma imagem do produto dessa categoria
      if (!newImageUrl) {
        const prod = cat.products?.find((p) => p.imageUrl);
        if (prod?.imageUrl) {
          setNewImageUrl(prod.imageUrl);
        } else if (cat.imageUrl) {
          setNewImageUrl(cat.imageUrl);
        }
      }
    }
  };

  // Upload de arquivo de imagem do computador/celular
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setNewImageUrl(dataUrl);
        toast.success("Imagem carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyDiscountShortcut = () => {
    const num = parseInt(newDiscountPercent, 10);
    if (isNaN(num) || num <= 0) {
      toast.error("Digite uma porcentagem válida (ex: 20).");
      return;
    }
    setNewTag(`🔥 ${num}% OFF`);
    if (newTitle && !newTitle.includes(`${num}%`)) {
      setNewTitle(`${newTitle.replace(/COM \d+% OFF/i, "").trim()} COM ${num}% OFF`);
    } else if (!newTitle) {
      setNewTitle(`PROMOÇÃO COM ${num}% DE DESCONTO`);
    }
    toast.success(`Desconto de ${num}% aplicado ao título e selo!`);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Informe o título da promoção.");
      return;
    }

    const selectedCategory = menuCategories.find((c) => c.id === newCategoryId);

    const bannerData: PromotionalBannerItem = {
      id: editingBannerId || "banner_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      tag: newTag.trim().toUpperCase() || "DESTAQUE",
      gradient: newGradient,
      buttonText: newButtonText.trim() || "Aproveitar",
      imageUrl: newImageUrl.trim() || undefined,
      linkUrl: newLinkUrl.trim() || undefined,
      textColor: newTextColor,
      align: newAlign,
      categoryId: newCategoryId || undefined,
      categoryName: selectedCategory?.name || undefined,
      discountPercent: newDiscountPercent ? Number(newDiscountPercent) : undefined,
      isActive: true,
    };

    if (editingBannerId) {
      onBannersChange(banners.map((b) => (b.id === editingBannerId ? bannerData : b)));
      toast.success("Banner promocional atualizado com sucesso!");
    } else {
      onBannersChange([...banners, bannerData]);
      toast.success("Novo banner adicionado ao carrossel!");
    }

    setIsDialogOpen(false);
  };

  const handleToggleBannerActive = (bannerId: string, active: boolean) => {
    onBannersChange(
      banners.map((b) => (b.id === bannerId ? { ...b, isActive: active } : b)),
    );
  };

  const handleDeleteBanner = (bannerId: string) => {
    onBannersChange(banners.filter((b) => b.id !== bannerId));
    toast.success("Banner removido.");
  };

  const selectedGradientClass =
    GRADIENT_OPTIONS.find((g) => g.id === newGradient)?.classes ||
    GRADIENT_OPTIONS[0].classes;

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Destaques e Marketing no Cardápio (App de Vendas)
        </p>
      </div>

      <div
        className={`rounded-2xl border transition-all p-4.5 sm:p-5 space-y-4 ${
          showPromotionalBanners
            ? "border-primary/40 bg-primary/[0.02] shadow-xs"
            : "border-slate-200/80 bg-white opacity-80"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="showPromotionalBanners"
                className="cursor-pointer font-bold text-slate-950 text-base flex items-center gap-2"
              >
                <SparklesIcon size={18} className="text-primary" />
                Carrossel de Destaques e Promoções
              </Label>
              <Badge
                variant={showPromotionalBanners ? "default" : "outline"}
                className={`text-[11px] font-bold ${
                  showPromotionalBanners
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-500"
                }`}
              >
                {showPromotionalBanners ? "Exibição Ativa" : "Oculto no Cardápio"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Exibe no topo do cardápio do cliente (logo antes das categorias) um carrossel responsivo e moderno destacando seus serviços, regras de cashback, cupons e banners personalizados com links diretos para suas categorias.
            </p>
          </div>
          <Switch
            id="showPromotionalBanners"
            checked={showPromotionalBanners}
            onCheckedChange={onToggleShow}
            disabled={disabled}
          />
        </div>

        {/* Detalhes e gestão quando o carrossel está ativado */}
        {showPromotionalBanners && (
          <div className="pt-4 border-t border-slate-100/90 space-y-5 animate-in fade-in duration-200">
            {/* Benefícios Automáticos Detectados */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2.5 flex items-center gap-1.5">
                <CheckCircle2Icon size={14} className="text-primary" />
                Destaques Automáticos Detectados da Loja
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3 text-xs">
                {/* Cashback */}
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                    isCashbackEnabled
                      ? "border-primary/30 bg-primary/5 text-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <CoinsIcon size={16} className={isCashbackEnabled ? "text-primary mt-0.5 shrink-0" : "text-slate-400 mt-0.5 shrink-0"} />
                  <div>
                    <p className="font-semibold">Cashback Ativo</p>
                    <p className="text-[11px] opacity-80">
                      {isCashbackEnabled
                        ? "Exibe banner automático de porcentagem de cashback no carrossel."
                        : "Desativado nas regras de cashback."}
                    </p>
                  </div>
                </div>

                {/* Cupons */}
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                    isCouponsEnabled
                      ? "border-primary/30 bg-primary/5 text-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <TagIcon size={16} className={isCouponsEnabled ? "text-primary mt-0.5 shrink-0" : "text-slate-400 mt-0.5 shrink-0"} />
                  <div>
                    <p className="font-semibold">Cupons Promocionais</p>
                    <p className="text-[11px] opacity-80">
                      {isCouponsEnabled
                        ? "Incentiva o uso de cupons de desconto ativos."
                        : "Desativado nas regras de cupons."}
                    </p>
                  </div>
                </div>

                {/* Frete / Entrega */}
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                    isDeliveryEnabled
                      ? "border-primary/30 bg-primary/5 text-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <TruckIcon size={16} className={isDeliveryEnabled ? "text-primary mt-0.5 shrink-0" : "text-slate-400 mt-0.5 shrink-0"} />
                  <div>
                    <p className="font-semibold">Entrega & Benefícios</p>
                    <p className="text-[11px] opacity-80">
                      {isDeliveryEnabled
                        ? "Destaque de frete grátis e rapidez de atendimento."
                        : "Canal delivery desativado."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Banners Promocionais Personalizados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Banners Promocionais ({banners.length})
                  </p>
                  <p className="text-xs text-slate-500">
                    Crie promoções por categoria (ex: 20% em pizzas), combos ou ofertas especiais com fotos e links.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openCreateDialog}
                  className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5 h-8 text-xs font-semibold"
                >
                  <PlusIcon size={14} />
                  Novo Banner
                </Button>
              </div>

              {/* Modal de Criação / Edição com barra de rolagem dedicada */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[640px] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                  {/* Cabeçalho Fixo */}
                  <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <SparklesIcon size={18} className="text-primary" />
                      {editingBannerId ? "Editar Banner Promocional" : "Criar Novo Banner Promocional"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Configure os textos, cores, fotos de produtos e vincule com a categoria desejada no cardápio.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Corpo com Barra de Rolagem Suave */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {/* 1. Modelos Prontos de Promoção (Presets de alta conversão) */}
                    <div className="space-y-2 rounded-xl bg-slate-50/80 border border-slate-200/70 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FlameIcon size={14} className="text-amber-500" />
                          Modelos Prontos de Promoção (Clique para Preencher)
                        </Label>
                        <span className="text-[10px] text-slate-500">1 clique para montar</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {PRESET_MODELS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleApplyPreset(preset)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:border-primary hover:bg-primary/5 transition shadow-2xs"
                          >
                            <span>{preset.icon}</span>
                            <span className="truncate">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Pré-visualização ao vivo com responsividade e contrastes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">
                        Pré-visualização em tempo real (como aparecerá no cardápio):
                      </Label>
                      <div
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${selectedGradientClass} p-4 sm:p-5 shadow-sm min-h-[140px] flex flex-col justify-center transition-all`}
                      >
                        {/* Imagem de fundo se selecionada */}
                        {newImageUrl && (
                          <>
                            <div className="absolute inset-0 z-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={newImageUrl}
                                alt="Preview do banner"
                                className="h-full w-full object-cover object-center"
                              />
                            </div>
                            <div
                              className={
                                newAlign === "center"
                                  ? "absolute inset-0 z-0 bg-black/65 backdrop-blur-[1px]"
                                  : "absolute inset-0 z-0 bg-gradient-to-r from-black/90 via-black/75 to-black/35"
                              }
                            />
                          </>
                        )}

                        <div
                          className={`relative z-10 flex ${
                            newAlign === "center"
                              ? "flex-col items-center text-center justify-center"
                              : "items-center justify-between gap-3"
                          }`}
                        >
                          <div
                            className={`flex-1 space-y-1.5 ${
                              newAlign === "center" ? "flex flex-col items-center text-center" : "text-left"
                            }`}
                          >
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                                newTextColor === "dark"
                                  ? "bg-slate-900/10 text-slate-900 border border-slate-900/20"
                                  : newTextColor === "amber"
                                  ? "bg-amber-400/20 text-amber-200 border border-amber-400/30"
                                  : "bg-white/20 text-white border border-white/25"
                              }`}
                            >
                              {newTag.trim() || "DESTAQUE"}
                            </span>
                            <h4
                              className={`font-display text-base sm:text-lg font-extrabold leading-tight break-words ${
                                newTextColor === "dark"
                                  ? "text-slate-950"
                                  : newTextColor === "amber"
                                  ? "text-amber-100"
                                  : "text-white drop-shadow-xs"
                              }`}
                            >
                              {newTitle.trim() || "Título da Promoção"}
                            </h4>
                            <p
                              className={`text-xs leading-relaxed max-w-md break-words ${
                                newTextColor === "dark"
                                  ? "text-slate-800"
                                  : newTextColor === "amber"
                                  ? "text-amber-200/90"
                                  : "text-white/90 drop-shadow-2xs"
                              }`}
                            >
                              {newSubtitle.trim() || "Descrição atrativa da promoção para conquistar seus clientes."}
                            </p>
                            <div className="pt-1">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs ${
                                  newTextColor === "dark"
                                    ? "bg-slate-950 text-white"
                                    : "bg-white text-slate-900"
                                }`}
                              >
                                {newButtonText.trim() || "Aproveitar"}
                              </span>
                            </div>
                          </div>

                          {/* Miniatura à direita quando alinhado à esquerda */}
                          {newAlign !== "center" && (
                            <div className="shrink-0">
                              {newImageUrl ? (
                                <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl overflow-hidden border-2 border-white/30 shadow-md">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={newImageUrl}
                                    alt="Thumb"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white">
                                  <SparklesIcon size={24} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. Título e Máscara / Auxiliar de Desconto */}
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <Label htmlFor="banner-title" className="text-xs font-semibold">
                          Título Principal da Promoção *
                        </Label>
                        <Input
                          id="banner-title"
                          placeholder="Ex: TODAS AS PIZZAS COM 20% OFF"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          required
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="banner-discount" className="text-xs font-semibold flex items-center justify-between">
                          <span>Desconto (%)</span>
                          <span className="text-[10px] text-slate-400">Opcional</span>
                        </Label>
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <Input
                              id="banner-discount"
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Ex: 20"
                              value={newDiscountPercent}
                              onChange={(e) => setNewDiscountPercent(e.target.value)}
                              className="h-9 text-sm pr-6"
                            />
                            <PercentIcon size={12} className="absolute right-2 top-3 text-slate-400" />
                          </div>
                          {newDiscountPercent && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleApplyDiscountShortcut}
                              className="h-9 px-2 text-[11px] text-primary shrink-0"
                              title="Aplicar desconto ao título e selo"
                            >
                              Aplicar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4. Subtítulo */}
                    <div className="space-y-1">
                      <Label htmlFor="banner-subtitle" className="text-xs font-semibold">
                        Subtítulo / Descrição da Promoção
                      </Label>
                      <Input
                        id="banner-subtitle"
                        placeholder="Ex: Peça sua pizza artesanal favorita hoje com desconto exclusivo no app!"
                        value={newSubtitle}
                        onChange={(e) => setNewSubtitle(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* 5. Vínculo do Botão com Categoria do Cardápio (Exemplo do usuário: Pizza -> Categoria de Pizza) */}
                    <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <LinkIcon size={14} className="text-primary" />
                          Vínculo do Botão com o Cardápio (Destino do Clique)
                        </Label>
                        <span className="text-[11px] font-semibold text-primary">Ação de Conversão</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Quando o cliente clicar no banner, para onde ele deve ser direcionado no cardápio?
                      </p>

                      <div className="grid sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700">
                            Ir para uma Categoria do Cardápio:
                          </Label>
                          <Select
                            value={newCategoryId || "none"}
                            onValueChange={handleCategorySelect}
                          >
                            <SelectTrigger className="h-9 text-xs bg-white">
                              <SelectValue placeholder="Selecione a categoria..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma (apenas rolar até o cardápio)</SelectItem>
                              {menuCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name} {cat.products ? `(${cat.products.length} itens)` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="banner-btn" className="text-[11px] font-semibold text-slate-700">
                            Texto do Botão de Ação:
                          </Label>
                          <Input
                            id="banner-btn"
                            placeholder="Ex: Ver Pizzas, Aproveitar, Pedir Combo"
                            value={newButtonText}
                            onChange={(e) => setNewButtonText(e.target.value)}
                            className="h-9 text-xs bg-white"
                          />
                        </div>
                      </div>

                      {/* Link personalizado se não quiser usar âncora de categoria */}
                      <div className="space-y-1 pt-1">
                        <Label htmlFor="banner-link" className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Link ou Âncora Personalizada (opcional):</span>
                          {newLinkUrl && <span className="font-mono text-[10px] text-primary">{newLinkUrl}</span>}
                        </Label>
                        <Input
                          id="banner-link"
                          placeholder="Ex: #category-id ou https://seusite.com"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          className="h-8 text-xs bg-white font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    {/* 6. Selo / Tag e Alinhamento e Cor do Texto */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Selo / Tag */}
                      <div className="space-y-1">
                        <Label htmlFor="banner-tag" className="text-xs font-semibold">
                          Selo Superior (Tag)
                        </Label>
                        <Input
                          id="banner-tag"
                          placeholder="Ex: 🔥 20% OFF, COMBO"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Alinhamento do Conteúdo (Esquerda vs Centralizado) */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Alinhamento</Label>
                        <div className="grid grid-cols-2 gap-1.5 h-9">
                          <button
                            type="button"
                            onClick={() => setNewAlign("left")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition ${
                              newAlign === "left"
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <AlignLeftIcon size={14} />
                            À Esquerda
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewAlign("center")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition ${
                              newAlign === "center"
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <AlignCenterIcon size={14} />
                            Centralizado
                          </button>
                        </div>
                      </div>

                      {/* Cor do Texto */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Cor do Texto</Label>
                        <div className="grid grid-cols-3 gap-1 h-9">
                          <button
                            type="button"
                            onClick={() => setNewTextColor("white")}
                            className={`flex items-center justify-center rounded-lg border text-xs transition ${
                              newTextColor === "white"
                                ? "border-primary bg-slate-900 text-white font-bold shadow-2xs"
                                : "border-slate-200 bg-slate-800 text-white/80 hover:bg-slate-900"
                            }`}
                            title="Texto Branco (Padrão contrastante)"
                          >
                            Branco
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewTextColor("dark")}
                            className={`flex items-center justify-center rounded-lg border text-xs transition ${
                              newTextColor === "dark"
                                ? "border-primary bg-slate-200 text-slate-950 font-bold shadow-2xs"
                                : "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200"
                            }`}
                            title="Texto Escuro / Grafite"
                          >
                            Escuro
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewTextColor("amber")}
                            className={`flex items-center justify-center rounded-lg border text-xs transition ${
                              newTextColor === "amber"
                                ? "border-amber-500 bg-amber-500 text-white font-bold shadow-2xs"
                                : "border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200"
                            }`}
                            title="Texto Dourado / Âmbar"
                          >
                            Dourado
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 7. Imagem: Upload direto, Produtos do Cardápio ou URL */}
                    <div className="space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <ImageIcon size={14} className="text-primary" />
                          Foto ou Arte Promocional
                        </Label>
                        {newImageUrl && (
                          <button
                            type="button"
                            onClick={() => setNewImageUrl("")}
                            className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                          >
                            <XIcon size={12} />
                            Remover imagem
                          </button>
                        )}
                      </div>

                      <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as any)}>
                        <TabsList className="grid w-full grid-cols-3 h-8">
                          <TabsTrigger value="upload" className="text-xs">
                            <UploadIcon size={12} className="mr-1.5" />
                            Upload do PC
                          </TabsTrigger>
                          <TabsTrigger value="menu" className="text-xs">
                            <LayersIcon size={12} className="mr-1.5" />
                            Fotos do Cardápio
                          </TabsTrigger>
                          <TabsTrigger value="url" className="text-xs">
                            <LinkIcon size={12} className="mr-1.5" />
                            Colar Link URL
                          </TabsTrigger>
                        </TabsList>

                        {/* Opção A: Upload de Imagem */}
                        {imageTab === "upload" && (
                          <div className="pt-2">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                            />
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/[0.02] transition"
                            >
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <UploadIcon size={18} />
                              </div>
                              <p className="text-xs font-semibold text-slate-800">
                                Clique para selecionar uma arte ou foto
                              </p>
                              <p className="text-[10px] text-slate-500">
                                PNG, JPG ou WEBP até 3MB.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Opção B: Fotos dos Produtos do Cardápio */}
                        {imageTab === "menu" && (
                          <div className="pt-2 space-y-1.5">
                            <p className="text-[11px] text-slate-500">
                              Selecione uma foto de produto cadastrado no seu cardápio:
                            </p>
                            {productsWithImages.length === 0 ? (
                              <p className="text-xs text-slate-400 py-3 text-center">
                                Nenhum produto com foto cadastrada no cardápio.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-slate-100">
                                {productsWithImages.map((prod) => (
                                  <button
                                    key={prod.productId}
                                    type="button"
                                    onClick={() => {
                                      setNewImageUrl(prod.imageUrl);
                                      if (!newCategoryId) {
                                        setNewCategoryId(prod.categoryId);
                                        setNewLinkUrl(`#category-${prod.categoryId}`);
                                      }
                                      toast.success(`Foto de "${prod.productName}" selecionada!`);
                                    }}
                                    className={`group relative rounded-lg border overflow-hidden text-left transition ${
                                      newImageUrl === prod.imageUrl
                                        ? "ring-2 ring-primary border-primary"
                                        : "hover:border-slate-300"
                                    }`}
                                  >
                                    <div className="h-16 w-full relative bg-slate-100">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={prod.imageUrl}
                                        alt={prod.productName}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <p className="p-1 text-[10px] font-semibold text-slate-800 truncate bg-white">
                                      {prod.productName}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Opção C: Colar Link URL */}
                        {imageTab === "url" && (
                          <div className="pt-2 space-y-1">
                            <Label htmlFor="banner-img-url" className="text-[11px] text-slate-600">
                              Endereço URL da Imagem:
                            </Label>
                            <Input
                              id="banner-img-url"
                              placeholder="https://..."
                              value={newImageUrl}
                              onChange={(e) => setNewImageUrl(e.target.value)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                        )}
                      </Tabs>
                    </div>

                    {/* 8. Estilo de Gradiente de Fundo */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Estilo de Gradiente de Fundo</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {GRADIENT_OPTIONS.map((grad) => (
                          <button
                            key={grad.id}
                            type="button"
                            onClick={() => setNewGradient(grad.id)}
                            className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition ${
                              newGradient === grad.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary font-bold text-slate-900 shadow-2xs"
                                : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                            }`}
                          >
                            <span
                              className={`h-4 w-4 rounded-full bg-gradient-to-r ${grad.classes} shrink-0 shadow-inner`}
                            />
                            <span className="truncate">{grad.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé Fixo */}
                  <DialogFooter className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 shrink-0 sm:justify-between flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsDialogOpen(false)}
                      className="text-xs h-9"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveBanner}
                      disabled={!newTitle.trim()}
                      className="bg-primary text-primary-foreground text-xs font-semibold h-9 px-5 shadow-xs"
                    >
                      {editingBannerId ? "Salvar Alterações" : "Adicionar ao Carrossel"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Lista de banners customizados */}
              {banners.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center space-y-2">
                  <p className="text-xs font-medium text-slate-600">
                    Nenhum banner personalizado cadastrado ainda.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Crie promoções atraentes (como 20% em pizzas, combos ou frete) que levarão seus clientes diretamente à categoria em promoção no cardápio!
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={openCreateDialog}
                    className="text-xs text-primary border-primary/30 h-8 gap-1.5"
                  >
                    <PlusIcon size={14} />
                    Criar meu primeiro banner
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {banners.map((b) => {
                    const grad =
                      GRADIENT_OPTIONS.find((g) => g.id === b.gradient)?.classes ||
                      GRADIENT_OPTIONS[0].classes;

                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-slate-300 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {b.imageUrl ? (
                            <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={b.imageUrl}
                                alt={b.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-r ${grad} flex items-center justify-center text-white shadow-xs`}
                            >
                              <SparklesIcon size={18} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                                {b.tag || "DESTAQUE"}
                              </span>
                              {b.categoryName && (
                                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[9px] font-bold">
                                  🔗 {b.categoryName}
                                </span>
                              )}
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {b.title}
                              </p>
                            </div>
                            {b.subtitle && (
                              <p className="text-[11px] text-slate-500 truncate max-w-md">
                                {b.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 mr-1">
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                              {b.isActive ? "Ativo" : "Pausado"}
                            </span>
                            <Switch
                              checked={b.isActive}
                              onCheckedChange={(val) =>
                                handleToggleBannerActive(b.id, val)
                              }
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(b)}
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg"
                            title="Editar banner"
                          >
                            <PencilIcon size={14} />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBanner(b.id)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                            title="Remover banner"
                          >
                            <Trash2Icon size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
