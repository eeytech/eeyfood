"use client";

import type { MenuCategory, Product, Restaurant } from "@fsw/db";
import {
  AlertCircleIcon,
  BadgeDollarSignIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterXIcon,
  LayersIcon,
  LoaderCircleIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  TruckIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusRegraFreteGratisAction,
  criarRegraFreteGratisAction,
  atualizarRegraFreteGratisAction,
  excluirRegraFreteGratisAction,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RegraFreteGratisComDetalhes } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";

type FreeDeliveryCriterion =
  | "MIN_ORDER_VALUE"
  | "FIRST_PURCHASE"
  | "CATEGORY"
  | "PRODUCT";

interface FreteClientProps {
  slug: string;
  restaurant: Restaurant;
  regras: RegraFreteGratisComDetalhes[];
  categorias: MenuCategory[];
  produtos: Array<Product & { categoryName?: string; categoryId?: string }>;
}

const CRITERION_CONFIG: Record<
  FreeDeliveryCriterion,
  {
    label: string;
    badgeLabel: string;
    icon: typeof TruckIcon;
    badgeClass: string;
    badgeColor: string;
    description: string;
  }
> = {
  MIN_ORDER_VALUE: {
    label: "Valor Mínimo de Pedido",
    badgeLabel: "Valor Mínimo",
    icon: BadgeDollarSignIcon,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80",
    badgeColor: "purple",
    description: "Aplicado a qualquer pedido que alcance ou ultrapasse o valor estipulado.",
  },
  FIRST_PURCHASE: {
    label: "Primeira Compra do Cliente",
    badgeLabel: "1ª Compra",
    icon: SparklesIcon,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    badgeColor: "emerald",
    description: "Aplicado automaticamente ao primeiro pedido realizado pelo cliente no estabelecimento.",
  },
  CATEGORY: {
    label: "Categoria do Cardápio",
    badgeLabel: "Categoria",
    icon: LayersIcon,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
    badgeColor: "amber",
    description: "Aplicado quando o cliente adiciona pelo menos um produto da categoria selecionada.",
  },
  PRODUCT: {
    label: "Produto Específico",
    badgeLabel: "Produto",
    icon: PackageIcon,
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    badgeColor: "sky",
    description: "Aplicado quando o pedido contém um produto promocional ou combo específico.",
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDateDisplay = (date: Date | string | null | undefined) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return null;
  }
};

