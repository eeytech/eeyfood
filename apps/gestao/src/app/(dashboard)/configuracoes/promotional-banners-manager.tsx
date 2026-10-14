"use client";

import type { PromotionalBannerItem } from "@fsw/db";
import {
  CheckCircle2Icon,
  CoinsIcon,
  EyeIcon,
  FlameIcon,
  GiftIcon,
  PlusIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react";
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PromotionalBannersManagerProps {
  showPromotionalBanners: boolean;
  onToggleShow: (val: boolean) => void;
  banners: PromotionalBannerItem[];
  onBannersChange: (banners: PromotionalBannerItem[]) => void;
  isCashbackEnabled?: boolean;
  isCouponsEnabled?: boolean;
  isDeliveryEnabled?: boolean;
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
    id: "rose",
    label: "Rosa / Carmim",
    classes: "from-rose-600 via-pink-600 to-red-600",
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

export function PromotionalBannersManager({
  showPromotionalBanners,
  onToggleShow,
  banners,
  onBannersChange,
  isCashbackEnabled = true,
  isCouponsEnabled = true,
  isDeliveryEnabled = true,
  disabled = false,
}: PromotionalBannersManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newTag, setNewTag] = useState("PROMOÇÃO");
  const [newGradient, setNewGradient] = useState("primary");
  const [newButtonText, setNewButtonText] = useState("Aproveitar");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newBanner: PromotionalBannerItem = {
      id: "banner_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      tag: newTag.trim().toUpperCase() || "DESTAQUE",
      gradient: newGradient,
      buttonText: newButtonText.trim() || "Aproveitar",
      imageUrl: newImageUrl.trim() || undefined,
      linkUrl: newLinkUrl.trim() || undefined,
      isActive: true,
    };

    onBannersChange([...banners, newBanner]);

    // Limpa os campos e fecha
    setNewTitle("");
    setNewSubtitle("");
    setNewTag("PROMOÇÃO");
    setNewGradient("primary");
    setNewButtonText("Aproveitar");
    setNewImageUrl("");
    setNewLinkUrl("");
    setIsDialogOpen(false);
  };

  const handleToggleBannerActive = (bannerId: string, active: boolean) => {
    onBannersChange(
      banners.map((b) => (b.id === bannerId ? { ...b, isActive: active } : b)),
    );
  };

  const handleDeleteBanner = (bannerId: string) => {
    onBannersChange(banners.filter((b) => b.id !== bannerId));
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
              Exibe no topo do cardápio do cliente (logo antes das categorias) um carrossel responsivo e moderno destacando seus serviços, regras de cashback, cupons e banners personalizados.
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
                <CheckCircle2Icon size={14} className="text-emerald-600" />
                Destaques Automáticos Detectados da Loja
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3 text-xs">
                {/* Cashback */}
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                    isCashbackEnabled
                      ? "border-amber-200 bg-amber-50/60 text-amber-950"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <CoinsIcon size={16} className={isCashbackEnabled ? "text-amber-600 mt-0.5 shrink-0" : "text-slate-400 mt-0.5 shrink-0"} />
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
                      ? "border-violet-200 bg-violet-50/60 text-violet-950"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <TagIcon size={16} className={isCouponsEnabled ? "text-violet-600 mt-0.5 shrink-0" : "text-slate-400 mt-0.5 shrink-0"} />
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
                      ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <TruckIcon size={16} className={isDeliveryEnabled ? "text-emerald-600 mt-0.5 shrink-0" : "text-slate-400 mt-0.5 shrink-0"} />
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
                    Banners Personalizados ({banners.length})
                  </p>
                  <p className="text-xs text-slate-500">
                    Crie banners sob medida para divulgar promoções do dia, combos especiais ou novidades.
                  </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5 h-8 text-xs font-semibold"
                    >
                      <PlusIcon size={14} />
                      Novo Banner
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <SparklesIcon size={18} className="text-primary" />
                        Criar Novo Banner Promocional
                      </DialogTitle>
                      <DialogDescription>
                        Configure os textos, cores e destino do banner para o topo do seu cardápio digital.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddBanner} className="space-y-4 pt-2">
                      {/* Pré-visualização ao vivo */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Pré-visualização ao vivo:</Label>
                        <div
                          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${selectedGradientClass} p-4 text-white shadow-sm`}
                        >
                          <div className="relative z-10 space-y-1.5">
                            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                              {newTag.trim() || "DESTAQUE"}
                            </span>
                            <h4 className="font-display text-base font-bold text-white drop-shadow-xs line-clamp-1">
                              {newTitle.trim() || "Título da Promoção"}
                            </h4>
                            <p className="text-xs text-white/90 line-clamp-2">
                              {newSubtitle.trim() || "Descrição curta do benefício que encantará seus clientes."}
                            </p>
                            <div className="pt-1">
                              <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 shadow-xs">
                                {newButtonText.trim() || "Aproveitar"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Título */}
                      <div className="space-y-1">
                        <Label htmlFor="banner-title" className="text-xs font-semibold">
                          Título Principal *
                        </Label>
                        <Input
                          id="banner-title"
                          placeholder="Ex: Combo Família com 20% OFF"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          required
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Subtítulo */}
                      <div className="space-y-1">
                        <Label htmlFor="banner-subtitle" className="text-xs font-semibold">
                          Subtítulo / Descrição
                        </Label>
                        <Input
                          id="banner-subtitle"
                          placeholder="Ex: Válido hoje para pedidos no app de delivery"
                          value={newSubtitle}
                          onChange={(e) => setNewSubtitle(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Tag e Texto do Botão */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="banner-tag" className="text-xs font-semibold">
                            Selo / Tag
                          </Label>
                          <Input
                            id="banner-tag"
                            placeholder="Ex: PROMOÇÃO, NOVIDADE"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="banner-btn" className="text-xs font-semibold">
                            Texto do Botão
                          </Label>
                          <Input
                            id="banner-btn"
                            placeholder="Ex: Aproveitar"
                            value={newButtonText}
                            onChange={(e) => setNewButtonText(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Estilo de Gradiente */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Estilo de Cor de Fundo</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {GRADIENT_OPTIONS.map((grad) => (
                            <button
                              key={grad.id}
                              type="button"
                              onClick={() => setNewGradient(grad.id)}
                              className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition ${
                                newGradient === grad.id
                                  ? "border-primary bg-primary/5 ring-1 ring-primary font-bold text-slate-900"
                                  : "border-slate-200 hover:border-slate-300 text-slate-600"
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

                      {/* Imagem opcional */}
                      <div className="space-y-1">
                        <Label htmlFor="banner-image" className="text-xs font-semibold">
                          URL da Imagem de Fundo (opcional)
                        </Label>
                        <Input
                          id="banner-image"
                          placeholder="https://..."
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Link de Destino opcional */}
                      <div className="space-y-1">
                        <Label htmlFor="banner-link" className="text-xs font-semibold">
                          Link de Destino / Ação (opcional)
                        </Label>
                        <Input
                          id="banner-link"
                          placeholder="Ex: #category-id ou https://..."
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setIsDialogOpen(false)}
                          className="text-xs"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={!newTitle.trim()}
                          className="bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          Adicionar ao Carrossel
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Lista de banners customizados */}
              {banners.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                  <p className="text-xs text-slate-500">
                    Nenhum banner personalizado cadastrado ainda. Os destaques automáticos (Cashback, Cupons e Frete) já serão exibidos no cardápio!
                  </p>
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
                          <div
                            className={`h-9 w-9 shrink-0 rounded-lg bg-gradient-to-r ${grad} flex items-center justify-center text-white shadow-xs`}
                          >
                            <SparklesIcon size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                                {b.tag || "DESTAQUE"}
                              </span>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {b.title}
                              </p>
                            </div>
                            {b.subtitle && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {b.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">
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
                            onClick={() => handleDeleteBanner(b.id)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                            title="Remover banner"
                          >
                            <Trash2Icon size={15} />
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
