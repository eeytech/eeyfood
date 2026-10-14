"use client";

import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  LayersIcon,
  LightbulbIcon,
  PlayCircleIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScreenDocumentation } from "@/data/screen-documentations";

interface ScreenHelpSheetProps {
  doc: ScreenDocumentation | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScreenHelpSheet({
  doc,
  isOpen,
  onOpenChange,
}: ScreenHelpSheetProps) {
  const [activeTab, setActiveTab] = useState<string>("features");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFeatures = useMemo(() => {
    if (!doc) return [];
    if (!searchQuery.trim()) return doc.features;
    const q = searchQuery.toLowerCase().trim();
    return doc.features.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.badge && f.badge.toLowerCase().includes(q)),
    );
  }, [doc, searchQuery]);

  const filteredSteps = useMemo(() => {
    if (!doc) return [];
    if (!searchQuery.trim()) return doc.howToUse;
    const q = searchQuery.toLowerCase().trim();
    return doc.howToUse.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.expectedResult && s.expectedResult.toLowerCase().includes(q)),
    );
  }, [doc, searchQuery]);

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200 shadow-2xl bg-white">
        {/* Header do Guia */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-5 sm:p-6 shrink-0 border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                <BookOpenIcon size={16} />
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                Guia Oficial da Tela • {doc.categoryLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-primary/15 text-primary border-primary/30 text-xs px-2.5 py-0.5"
              >
                {doc.badge}
              </Badge>
              <Badge
                variant="outline"
                className="bg-white/10 text-slate-300 border-white/10 text-xs font-mono"
              >
                {doc.route}
              </Badge>
            </div>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {doc.title}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {doc.summary}
          </DialogDescription>
        </div>

        {/* Barra de Busca Rápida de Recursos dentro do Modal */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <SearchIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="text"
              placeholder="Buscar botão, campo ou recurso desta tela..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-white border-slate-200 rounded-lg focus-visible:ring-primary"
            />
          </div>
          <span className="text-[11px] font-medium text-slate-500 hidden sm:inline-block">
            {doc.features.length} recursos explicados • {doc.howToUse.length} passos
          </span>
        </div>

        {/* Abas de Conteúdo */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-5 pt-3 border-b border-slate-200 bg-white shrink-0">
            <TabsList className="bg-slate-100 p-1 h-9 rounded-xl">
              <TabsTrigger
                value="features"
                className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <LayersIcon size={14} />
                <span>O que tem nesta tela ({filteredFeatures.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="howToUse"
                className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <PlayCircleIcon size={14} />
                <span>Como usar no dia a dia ({filteredSteps.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="tips"
                className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
              >
                <LightbulbIcon size={14} />
                <span>Dicas & Melhores Práticas</span>
              </TabsTrigger>
              {doc.faq && doc.faq.length > 0 && (
                <TabsTrigger
                  value="faq"
                  className="text-xs font-semibold gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
                  <HelpCircleIcon size={14} />
                  <span>Dúvidas Frequentes</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* ABA: O QUE TEM NESTA TELA */}
            <TabsContent value="features" className="m-0 space-y-3">
              {filteredFeatures.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Nenhum item encontrado para &quot;{searchQuery}&quot;. Tente outro termo.
                </div>
              ) : (
                filteredFeatures.map((feat, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-primary/40 hover:shadow-sm transition-all duration-150"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                          {index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                          {feat.name}
                        </h4>
                      </div>
                      {feat.badge && (
                        <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {feat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-7">
                      {feat.description}
                    </p>
                    {feat.action && (
                      <div className="mt-2.5 pl-7 flex items-start gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                        <CheckCircle2Icon size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                        <span>
                          <strong>Como interagir:</strong> {feat.action}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* ABA: COMO USAR */}
            <TabsContent value="howToUse" className="m-0 space-y-3.5">
              {filteredSteps.map((step, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs relative pl-5"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
                  <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <span className="text-primary font-mono">{step.title}</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    {step.description}
                  </p>
                  {step.expectedResult && (
                    <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 flex items-center gap-1.5">
                      <SparklesIcon size={13} className="text-amber-500 shrink-0" />
                      <span>
                        <strong>Resultado esperado:</strong> {step.expectedResult}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* ABA: DICAS E MELHORES PRÁTICAS */}
            <TabsContent value="tips" className="m-0 space-y-3">
              <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-4 mb-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <LightbulbIcon size={14} className="text-amber-600" />
                  Recomendações da Equipe EeyFood
                </h4>
                <p className="text-xs text-amber-800">
                  Práticas recomendadas para aumentar sua agilidade operacional, evitar erros e vender mais.
                </p>
              </div>

              {doc.proTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓
                  </span>
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))}

              {doc.relatedRoutes && doc.relatedRoutes.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 block mb-2">
                    Módulos Relacionados:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {doc.relatedRoutes.map((rel) => (
                      <Link
                        key={rel.href}
                        href={rel.href}
                        onClick={() => onOpenChange(false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-primary hover:text-white transition-colors"
                      >
                        <span>{rel.label}</span>
                        <ArrowRightIcon size={12} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ABA: FAQ */}
            {doc.faq && doc.faq.length > 0 && (
              <TabsContent value="faq" className="m-0 space-y-3">
                {doc.faq.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white"
                  >
                    <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-start gap-2">
                      <span className="text-primary font-bold">P:</span>
                      <span>{item.question}</span>
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed pl-4 mt-1">
                      <strong className="text-emerald-700">R:</strong> {item.answer}
                    </p>
                  </div>
                ))}
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Rodapé do Modal com Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <Link
            href={`/configuracoes/documentacoes#${doc.id}`}
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors"
          >
            <BookOpenIcon size={14} />
            <span>Abrir na Central de Documentações</span>
          </Link>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold px-4 h-8 rounded-lg"
          >
            Entendido, continuar trabalhando
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