const toDatetimeString = (date: Date | string | null | undefined) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY_FORM = {
  name: "",
  criterion: "MIN_ORDER_VALUE" as FreeDeliveryCriterion,
  minOrderValue: "50,00",
  menuCategoryId: "",
  productId: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

export function FreteClient({
  slug,
  restaurant,
  regras: initialRegras,
  categorias,
  produtos,
}: FreteClientProps) {
  const [regras, setRegras] = useState(initialRegras);
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RegraFreteGratisComDetalhes | null>(null);
  const [deletingRule, setDeletingRule] = useState<RegraFreteGratisComDetalhes | null>(null);

  // Form State
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [criterionFilter, setCriterionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Simulator
  const [simulatedSubtotal, setSimulatedSubtotal] = useState(45.0);

  // Statistics
  const totalCount = regras.length;
  const activeCount = regras.filter((r) => r.isActive).length;
  const activeMinRule = regras
    .filter((r) => r.isActive && r.criterion === "MIN_ORDER_VALUE")
    .sort((a, b) => Number(a.minOrderValue) - Number(b.minOrderValue))[0];

  const uniqueOccasionsCount = new Set(regras.filter((r) => r.isActive).map((r) => r.criterion)).size;

  const currentGeneralThreshold =
    activeMinRule != null
      ? Number(activeMinRule.minOrderValue)
      : restaurant.freeDeliveryThreshold != null
      ? Number(restaurant.freeDeliveryThreshold)
      : 0;

  // Currency input handler
  const handleCurrencyChange = (valueStr: string) => {
    const digits = valueStr.replace(/\D/g, "");
    if (!digits) {
      setForm((prev) => ({ ...prev, minOrderValue: "0,00" }));
      return;
    }
    const numeric = parseInt(digits, 10) / 100;
    setForm((prev) => ({
      ...prev,
      minOrderValue: numeric.toFixed(2).replace(".", ","),
    }));
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormError(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rule: RegraFreteGratisComDetalhes) => {
    setEditingRule(rule);
    setFormError(null);
    setForm({
      name: rule.name,
      criterion: (rule.criterion as FreeDeliveryCriterion) || "MIN_ORDER_VALUE",
      minOrderValue: Number(rule.minOrderValue || 0).toFixed(2).replace(".", ","),
      menuCategoryId: rule.menuCategoryId || "",
      productId: rule.productId || "",
      startsAt: toDatetimeString(rule.startsAt),
      endsAt: toDatetimeString(rule.endsAt),
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRule(null);
    setFormError(null);
  };

  const handleSaveRule = () => {
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Informe uma descrição para a regra.");
      return;
    }

    if (form.criterion === "CATEGORY" && !form.menuCategoryId) {
      setFormError("Selecione uma categoria do cardápio.");
      return;
    }

    if (form.criterion === "PRODUCT" && !form.productId) {
      setFormError("Selecione um produto específico.");
      return;
    }

    const formData = new FormData();
    formData.set("name", form.name.trim());
    formData.set("criterion", form.criterion);
    formData.set("minOrderValue", form.minOrderValue);
    formData.set("menuCategoryId", form.menuCategoryId || "");
    formData.set("productId", form.productId || "");
    formData.set("isActive", form.isActive ? "true" : "false");
    formData.set("startsAt", form.startsAt || "");
    formData.set("endsAt", form.endsAt || "");

    startTransition(async () => {
      let result;
      if (editingRule) {
        result = await atualizarRegraFreteGratisAction(slug, editingRule.id, formData);
      } else {
        result = await criarRegraFreteGratisAction(slug, formData);
      }

      if (result.success) {
        toast.success(
          editingRule
            ? "Regra de frete grátis atualizada com sucesso!"
            : "Regra de frete grátis criada com sucesso!",
        );
        handleCloseDialog();
        window.location.reload();
      } else {
        setFormError(result.error ?? "Erro ao salvar a regra.");
        toast.error(result.error ?? "Erro ao salvar a regra.");
      }
    });
  };

  const handleToggleStatus = (rule: RegraFreteGratisComDetalhes, newStatus: boolean) => {
    // Optimistic UI update
    setRegras((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, isActive: newStatus } : r)),
    );

    startTransition(async () => {
      const result = await alternarStatusRegraFreteGratisAction(slug, rule.id, newStatus);
      if (result.success) {
        toast.success(
          newStatus
            ? `Regra "${rule.name}" ativada.`
            : `Regra "${rule.name}" desativada.`,
        );
      } else {
        // Rollback
        setRegras((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, isActive: !newStatus } : r)),
        );
        toast.error(result.error ?? "Erro ao alterar status da regra.");
      }
    });
  };

  const handleDeleteRule = () => {
    if (!deletingRule) return;

    startTransition(async () => {
      const result = await excluirRegraFreteGratisAction(slug, deletingRule.id);
      if (result.success) {
        toast.success(`Regra "${deletingRule.name}" excluída com sucesso!`);
        setRegras((prev) => prev.filter((r) => r.id !== deletingRule.id));
        setDeletingRule(null);
      } else {
        toast.error(result.error ?? "Erro ao excluir a regra.");
      }
    });
  };

  // Filter & Search Logic
  const filteredRegras = useMemo(() => {
    return regras.filter((rule) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = rule.name.toLowerCase().includes(query);
        const matchesCategory = rule.menuCategory?.name?.toLowerCase().includes(query);
        const matchesProduct = rule.product?.name?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesProduct) {
          return false;
        }
      }

      if (criterionFilter !== "ALL" && rule.criterion !== criterionFilter) {
        return false;
      }

      if (statusFilter === "ACTIVE" && !rule.isActive) return false;
      if (statusFilter === "INACTIVE" && rule.isActive) return false;

      return true;
    });
  }, [regras, searchQuery, criterionFilter, statusFilter]);

  const isFiltering =
    searchQuery.trim() !== "" || criterionFilter !== "ALL" || statusFilter !== "ALL";

  const totalPages = Math.ceil(filteredRegras.length / pageSize) || 1;
  const paginatedRegras = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRegras.slice(start, start + pageSize);
  }, [filteredRegras, currentPage, pageSize]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setCriterionFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  // Simulator check
  const simRemaining = Math.max(currentGeneralThreshold - simulatedSubtotal, 0);
  const simAchieved = currentGeneralThreshold > 0 && simRemaining === 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <TruckIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Frete Grátis
            </h1>
            <p className="text-sm text-slate-500">
              Configure campanhas e benefícios de frete grátis para diversas ocasiões: valor mínimo, primeira compra, categoria ou produto específico.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={16} />
          <span>Nova Regra</span>
        </Button>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total de Regras
              </span>
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <TruckIcon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Cadastradas no sistema</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Regras Ativas
              </span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-600">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount > 0
                ? `${Math.round((activeCount / totalCount) * 100)}% em vigor`
                : "Nenhuma ativa"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ocasiões
              </span>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <SparklesIcon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {uniqueOccasionsCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {uniqueOccasionsCount === 1 ? "1 critério ativo" : `${uniqueOccasionsCount} critérios ativos`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Valor Mín. Geral
              </span>
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <BadgeDollarSignIcon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-purple-700">
              {currentGeneralThreshold > 0 ? formatCurrency(currentGeneralThreshold) : "Não definido"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {currentGeneralThreshold > 0 ? "Barra de progresso ativa" : "Sem limiar geral"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Bar ── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por descrição, categoria ou produto..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pl-9 rounded-xl border-slate-200 bg-slate-50/50 text-sm focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Criterion Filter */}
              <div className="w-full sm:w-48">
                <Select
                  value={criterionFilter}
                  onValueChange={(val) => {
                    setCriterionFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Ocasião..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todas as ocasiões</SelectItem>
                    <SelectItem value="MIN_ORDER_VALUE">Valor Mínimo</SelectItem>
                    <SelectItem value="FIRST_PURCHASE">Primeira Compra</SelectItem>
                    <SelectItem value="CATEGORY">Categoria</SelectItem>
                    <SelectItem value="PRODUCT">Produto Específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-40">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativas</SelectItem>
                    <SelectItem value="INACTIVE">Inativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isFiltering && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-10 gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <FilterXIcon className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Exibindo{" "}
              <strong className="font-semibold text-slate-900">
                {filteredRegras.length}
              </strong>{" "}
              de {totalCount} regra{totalCount !== 1 ? "s" : ""}
            </span>
            {isFiltering && (
              <span className="text-[11px] font-medium text-amber-600">
                Filtros ativos
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Rules Table ── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {filteredRegras.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <TruckIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhuma regra de frete grátis encontrada
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os filtros ou a busca para localizar as regras cadastradas."
                : "Você ainda não configurou regras de frete grátis. Crie regras para incentivar compras de maior valor ou atrair novos clientes!"}
            </p>
            {isFiltering ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="mt-4 gap-1.5 rounded-xl text-xs"
              >
                <FilterXIcon className="h-3.5 w-3.5" />
                Limpar Filtros
              </Button>
            ) : (
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="mt-4 gap-1.5 rounded-xl text-xs"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Criar Primeira Regra
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="w-24 text-center text-xs font-semibold text-slate-600">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Descrição
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Ocasião
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Condição de Aplicação
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Validade
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs font-semibold text-slate-600 pr-4">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRegras.map((rule) => {
                  const criterion =
                    (rule.criterion as FreeDeliveryCriterion) || "MIN_ORDER_VALUE";
                  const config = CRITERION_CONFIG[criterion] || CRITERION_CONFIG.MIN_ORDER_VALUE;
                  const CriterionIcon = config.icon;
                  const minOrder = Number(rule.minOrderValue || 0);

                  return (
                    <TableRow
                      key={rule.id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      {/* Status */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) => handleToggleStatus(rule, checked)}
                            disabled={isPending}
                          />
                          <span
                            className={cn(
                              "text-[10px] font-semibold",
                              rule.isActive ? "text-emerald-600" : "text-slate-400",
                            )}
                          >
                            {rule.isActive ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Descrição */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                              config.badgeClass,
                            )}
                          >
                            <CriterionIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {rule.name}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Ocasião */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-semibold", config.badgeClass)}
                        >
                          {config.badgeLabel}
                        </Badge>
                      </TableCell>

                      {/* Condição de Aplicação */}
                      <TableCell>
                        <div className="text-xs">
                          {criterion === "MIN_ORDER_VALUE" && (
                            <span className="font-semibold text-slate-900">
                              Pedidos a partir de {formatCurrency(minOrder)}
                            </span>
                          )}

                          {criterion === "FIRST_PURCHASE" && (
                            <div>
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <SparklesIcon className="h-3 w-3" />
                                1º Pedido do Cliente
                              </span>
                              {minOrder > 0 && (
                                <span className="text-slate-500 ml-1">
                                  (mín. {formatCurrency(minOrder)})
                                </span>
                              )}
                            </div>
                          )}

                          {criterion === "CATEGORY" && (
                            <div>
                              <span className="font-semibold text-slate-900">
                                Categoria: {rule.menuCategory?.name || "Todas"}
                              </span>
                              {minOrder > 0 && (
                                <p className="text-slate-500">
                                  Mínimo: {formatCurrency(minOrder)}
                                </p>
                              )}
                            </div>
                          )}

                          {criterion === "PRODUCT" && (
                            <div>
                              <span className="font-semibold text-slate-900">
                                Produto: {rule.product?.name || "Item promocional"}
                              </span>
                              {minOrder > 0 && (
                                <p className="text-slate-500">
                                  Mínimo: {formatCurrency(minOrder)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Validade */}
                      <TableCell>
                        <div className="text-xs text-slate-600">
                          {rule.startsAt || rule.endsAt ? (
                            <div className="flex flex-col gap-0.5">
                              {rule.startsAt && (
                                <span>De: {formatDateDisplay(rule.startsAt)}</span>
                              )}
                              {rule.endsAt && (
                                <span>Até: {formatDateDisplay(rule.endsAt)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Sem limite de data</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(rule)}
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            title="Editar regra"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingRule(rule)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Excluir regra"
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Simulator / How it Works Card ── */}
      <Card className="border-slate-200/80 bg-gradient-to-r from-slate-50 to-orange-50/20 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <TruckIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Como funciona a validação de frete grátis no aplicativo?
                </h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Ao finalizar a compra, o sistema analisa todas as regras ativas de frete grátis. Se o cliente cumprir
                  qualquer uma das ocasiões (seja por valor mínimo, primeira compra ou itens participantes no carrinho), a taxa de entrega é zerada automaticamente no checkout!
                </p>
              </div>
            </div>

            {currentGeneralThreshold > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs md:w-80 shrink-0">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Simulador de Carrinho</span>
                  <Badge variant="outline" className="text-[10px]">
                    Limiar: {formatCurrency(currentGeneralThreshold)}
                  </Badge>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Subtotal:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSimulatedSubtotal((v) => Math.max(v - 10, 0))}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                      -10
                    </button>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(simulatedSubtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSimulatedSubtotal((v) => v + 10)}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                      +10
                    </button>
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        simAchieved ? "bg-emerald-500" : "bg-primary",
                      )}
                      style={{
                        width: `${Math.min((simulatedSubtotal / currentGeneralThreshold) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="mt-2 text-center text-[11px] font-medium text-slate-600">
                  {simAchieved ? (
                    <span className="font-semibold text-emerald-600">
                      🎉 Frete Grátis garantido!
                    </span>
                  ) : (
                    <span>
                      Faltam apenas{" "}
                      <strong className="text-primary font-bold">
                        {formatCurrency(simRemaining)}
                      </strong>{" "}
                      para o frete grátis
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Dialog Create / Edit ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white p-6 shadow-xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              {editingRule ? "Editar Regra de Frete Grátis" : "Nova Regra de Frete Grátis"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina a ocasião e as condições para conceder frete grátis aos seus clientes.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircleIcon className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-name" className="text-xs font-semibold text-slate-700">
                Descrição
              </Label>
              <Input
                id="rule-name"
                placeholder="Ex: Frete Grátis na 1ª Compra, Hambúrgueres com Frete Grátis..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 bg-white text-sm"
              />
            </div>

            {/* Ocasião de Aplicação */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-criterion" className="text-xs font-semibold text-slate-700">
                Critério de Aplicação
              </Label>
              <Select
                value={form.criterion}
                onValueChange={(val: FreeDeliveryCriterion) => {
                  setForm((f) => ({
                    ...f,
                    criterion: val,
                    minOrderValue: val === "MIN_ORDER_VALUE" ? (f.minOrderValue === "0,00" ? "50,00" : f.minOrderValue) : "0,00",
                  }));
                }}
              >
                <SelectTrigger id="rule-criterion" className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                  <SelectValue placeholder="Selecione a ocasião..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
                  <SelectItem value="MIN_ORDER_VALUE">
                    <div className="flex items-center gap-2">
                      <BadgeDollarSignIcon className="h-4 w-4 text-purple-600" />
                      <span>Valor Mínimo de Pedido</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="FIRST_PURCHASE">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-emerald-600" />
                      <span>Primeira Compra do Cliente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="CATEGORY">
                    <div className="flex items-center gap-2">
                      <LayersIcon className="h-4 w-4 text-amber-600" />
                      <span>Categoria do Cardápio</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PRODUCT">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="h-4 w-4 text-sky-600" />
                      <span>Produto Específico</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FIRST_PURCHASE Info Callout */}
            {form.criterion === "FIRST_PURCHASE" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                <SparklesIcon className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <p className="leading-relaxed">
                  Esta regra será aplicada automaticamente aos clientes que nunca realizaram pedidos anteriores no restaurante.
                </p>
              </div>
            )}

            {/* CATEGORY Select */}
            {form.criterion === "CATEGORY" && (
              <div className="space-y-1.5">
                <Label htmlFor="rule-category" className="text-xs font-semibold text-slate-700">
                  Categoria do Cardápio
                </Label>
                <Select
                  value={form.menuCategoryId}
                  onValueChange={(val) => setForm((f) => ({ ...f, menuCategoryId: val }))}
                >
                  <SelectTrigger id="rule-category" className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 rounded-xl border-slate-200 bg-white shadow-xl">
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* PRODUCT Select */}
            {form.criterion === "PRODUCT" && (
              <div className="space-y-1.5">
                <Label htmlFor="rule-product" className="text-xs font-semibold text-slate-700">
                  Produto Específico
                </Label>
                <Select
                  value={form.productId}
                  onValueChange={(val) => setForm((f) => ({ ...f, productId: val }))}
                >
                  <SelectTrigger id="rule-product" className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 rounded-xl border-slate-200 bg-white shadow-xl">
                    {produtos.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{prod.name}</span>
                          <span className="text-xs text-slate-400">
                            {formatCurrency(Number(prod.price))}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Valor Mínimo */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-min-value" className="text-xs font-semibold text-slate-700">
                {form.criterion === "MIN_ORDER_VALUE"
                  ? "Valor Mínimo do Pedido (R$)"
                  : "Valor Mínimo do Pedido (R$, opcional)"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  R$
                </span>
                <Input
                  id="rule-min-value"
                  value={form.minOrderValue}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="h-10 pl-9 rounded-xl border-slate-200 bg-white text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {form.criterion === "MIN_ORDER_VALUE"
                  ? "Pedidos a partir deste valor ganham frete grátis."
                  : "Deixe R$ 0,00 se desejar aplicar o benefício para qualquer valor de pedido."}
              </p>
            </div>

            {/* Validity Dates with Shadcn DatePicker */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rule-starts-at" className="text-xs font-semibold text-slate-700">
                  Data de Início
                </Label>
                <DatePicker
                  id="rule-starts-at"
                  name="startsAt"
                  value={form.startsAt}
                  onChange={(_, str) => setForm((f) => ({ ...f, startsAt: str }))}
                  withTime
                  placeholder="Início..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-ends-at" className="text-xs font-semibold text-slate-700">
                  Data de Término
                </Label>
                <DatePicker
                  id="rule-ends-at"
                  name="endsAt"
                  value={form.endsAt}
                  onChange={(_, str) => setForm((f) => ({ ...f, endsAt: str }))}
                  withTime
                  placeholder="Término..."
                />
              </div>
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div>
                <Label htmlFor="rule-active" className="text-xs font-semibold text-slate-800">
                  Regra Ativa
                </Label>
                <p className="text-[11px] text-slate-500">
                  Determina se esta regra de frete grátis está em vigor no estabelecimento.
                </p>
              </div>
              <Switch
                id="rule-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isPending}
              className="rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveRule}
              disabled={isPending}
              className="rounded-xl gap-1.5"
            >
              {isPending && <LoaderCircleIcon className="h-4 w-4 animate-spin" />}
              {editingRule ? "Salvar Alterações" : "Criar Regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Delete Confirmation ── */}
      <Dialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Excluir Regra de Frete Grátis
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tem certeza que deseja excluir a regra &quot;{deletingRule?.name}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingRule(null)}
              disabled={isPending}
              className="rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteRule}
              disabled={isPending}
              className="rounded-xl gap-1.5"
            >
              {isPending && <LoaderCircleIcon className="h-4 w-4 animate-spin" />}
              Excluir Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
