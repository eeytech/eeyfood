"use client";

import type { MenuCategory, Product } from "@fsw/db";
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  FilterXIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PercentIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  alternarStatusLoyaltyRuleAction,
  createLoyaltyRuleAction,
  deleteLoyaltyRuleAction,
  updateLoyaltyRuleAction,
} from "@/app/(dashboard)/cashback-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { RegraLoyaltyComDetalhes } from "@/lib/admin-queries";
import { cn } from "@/lib/utils";

type CriterionType = "minOrderValue" | "category" | "product";

interface CashbackClientProps {
  slug: string;
  regras: RegraLoyaltyComDetalhes[];
  categorias: MenuCategory[];
  produtos: Array<Product & { categoryName: string; categoryId: string }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDatetime(date: Date | string | null | undefined) {
  if (!date) return "—";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

function toDatetimeLocal(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ruleCriterionType(rule: RegraLoyaltyComDetalhes): CriterionType {
  if (rule.productId) return "product";
  if (rule.menuCategoryId) return "category";
  return "minOrderValue";
}

const EMPTY_FORM = {
  name: "",
  cashbackPercent: "",
  criterionType: "minOrderValue" as CriterionType,
  minOrderValue: "0",
  menuCategoryId: "",
  productId: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

export function CashbackClient({
  slug,
  regras,
  categorias,
  produtos,
}: CashbackClientProps) {
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RegraLoyaltyComDetalhes | null>(
    null,
  );
  const [deletingRule, setDeletingRule] =
    useState<RegraLoyaltyComDetalhes | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [criterionFilter, setCriterionFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("RECENT");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Metric stats
  const totalCount = regras.length;
  const activeCount = regras.filter((r) => r.isActive).length;
  const activeRules = regras.filter((r) => r.isActive);
  const avgPercent =
    activeRules.length > 0
      ? (
          activeRules.reduce((acc, r) => acc + r.cashbackPercent, 0) /
          activeRules.length
        ).toFixed(1)
      : "0";

  const categoryOrProductCount = regras.filter(
    (r) => r.menuCategoryId || r.productId,
  ).length;

  // Filtered & Sorted list
  const filteredRegras = useMemo(() => {
    return regras
      .filter((r) => {
        // Search term
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesName = r.name.toLowerCase().includes(query);
          const matchesProduct = (r.product?.name || "")
            .toLowerCase()
            .includes(query);
          const matchesCategory = (r.menuCategory?.name || "")
            .toLowerCase()
            .includes(query);
          if (!matchesName && !matchesProduct && !matchesCategory) return false;
        }

        // Status filter
        if (statusFilter === "ACTIVE" && !r.isActive) return false;
        if (statusFilter === "INACTIVE" && r.isActive) return false;

        // Criterion filter
        const cType = ruleCriterionType(r);
        if (criterionFilter !== "ALL" && cType !== criterionFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "RECENT") {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        }
        if (sortBy === "PERCENT_DESC") {
          return b.cashbackPercent - a.cashbackPercent;
        }
        if (sortBy === "PERCENT_ASC") {
          return a.cashbackPercent - b.cashbackPercent;
        }
        if (sortBy === "NAME") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [regras, searchQuery, statusFilter, criterionFilter, sortBy]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredRegras.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRegras = filteredRegras.slice(startIndex, endIndex);

  const isFiltering =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    criterionFilter !== "ALL" ||
    sortBy !== "RECENT";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCriterionFilter("ALL");
    setSortBy("RECENT");
    setCurrentPage(1);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (rule: RegraLoyaltyComDetalhes) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      cashbackPercent: String(rule.cashbackPercent),
      criterionType: ruleCriterionType(rule),
      minOrderValue: String(rule.minOrderValue),
      menuCategoryId: rule.menuCategoryId ?? "",
      productId: rule.productId ?? "",
      startsAt: toDatetimeLocal(rule.startsAt),
      endsAt: toDatetimeLocal(rule.endsAt),
      isActive: rule.isActive,
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Submit Form
  const handleSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    if (form.isActive) {
      formData.set("isActive", "on");
    } else {
      formData.delete("isActive");
    }

    startTransition(async () => {
      if (editingRule) {
        formData.set("ruleId", editingRule.id);
        const result = await updateLoyaltyRuleAction(slug, formData);
        if (result.error) {
          setFormError(result.error);
          toast.error(result.error);
        } else {
          toast.success(`Regra "${form.name}" atualizada com sucesso!`);
          setIsCreateOpen(false);
          setEditingRule(null);
        }
      } else {
        const result = await createLoyaltyRuleAction(slug, formData);
        if (result.error) {
          setFormError(result.error);
          toast.error(result.error);
        } else {
          toast.success(`Regra "${form.name}" cadastrada com sucesso!`);
          setIsCreateOpen(false);
        }
      }
    });
  };

  // Toggle Status via Switch
  const handleToggleStatus = (
    ruleId: string,
    currentStatus: boolean,
    ruleName: string,
  ) => {
    startTransition(async () => {
      const result = await alternarStatusLoyaltyRuleAction(
        ruleId,
        !currentStatus,
        slug,
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Regra "${ruleName}" ${!currentStatus ? "ativada" : "desativada"} com sucesso.`,
        );
      }
    });
  };

  // Confirm Delete
  const handleDeleteConfirm = () => {
    if (!deletingRule) return;
    const formData = new FormData();
    formData.set("ruleId", deletingRule.id);

    startTransition(async () => {
      const result = await deleteLoyaltyRuleAction(slug, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Regra "${deletingRule.name}" excluída com sucesso.`);
        setDeletingRule(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <CoinsIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Regras de Cashback
            </h1>
            <p className="text-sm text-slate-500">
              Incentive a recorrência com créditos em cashback por valor de pedido, categoria ou produtos selecionados.
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

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total de Regras */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Regras
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <CoinsIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} ativas no restaurante
            </p>
          </CardContent>
        </Card>

        {/* Regras Ativas */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Regras Ativas
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Gerando crédito para clientes
            </p>
          </CardContent>
        </Card>

        {/* Cashback Médio */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cashback Médio
              </span>
              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                <PercentIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-indigo-700">
              {avgPercent}%
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Retorno médio por pedido
            </p>
          </CardContent>
        </Card>

        {/* Segmentação */}
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Segmentadas
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <SparklesIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {categoryOrProductCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Regras por produto ou categoria
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Card ────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por nome da regra, produto ou categoria..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="w-full sm:w-36">
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
                    <SelectValue placeholder="Critério de aplicação..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="ALL">Todos os critérios</SelectItem>
                    <SelectItem value="minOrderValue">Valor Mínimo de Pedido</SelectItem>
                    <SelectItem value="category">Categoria do Cardápio</SelectItem>
                    <SelectItem value="product">Produto Específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="w-full sm:w-44">
                <Select
                  value={sortBy}
                  onValueChange={(val) => {
                    setSortBy(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Ordenar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="RECENT">Mais recentes</SelectItem>
                    <SelectItem value="PERCENT_DESC">Maior cashback (%)</SelectItem>
                    <SelectItem value="PERCENT_ASC">Menor cashback (%)</SelectItem>
                    <SelectItem value="NAME">Nome (A-Z)</SelectItem>
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
                  <FilterXIcon size={14} />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Results counter indicator */}
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
                Filtros aplicados
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Table & List Container ───────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {filteredRegras.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <CoinsIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhuma regra encontrada
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {isFiltering
                ? "Tente ajustar os termos da busca ou limpar os filtros para visualizar outras regras de cashback."
                : "Nenhuma regra de cashback cadastrada neste restaurante ainda. Comece configurando sua primeira regra!"}
            </p>
            {isFiltering ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="mt-4 gap-1.5 rounded-full border-slate-200 text-xs"
              >
                <FilterXIcon size={14} />
                Limpar filtros
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <PlusIcon size={14} />
                Criar primeira regra
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-[300px] text-xs font-semibold text-slate-700">
                      Regra de Cashback
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Retorno (%)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Critério de Aplicação
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Vigência
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-700">
                      Status
                    </TableHead>
                    <TableHead className="w-[80px] text-right text-xs font-semibold text-slate-700">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {paginatedRegras.map((rule) => {
                    const cType = ruleCriterionType(rule);

                    return (
                      <TableRow
                        key={rule.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        {/* Nome da Regra */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                              <CoinsIcon size={16} className="text-slate-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {rule.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                Criada em {formatDatetime(rule.createdAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Retorno */}
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            {rule.cashbackPercent}% Cashback
                          </span>
                        </TableCell>

                        {/* Critério */}
                        <TableCell className="py-3.5">
                          {cType === "product" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                              <PackageIcon size={12} className="shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {rule.product?.name ?? "Produto"}
                              </span>
                            </span>
                          ) : cType === "category" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/80 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800">
                              <TagIcon size={12} className="shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {rule.menuCategory?.name ?? "Categoria"}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              <CircleDollarSignIcon size={12} className="shrink-0" />
                              {rule.minOrderValue > 0
                                ? `Mínimo: ${formatCurrency(rule.minOrderValue)}`
                                : "Qualquer valor"}
                            </span>
                          )}
                        </TableCell>

                        {/* Vigência */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarIcon size={12} className="shrink-0 text-slate-400" />
                            <span>
                              {rule.startsAt || rule.endsAt
                                ? `${formatDatetime(rule.startsAt)} → ${formatDatetime(rule.endsAt)}`
                                : "Sem validade"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Status Switch */}
                        <TableCell className="py-3.5 text-center">
                          <div className="inline-flex items-center gap-2">
                            <Switch
                              checked={rule.isActive}
                              disabled={isPending}
                              onCheckedChange={() =>
                                handleToggleStatus(
                                  rule.id,
                                  rule.isActive,
                                  rule.name,
                                )
                              }
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                            />
                            <span
                              className={cn(
                                "text-xs font-medium",
                                rule.isActive ? "text-emerald-700" : "text-slate-400",
                              )}
                            >
                              {rule.isActive ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="py-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <MoreHorizontalIcon size={16} />
                                <span className="sr-only">Opções</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                            >
                              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                                Opções da Regra
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(rule)}
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                <PencilIcon size={14} className="text-slate-500" />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(
                                    rule.id,
                                    rule.isActive,
                                    rule.name,
                                  )
                                }
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                              >
                                {rule.isActive ? (
                                  <>
                                    <AlertCircleIcon
                                      size={14}
                                      className="text-amber-500"
                                    />
                                    Desativar regra
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2Icon
                                      size={14}
                                      className="text-emerald-600"
                                    />
                                    Ativar regra
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() => setDeletingRule(rule)}
                                className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                              >
                                <Trash2Icon size={14} />
                                Excluir regra
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {paginatedRegras.map((rule) => {
                const cType = ruleCriterionType(rule);

                return (
                  <div key={rule.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {rule.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            {rule.cashbackPercent}% Cashback
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <MoreHorizontalIcon size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl border-slate-200 bg-white p-1 text-slate-900 shadow-xl"
                        >
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(rule)}
                            className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <PencilIcon size={14} />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStatus(
                                rule.id,
                                rule.isActive,
                                rule.name,
                              )
                            }
                            className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                          >
                            {rule.isActive ? (
                              <>
                                <AlertCircleIcon size={14} className="text-amber-500" />
                                Desativar regra
                              </>
                            ) : (
                              <>
                                <CheckCircle2Icon
                                  size={14}
                                  className="text-emerald-600"
                                />
                                Ativar regra
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          <DropdownMenuItem
                            onClick={() => setDeletingRule(rule)}
                            className="gap-2 rounded-lg text-xs font-medium text-red-600"
                          >
                            <Trash2Icon size={14} />
                            Excluir regra
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="pt-1">
                      {cType === "product" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          <PackageIcon size={11} />
                          {rule.product?.name ?? "Produto"}
                        </span>
                      ) : cType === "category" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/80 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                          <TagIcon size={11} />
                          {rule.menuCategory?.name ?? "Categoria"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          <CircleDollarSignIcon size={11} />
                          {rule.minOrderValue > 0
                            ? `Mín: ${formatCurrency(rule.minOrderValue)}`
                            : "Sem valor mínimo"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <div className="flex items-center gap-1 text-slate-400">
                        <CalendarIcon size={12} />
                        <span>
                          {rule.startsAt || rule.endsAt
                            ? `${formatDatetime(rule.startsAt)} → ${formatDatetime(rule.endsAt)}`
                            : "Sem validade"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            rule.isActive ? "text-emerald-700" : "text-slate-400",
                          )}
                        >
                          {rule.isActive ? "Ativa" : "Inativa"}
                        </span>
                        <Switch
                          checked={rule.isActive}
                          disabled={isPending}
                          onCheckedChange={() =>
                            handleToggleStatus(
                              rule.id,
                              rule.isActive,
                              rule.name,
                            )
                          }
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Items per page selector */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Exibir</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 bg-white">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>regras por página</span>
              </div>

              {/* Page numbers & navigations */}
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-xs text-slate-500">
                  Página{" "}
                  <strong className="font-semibold text-slate-900">
                    {validCurrentPage}
                  </strong>{" "}
                  de{" "}
                  <strong className="font-semibold text-slate-900">
                    {totalPages}
                  </strong>
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Primeira página"
                  >
                    <ChevronsLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Página anterior"
                  >
                    <ChevronLeftIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Próxima página"
                  >
                    <ChevronRightIcon size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    title="Última página"
                  >
                    <ChevronsRightIcon size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Dialog: Criar / Editar Regra ─────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                {editingRule ? <PencilIcon size={20} /> : <PlusIcon size={20} />}
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  {editingRule ? "Editar Regra" : "Nova Regra de Cashback"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editingRule
                    ? "Altere as configurações desta regra de fidelidade."
                    : "Configure a porcentagem de cashback e o critério de ativação."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rule-name" className="text-xs font-semibold text-slate-700">
                Descrição
              </Label>
              <Input
                id="rule-name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Cashback de Inauguração, Promoção Hambúrgueres"
                required
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="rule-percent"
                className="text-xs font-semibold text-slate-700"
              >
                Percentual de Retorno (%)
              </Label>
              <Input
                id="rule-percent"
                name="cashbackPercent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.cashbackPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cashbackPercent: e.target.value }))
                }
                required
                placeholder="Ex.: 5 ou 10.5"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Critério de Aplicação
              </Label>
              <Select
                name="criterionType"
                value={form.criterionType}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    criterionType: v as CriterionType,
                    minOrderValue: "0",
                    menuCategoryId: "",
                    productId: "",
                  }))
                }
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                  <SelectItem value="minOrderValue">Valor Mínimo do Pedido</SelectItem>
                  <SelectItem value="category">Categoria do Cardápio</SelectItem>
                  <SelectItem value="product">Produto Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.criterionType === "minOrderValue" && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="minOrderValue"
                  className="text-xs font-semibold text-slate-700"
                >
                  Valor Mínimo do Pedido (R$)
                </Label>
                <Input
                  id="minOrderValue"
                  name="minOrderValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrderValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minOrderValue: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 focus:border-slate-400"
                />
              </div>
            )}

            {form.criterionType === "category" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Categoria Vinculada
                </Label>
                <Select
                  name="menuCategoryId"
                  value={form.menuCategoryId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, menuCategoryId: v }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    {categorias.length === 0 ? (
                      <SelectItem value="NONE" disabled>
                        Nenhuma categoria cadastrada
                      </SelectItem>
                    ) : (
                      categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.criterionType === "product" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Produto Vinculado
                </Label>
                <Select
                  name="productId"
                  value={form.productId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, productId: v }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Selecione um produto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 rounded-xl border-slate-200 bg-white shadow-lg">
                    {produtos.length === 0 ? (
                      <SelectItem value="NONE" disabled>
                        Nenhum produto cadastrado
                      </SelectItem>
                    ) : (
                      produtos.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          <span>{prod.name}</span>
                          <span className="ml-1 text-slate-400">
                            — {prod.categoryName}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rule-start" className="text-xs font-semibold text-slate-700">
                  Início da Validade
                </Label>
                <Input
                  id="rule-start"
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAt: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-end" className="text-xs font-semibold text-slate-700">
                  Fim da Validade
                </Label>
                <Input
                  id="rule-end"
                  name="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: e.target.value }))
                  }
                  className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Regra ativa
                </p>
                <p className="text-[11px] text-slate-500">
                  Gera créditos em cashback nos pedidos elegíveis
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending && (
                  <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
                )}
                {isPending
                  ? "Salvando..."
                  : editingRule
                    ? "Salvar Alterações"
                    : "Criar Regra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão ─────────────────── */}
      <Dialog
        open={Boolean(deletingRule)}
        onOpenChange={(open) => {
          if (!open) setDeletingRule(null);
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <div className="rounded-xl bg-red-100 p-2 text-red-700">
                <Trash2Icon size={20} />
              </div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                Excluir Regra de Cashback
              </DialogTitle>
            </div>
            <DialogDescription className="pt-1 text-xs text-slate-500">
              Tem certeza que deseja remover a regra{" "}
              <strong className="font-semibold text-slate-900">
                {deletingRule?.name}
              </strong>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingRule(null)}
              className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleDeleteConfirm}
              className="rounded-full bg-red-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isPending && (
                <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
              )}
              {isPending ? "Excluindo..." : "Sim, excluir regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
