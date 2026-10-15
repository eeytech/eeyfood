"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ALL_MODULE_IDS,
  AVAILABLE_MODULES,
  PLAN_PRESETS,
  type PlanPresetId,
  type SystemModule,
} from "@fsw/db/modules-constants";
import {
  AlertCircleIcon,
  BarChart3Icon,
  BikeIcon,
  BookOpenIcon,
  BoxesIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  CoinsIcon,
  ConciergeBellIcon,
  GiftIcon,
  HeartHandshakeIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  Loader2Icon,
  LockIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MonitorSmartphoneIcon,
  RotateCcwIcon,
  SaveIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  TargetIcon,
  TvIcon,
  UnlockIcon,
  Users2Icon,
  UsersRoundIcon,
  UtensilsCrossedIcon,
  XCircleIcon,
} from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { updateRestaurantPlanAction } from "./plano-actions";

interface RestaurantPlanFormProps {
  slug: string;
  restaurantName: string;
  initialPlanName: string;
  initialEnabledModules?: string[] | null;
}

const getModuleIcon = (iconName: string) => {
  switch (iconName) {
    case "ClipboardListIcon":
      return ClipboardListIcon;
    case "MonitorSmartphoneIcon":
      return MonitorSmartphoneIcon;
    case "UsersRoundIcon":
      return UsersRoundIcon;
    case "LayoutGridIcon":
      return LayoutGridIcon;
    case "ConciergeBellIcon":
      return ConciergeBellIcon;
    case "BikeIcon":
      return BikeIcon;
    case "TvIcon":
      return TvIcon;
    case "UtensilsCrossedIcon":
      return UtensilsCrossedIcon;
    case "BoxesIcon":
      return BoxesIcon;
    case "CircleDollarSignIcon":
      return CircleDollarSignIcon;
    case "BarChart3Icon":
      return BarChart3Icon;
    case "HeartHandshakeIcon":
      return HeartHandshakeIcon;
    case "MegaphoneIcon":
      return MegaphoneIcon;
    case "TagIcon":
      return TagIcon;
    case "CoinsIcon":
      return CoinsIcon;
    case "GiftIcon":
      return GiftIcon;
    case "SparklesIcon":
      return SparklesIcon;
    case "TargetIcon":
      return TargetIcon;
    case "ShoppingBagIcon":
      return ShoppingBagIcon;
    case "MessageSquareIcon":
      return MessageSquareIcon;
    case "BookOpenIcon":
      return BookOpenIcon;
    case "Users2Icon":
      return Users2Icon;
    default:
      return SparklesIcon;
  }
};

const CATEGORIES: Array<{
  key: SystemModule["category"];
  label: string;
  description: string;
  color: string;
}> = [
  {
    key: "operacoes",
    label: "Operações & Atendimento",
    description: "Recepção de pedidos, frente de caixa, comandas, mesas, cozinha e despacho",
    color: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200",
  },
  {
    key: "catalogo",
    label: "Cardápio & Estoque",
    description: "Itens, adicionais, combos, ficha técnica e compras de mercadorias",
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200",
  },
  {
    key: "financeiro",
    label: "Financeiro & Métricas",
    description: "Fluxo de caixa, DRE gerencial, fiados, conciliação e relatórios",
    color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200",
  },
  {
    key: "marketing",
    label: "Marketing & Fidelidade",
    description: "CRM, cupons, programa de cashback, campanhas, frete e pixels de anúncio",
    color: "from-rose-500/10 to-pink-500/10 text-rose-600 border-rose-200",
  },
  {
    key: "integracoes",
    label: "Integrações & Inovação",
    description: "Marketplaces parceiros (iFood/Keeta), notificações WhatsApp e IA",
    color: "from-purple-500/10 to-violet-500/10 text-purple-600 border-purple-200",
  },
  {
    key: "gestao",
    label: "Gestão & Acessos",
    description: "Documentações de treinamento operacional e cadastro de usuários/cargos",
    color: "from-slate-500/10 to-gray-500/10 text-slate-700 border-slate-200",
  },
];

