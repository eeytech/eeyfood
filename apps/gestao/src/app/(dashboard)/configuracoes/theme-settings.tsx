"use client";

import {
  CheckIcon,
  FlameIcon,
  LayoutGridIcon,
  PaletteIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_THEME, SystemTheme, ThemeId } from "@/lib/theme-config";
import { cn } from "@/lib/utils";

export function ThemeSettings() {
  const { theme, setTheme, availableThemes } = useTheme();
  const [previewInput, setPreviewInput] = useState("Exemplo de texto digitado...");

  const chromaticThemes = availableThemes.filter((t) => t.category === "Cromático");
  const neutralThemes = availableThemes.filter((t) => t.category === "Neutro");

  const handleSelectTheme = (newTheme: ThemeId, themeName: string) => {
    if (newTheme === theme) return;
    setTheme(newTheme);
    toast.success(`Tema "${themeName}" aplicado com sucesso!`, {
      description: "As alterações foram sincronizadas instantaneamente no sistema.",
      icon: "🎨",
    });
  };

  const handleResetDefault = () => {
    if (theme === DEFAULT_THEME) return;
    setTheme(DEFAULT_THEME);
    toast.info("Tema padrão (Red) restaurado com sucesso!");
  };

  const currentThemeObj =
    availableThemes.find((t) => t.id === theme) || availableThemes[0];

  const renderThemeCard = (t: SystemTheme) => {
    const isSelected = theme === t.id;

    return (
      <button
        key={t.id}
        type="button"
        onClick={() => handleSelectTheme(t.id, t.label)}
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isSelected
            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/40"
            : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md",
        )}
      >
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-inner ring-2 ring-white transition-transform duration-200 group-hover:scale-110"
              style={{ backgroundColor: t.hex }}
            >
              {isSelected && <CheckIcon size={14} className="text-white drop-shadow-sm" />}
            </span>
            <div>
              <p className="font-display text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                {t.name}
              </p>
              <p className="text-xs font-medium text-slate-500">{t.label}</p>
            </div>
          </div>

          {isSelected ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Ativo
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500 line-clamp-2">
          {t.description}
        </p>

        {/* Amostra visual de gradiente e elementos */}
        <div className="mt-3 flex items-center gap-1.5 w-full pt-2 border-t border-slate-100">
          <span
            className="h-2 flex-1 rounded-full opacity-90 transition-all group-hover:opacity-100"
            style={{ backgroundColor: t.hex }}
          />
          <span
            className="h-2 w-4 rounded-full opacity-60"
            style={{ backgroundColor: t.hoverHex }}
          />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Painel de Informação e Pré-visualização ao Vivo ───────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PaletteIcon size={20} />
              </div>
              <div>
                <CardTitle className="font-display text-lg font-bold text-slate-900">
                  Tema & Paleta de Cores do Painel
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Inspirado na galeria oficial de temas do <strong>shadcn/ui</strong>.
                  Altera botões de ação, realces visuais, anéis de foco e elementos de destaque em todo o sistema.
                </CardDescription>
              </div>
            </div>

            {theme !== DEFAULT_THEME && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                className="h-8 gap-1.5 text-xs text-slate-600 hover:text-slate-900 shrink-0"
              >
                <RotateCcwIcon size={13} />
                Restaurar Vermelho Padrão
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Demonstração dinâmica ao vivo */}
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <SparklesIcon size={16} className="text-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Pré-visualização ao vivo: {currentThemeObj.label} ({currentThemeObj.name})
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white font-semibold">
                Tempo Real
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-center">
              {/* Botão Primário */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500">Botão Primário</p>
                <Button className="w-full text-xs font-semibold shadow-xs">
                  <FlameIcon size={14} className="mr-1" /> Ação Principal
                </Button>
              </div>

              {/* Botão Secundário / Outline */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500">Botão Contorno</p>
                <Button variant="outline" className="w-full text-xs font-semibold">
                  Ação Secundária
                </Button>
              </div>

              {/* Input com anel do tema */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500">Input com Foco Ativo</p>
                <Input
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  className="h-11 text-xs rounded-full bg-white focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Digite aqui..."
                />
              </div>

              {/* Mini Card de Métricas com Destaque */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500">Card de Destaque</p>
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-2.5 px-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Total Ativo
                    </p>
                    <p className="font-display text-sm font-bold text-slate-900">
                      R$ 1.480,00
                    </p>
                  </div>
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs"
                    style={{ backgroundColor: currentThemeObj.hex }}
                  >
                    <CheckIcon size={14} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Seção 1: Cores Cromáticas / Vibrantes ────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <PaletteIcon size={16} className="text-slate-500" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-800">
            Cores Vibrantes & Gastronomia ({chromaticThemes.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {chromaticThemes.map(renderThemeCard)}
        </div>
      </div>

      {/* ── Seção 2: Tons Neutros / Modernos ─────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <LayoutGridIcon size={16} className="text-slate-500" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-800">
            Tons Neutros & Minimalistas ({neutralThemes.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {neutralThemes.map(renderThemeCard)}
        </div>
      </div>
    </div>
  );
}
