"use client";

import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  LayersIcon,
  LightbulbIcon,
  PlayCircleIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  SCREEN_DOCUMENTATIONS,
  type ScreenCategory,
  type ScreenDocumentation,
} from "@/data/screen-documentations";

export default function DocumentacoesClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ScreenCategory | "all">("all");
  const [expandedScreens, setExpandedScreens] = useState<Record<string, boolean>>({});

  // Por padrão, expande a primeira tela ou todas se pesquisar
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = window.location.hash.replace("#", "");
      if (targetId) {
        setExpandedScreens((prev) => ({ ...prev, [targetId]: true }));
        const elem = document.getElementById(targetId);
        if (elem) {
          setTimeout(() => {
            elem.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 200);
        }
      }
    } else {
      // Abre a primeira por padrão
      const initial: Record<string, boolean> = {};
      if (SCREEN_DOCUMENTATIONS.length > 0) {
        initial[SCREEN_DOCUMENTATIONS[0].id] = true;
      }
      setExpandedScreens(initial);
    }
  }, []);

  // Ao pesquisar, abre automaticamente as telas que deram match
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const nextExpanded: Record<string, boolean> = {};
      filteredDocs.forEach((d) => {
        nextExpanded[d.id] = true;
      });
      setExpandedScreens(nextExpanded);
    }
  }, [searchQuery]);

  const toggleScreen = (id: string) => {
    setExpandedScreens((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredDocs.forEach((d) => {
      all[d.id] = true;
    });
    setExpandedScreens(all);
  };

  const collapseAll = () => {
    setExpandedScreens({});
  };

  const filteredDocs = useMemo(() => {
    return SCREEN_DOCUMENTATIONS.filter((doc) => {
      // Filtro de categoria
      if (selectedCategory !== "all" && doc.category !== selectedCategory) {
        return false;
      }

      // Filtro de busca
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const inTitle = doc.title.toLowerCase().includes(q);
      const inSummary = doc.summary.toLowerCase().includes(q);
      const inRoute = doc.route.toLowerCase().includes(q);
      const inBadge = doc.badge.toLowerCase().includes(q);
      const inFeatures = doc.features.some(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          (f.badge && f.badge.toLowerCase().includes(q)),
      );
      const inSteps = doc.howToUse.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );

      return inTitle || inSummary || inRoute || inBadge || inFeatures || inSteps;
    });
  }, [selectedCategory, searchQuery]);

  const categories: Array<{ id: ScreenCategory | "all"; label: string; count: number }> = [
    { id: "all", label: "Todas as Telas", count: SCREEN_DOCUMENTATIONS.length },
    {
      id: "operacoes",
      label: "Operações",
      count: SCREEN_DOCUMENTATIONS.filter((d) => d.category === "operacoes").length,
    },
    {
      id: "cardapio",
      label: "Cardápio & Estoque",
      count: SCREEN_DOCUMENTATIONS.filter((d) => d.category === "cardapio").length,
    },
    {
      id: "financeiro",
      label: "Financeiro & Fiscal",
      count: SCREEN_DOCUMENTATIONS.filter((d) => d.category === "financeiro").length,
    },
    {
      id: "marketing",
      label: "Marketing & Clientes",
      count: SCREEN_DOCUMENTATIONS.filter((d) => d.category === "marketing").length,
    },
    {
      id: "configuracoes",
      label: "Configurações & APIs",
      count: SCREEN_DOCUMENTATIONS.filter((d) => d.category === "configuracoes").length,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <BookOpenIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Documentações & Manuais
            </h1>
            <p className="text-sm text-slate-500">
              Aprenda em detalhes tudo o que existe em cada tela do sistema e como utilizá-la no dia a dia.
            </p>
          </div>
        </div>

        {/* Botões de Expandir / Recolher */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="h-9 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <ChevronDownIcon size={14} />
            <span>Expandir Tudo</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="h-9 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <ChevronUpIcon size={14} />
            <span>Recolher Tudo</span>
          </Button>
        </div>
      </div>

      {/* ── Barra de Pesquisa e Filtros ─────────────────── */}
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <SearchIcon
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="text"
            placeholder="Pesquisar por tela, botão, campo ou palavra-chave..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm bg-white border-slate-200 rounded-xl shadow-xs focus-visible:ring-primary"
          />
        </div>

        {/* Categorias em Pílulas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal: Índice + Artigos Completos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sumário Lateral Fixo (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs max-h-[calc(100vh-40px)] overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Índice Rápido ({filteredDocs.length})
            </span>
          </div>
          <nav className="space-y-1">
            {filteredDocs.map((doc) => (
              <a
                key={doc.id}
                href={`#${doc.id}`}
                onClick={() => setExpandedScreens((prev) => ({ ...prev, [doc.id]: true }))}
                className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
              >
                <span className="truncate">{doc.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {doc.badge}
                </span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Lista de Manuais por Tela */}
        <main className="lg:col-span-9 space-y-5">
          {filteredDocs.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-2 border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <SearchIcon size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma documentação encontrada
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Não encontramos resultados para &quot;{searchQuery}&quot;. Tente pesquisar por outros
                termos como &quot;pedidos&quot;, &quot;caixa&quot;, &quot;nfc-e&quot; ou &quot;motoboy&quot;.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-4 text-xs font-semibold rounded-xl"
              >
                Limpar filtros de busca
              </Button>
            </Card>
          ) : (
            filteredDocs.map((doc) => {
              const isExpanded = Boolean(expandedScreens[doc.id]);

              return (
                <section
                  key={doc.id}
                  id={doc.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                >
                  {/* Cabeçalho do Card da Tela */}
                  <div
                    onClick={() => toggleScreen(doc.id)}
                    className="p-5 sm:p-6 cursor-pointer bg-white hover:bg-slate-50/70 transition-colors flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                          <BookOpenIcon size={16} />
                        </span>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                            {doc.categoryLabel}
                          </span>
                          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                            {doc.title}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/25 text-xs font-semibold"
                        >
                          {doc.badge}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-mono"
                        >
                          {doc.route}
                        </Badge>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-800 transition-colors ml-1"
                          aria-label="Expandir ou recolher"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon size={18} />
                          ) : (
                            <ChevronDownIcon size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {doc.summary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-4 text-slate-500 font-medium">
                        <span>📋 {doc.features.length} recursos detalhados</span>
                        <span>🚀 {doc.howToUse.length} passos de uso</span>
                      </div>

                      <Link
                        href={doc.route}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        <span>Acessar tela agora</span>
                        <ExternalLinkIcon size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Conteúdo Expandido do Manual */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-5 sm:p-6 space-y-6">
                      {/* SEÇÃO 1: O QUE TEM NESTA TELA */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-800 text-xs">
                            <LayersIcon size={14} />
                          </span>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                            1. O que tem nesta tela (Recursos, Cards e Botões)
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {doc.features.map((feat, fIdx) => (
                            <div
                              key={fIdx}
                              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                                      {fIdx + 1}
                                    </span>
                                    {feat.name}
                                  </h4>
                                  {feat.badge && (
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                                      {feat.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed pl-5">
                                  {feat.description}
                                </p>
                              </div>

                              {feat.action && (
                                <div className="mt-3 pl-5 text-[11px] font-medium text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 flex items-start gap-1.5">
                                  <CheckCircle2Icon
                                    size={13}
                                    className="shrink-0 mt-0.5 text-emerald-600"
                                  />
                                  <span>
                                    <strong>Como interagir:</strong> {feat.action}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SEÇÃO 2: COMO USAR NO DIA A DIA */}
                      <div className="space-y-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-xs">
                            <PlayCircleIcon size={14} />
                          </span>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                            2. Passo a Passo: Como usar no dia a dia
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {doc.howToUse.map((step, sIdx) => (
                            <div
                              key={sIdx}
                              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs relative pl-5"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
                              <h4 className="text-xs font-bold text-slate-900 mb-1">
                                {step.title}
                              </h4>
                              <p className="text-xs text-slate-600 leading-relaxed">
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
                        </div>
                      </div>

                      {/* SEÇÃO 3: DICAS & RECOMENDAÇÕES */}
                      <div className="space-y-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs">
                            <LightbulbIcon size={14} />
                          </span>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                            3. Dicas & Recomendações de Especialistas
                          </h3>
                        </div>

                        <div className="space-y-2">
                          {doc.proTips.map((tip, tIdx) => (
                            <div
                              key={tIdx}
                              className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs text-amber-900"
                            >
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
                                ✓
                              </span>
                              <span className="leading-relaxed">{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BOTÃO FINAL DE ACESSO */}
                      <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                        <span className="text-xs text-slate-500">
                          Pronto para colocar em prática?
                        </span>
                        <Link href={doc.route}>
                          <Button size="sm" className="h-8 gap-1.5 text-xs font-bold rounded-lg shadow-xs">
                            <span>Ir para a tela {doc.title}</span>
                            <ArrowRightIcon size={13} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}