export const RestaurantPlanForm = ({
  slug,
  restaurantName,
  initialPlanName,
  initialEnabledModules,
}: RestaurantPlanFormProps) => {
  const [isPending, startTransition] = useTransition();

  // Se initialEnabledModules for nulo/indefinido (loja legada), inicia com todos liberados
  const defaultSelected = new Set(
    initialEnabledModules && Array.isArray(initialEnabledModules)
      ? initialEnabledModules
      : ALL_MODULE_IDS,
  );

  const [selectedModules, setSelectedModules] = useState<Set<string>>(defaultSelected);
  const [currentPlan, setCurrentPlan] = useState<string>(initialPlanName || "COMPLETO");
  const [searchFilter, setSearchFilter] = useState("");

  const totalModules = AVAILABLE_MODULES.length;
  const activeCount = selectedModules.size;
  const percentage = Math.round((activeCount / totalModules) * 100);

  // Aplica um dos planos pré-definidos
  const handleApplyPreset = (presetId: PlanPresetId) => {
    const preset = PLAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (presetId === "CUSTOM") {
      setCurrentPlan("CUSTOM");
      return;
    }

    setSelectedModules(new Set(preset.moduleIds));
    setCurrentPlan(preset.id);
    toast.info(`Preset "${preset.name}" selecionado. Clique em Salvar para aplicar.`);
  };

  // Alterna um módulo individual
  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }

      // Se a lista agora for diferente dos presets padrão, marca como CUSTOM
      const currentList = Array.from(next).sort().join(",");
      const matchingPreset = PLAN_PRESETS.find(
        (p) => p.id !== "CUSTOM" && p.moduleIds.slice().sort().join(",") === currentList,
      );

      if (matchingPreset) {
        setCurrentPlan(matchingPreset.id);
      } else {
        setCurrentPlan("CUSTOM");
      }

      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedModules(new Set(ALL_MODULE_IDS));
    setCurrentPlan("COMPLETO");
    toast.success("Todos os módulos foram selecionados!");
  };

  const handleDeselectAll = () => {
    setSelectedModules(new Set());
    setCurrentPlan("CUSTOM");
    toast.warning("Todos os módulos foram desmarcados.");
  };

  const handleReset = () => {
    setSelectedModules(new Set(defaultSelected));
    setCurrentPlan(initialPlanName || "COMPLETO");
    toast.info("Configuração restaurada para o estado salvo.");
  };

  const handleSave = () => {
    startTransition(async () => {
      const modulesArray = Array.from(selectedModules);
      const res = await updateRestaurantPlanAction(slug, currentPlan, modulesArray);

      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  // Filtragem dos módulos para busca rápida
  const filteredModules = AVAILABLE_MODULES.filter((m) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term) ||
      m.categoryLabel.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 pb-24">
      {/* ── Super Admin Shield Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs shadow-primary/25">
              <ShieldCheckIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Licenciamento & Módulos do Cliente
                </h3>
                <span className="rounded-full bg-primary/15 border border-primary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Área Exclusiva Super Admin
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-3xl">
                Controle aqui as funcionalidades comercializadas para{" "}
                <span className="font-semibold text-slate-900">"{restaurantName}"</span>. Módulos
                desativados serão completamente omitidos da barra lateral e terão as rotas bloqueadas
                para os usuários administradores, gerentes e operadores deste restaurante.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
              className="text-xs border-slate-300 hover:bg-slate-100"
            >
              <RotateCcwIcon size={14} className="mr-1.5 text-slate-500" />
              Restaurar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs text-xs font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2Icon size={14} className="mr-1.5 animate-spin" />
                  Salvando Plano...
                </>
              ) : (
                <>
                  <SaveIcon size={14} className="mr-1.5" />
                  Salvar Licença
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Plan Presets Selector ────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Planos e Pacotes Comerciais</h4>
            <p className="text-xs text-slate-500">
              Selecione um pacote pré-definido ou ajuste os módulos individualmente abaixo.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Plano selecionado:{" "}
            <strong className="text-primary font-bold">
              {currentPlan === "BASICO"
                ? "Plano Básico"
                : currentPlan === "INTERMEDIARIO"
                  ? "Plano Intermediário"
                  : currentPlan === "COMPLETO"
                    ? "Plano Completo / Enterprise"
                    : "Plano Personalizado"}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_PRESETS.map((preset) => {
            const isSelected = currentPlan === preset.id;
            const isFull = preset.id === "COMPLETO";
            const isCustom = preset.id === "CUSTOM";

            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {preset.badge}
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <CheckIcon size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <h5 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {preset.name}
                  </h5>

                  <p className="mt-1 text-xs text-slate-500 leading-snug line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-600">
                    {isCustom
                      ? `${activeCount} módulos custom`
                      : isFull
                        ? "Acesso Total (23)"
                        : `${preset.moduleIds.length} módulos inclusos`}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  >
                    {isSelected ? "Ativo" : "Selecionar"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Metric Summary & Fast Filter Bar ─────────────────────────── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Progress / Status */}
            <div className="flex items-center gap-4 min-w-[240px]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-primary font-bold text-sm">
                {percentage}%
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    {activeCount} de {totalModules} Módulos Liberados
                  </span>
                  <span className="text-slate-500">
                    {totalModules - activeCount} bloqueados
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] sm:min-w-[220px]">
                <SearchIcon
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  type="text"
                  placeholder="Filtrar funcionalidades..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50/70"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs hover:border-primary/40 hover:text-primary"
              >
                <UnlockIcon size={13} className="mr-1 text-primary" />
                Liberar Todos
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="h-8 text-xs text-rose-600 hover:text-rose-700"
              >
                <LockIcon size={13} className="mr-1" />
                Bloquear Todos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Categorized Module Cards Grid ────────────────────────────── */}
      <div className="space-y-6">
        {CATEGORIES.map((category) => {
          const categoryModules = filteredModules.filter(
            (m) => m.category === category.key,
          );

          if (categoryModules.length === 0) return null;

          const categoryActiveCount = categoryModules.filter((m) =>
            selectedModules.has(m.id),
          ).length;

          return (
            <div key={category.key} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{category.label}</h4>
                  <span className="text-[11px] text-slate-400 font-normal">
                    — {category.description}
                  </span>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {categoryActiveCount} de {categoryModules.length} ativos
                </span>
              </div>

              {/* Module cards grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categoryModules.map((mod) => {
                  const isEnabled = selectedModules.has(mod.id);
                  const Icon = getModuleIcon(mod.iconName);

                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-150 cursor-pointer select-none ${
                        isEnabled
                          ? "border-primary/30 bg-white shadow-xs hover:border-primary/50 hover:shadow-sm"
                          : "border-slate-200 bg-slate-50/60 opacity-70 hover:opacity-100 hover:bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                isEnabled
                                  ? "bg-primary/10 text-primary"
                                  : "bg-slate-200/70 text-slate-400"
                              }`}
                            >
                              <Icon size={18} />
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {mod.name}
                              </h5>
                              <span
                                className={`inline-block rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                  isEnabled
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {isEnabled ? "Habilitado no Plano" : "Bloqueado"}
                              </span>
                            </div>
                          </div>

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-0.5"
                          >
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleModule(mod.id)}
                              aria-label={`Alternar ${mod.name}`}
                            />
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-[10px] uppercase text-slate-400">
                          ID: {mod.id}
                        </span>
                        <span
                          className={`font-medium ${
                            isEnabled ? "text-primary" : "text-slate-400"
                          }`}
                        >
                          {isEnabled ? "Acesso Permitido" : "Oculto na Loja"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Floating Sticky Bottom Save Bar ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheckIcon size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Plano:{" "}
                <span className="text-primary font-bold">
                  {currentPlan === "BASICO"
                    ? "Básico"
                    : currentPlan === "INTERMEDIARIO"
                      ? "Intermediário"
                      : currentPlan === "COMPLETO"
                        ? "Completo (Enterprise)"
                        : "Personalizado"}
                </span>{" "}
                • {activeCount} de {totalModules} módulos ativos
              </p>
              <p className="text-[11px] text-slate-500">
                As alterações passarão a valer imediatamente para os usuários deste cliente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm px-4"
            >
              {isPending ? (
                <>
                  <Loader2Icon size={15} className="mr-1.5 animate-spin" />
                  Salvando Alterações...
                </>
              ) : (
                <>
                  <SaveIcon size={15} className="mr-1.5" />
                  Salvar Alterações do Plano
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
