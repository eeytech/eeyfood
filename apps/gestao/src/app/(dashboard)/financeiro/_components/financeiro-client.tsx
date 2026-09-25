"use client";

import {
  BanknoteIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterXIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createFinancialCategoryAction,
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
  updateTransactionStatusAction,
} from "@/app/(dashboard)/financeiro-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { FinancialCategory, FinancialTransaction } from "@fsw/db";

interface TransactionWithCategory {
  transaction: FinancialTransaction;
  category: { id: string; name: string; type: string } | null;
}

interface FinanceiroClientProps {
  slug: string;
  transacoes: TransactionWithCategory[];
  categorias: FinancialCategory[];
  receitasPendentes: number;
  despesasPendentes: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Data indisp.";
  }
}

const statusConfig: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: "Pendente",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  PAID: {
    label: "Pago / Recebido",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  },
  CANCELLED: {
    label: "Cancelado",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export function FinanceiroClient({
  slug,
  transacoes,
  categorias,
  receitasPendentes,
  despesasPendentes,
}: FinanceiroClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "revenue" | "expense">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createTransactionOpen, setCreateTransactionOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editTransaction, setEditTransaction] =
    useState<FinancialTransaction | null>(null);

  const [isPending, startTransition] = useTransition();

  const isFiltering =
    search.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  const applyFilters = (items: TransactionWithCategory[]) =>
    items.filter((item) => {
      // Search text
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesDesc = item.transaction.description
          .toLowerCase()
          .includes(query);
        const matchesCat =
          item.category?.name.toLowerCase().includes(query) ?? false;
        if (!matchesDesc && !matchesCat) return false;
      }

      // Status
      if (statusFilter !== "all" && item.transaction.status !== statusFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== "all" && item.transaction.categoryId !== categoryFilter) {
        return false;
      }

      return true;
    });

  const allFiltered = useMemo(() => applyFilters(transacoes), [transacoes, search, statusFilter, categoryFilter]);
  const revenueFiltered = useMemo(
    () => applyFilters(transacoes.filter((i) => i.transaction.type === "REVENUE")),
    [transacoes, search, statusFilter, categoryFilter],
  );
  const expenseFiltered = useMemo(
    () => applyFilters(transacoes.filter((i) => i.transaction.type === "EXPENSE")),
    [transacoes, search, statusFilter, categoryFilter],
  );

  const currentTabItems =
    activeTab === "revenue"
      ? revenueFiltered
      : activeTab === "expense"
        ? expenseFiltered
        : allFiltered;

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(currentTabItems.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = currentTabItems.slice(startIndex, endIndex);

  const handleDelete = (transactionId: string, description: string) => {
    if (!confirm(`Deseja realmente excluir a transação "${description}"?`)) return;
    startTransition(async () => {
      try {
        await deleteTransactionAction(slug, transactionId);
        toast.success(`Transação "${description}" excluída.`);
      } catch {
        toast.error("Não foi possível excluir a transação.");
      }
    });
  };

  const handleStatusUpdate = (
    transactionId: string,
    status: "PAID" | "CANCELLED",
    description: string,
  ) => {
    startTransition(async () => {
      try {
        await updateTransactionStatusAction(slug, transactionId, status);
        toast.success(
          `Transação "${description}" marcada como ${status === "PAID" ? "paga" : "cancelada"}.`,
        );
      } catch {
        toast.error("Não foi possível atualizar o status.");
      }
    });
  };

  const handleCreateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createTransactionAction(slug, formData);
        toast.success("Transação lançada com sucesso!");
        setCreateTransactionOpen(false);
      } catch {
        toast.error("Erro ao lançar transação.");
      }
    });
  };

  const handleUpdateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTransaction) return;
    const formData = new FormData(e.currentTarget);
    formData.set("transactionId", editTransaction.id);
    startTransition(async () => {
      try {
        await updateTransactionAction(slug, formData);
        toast.success("Transação atualizada com sucesso!");
        setEditTransaction(null);
      } catch {
        toast.error("Erro ao atualizar transação.");
      }
    });
  };

  const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createFinancialCategoryAction(slug, formData);
        toast.success("Categoria criada com sucesso!");
        setCreateCategoryOpen(false);
      } catch {
        toast.error("Erro ao criar categoria.");
      }
    });
  };

  const netProjected = receitasPendentes - despesasPendentes;

  return (
    <div className="space-y-6">
      {/* ── Dialogs: Lançamento / Edição / Categoria ───── */}
      <Dialog
        open={createTransactionOpen}
        onOpenChange={setCreateTransactionOpen}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <ReceiptIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Nova Transação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Lance uma receita ou despesa no fluxo de caixa do restaurante.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <TransactionForm
            slug={slug}
            categorias={categorias}
            onSubmit={handleCreateTransaction}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTransaction !== null}
        onOpenChange={(open) => !open && setEditTransaction(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Transação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editTransaction?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editTransaction && (
            <TransactionForm
              key={editTransaction.id}
              slug={slug}
              categorias={categorias}
              defaultValues={editTransaction}
              onSubmit={handleUpdateTransaction}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <TagIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Nova Categoria Financeira
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Organize suas transações categorizando custos e fontes de receita.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-xs font-semibold text-slate-700">
                Nome da Categoria
              </Label>
              <Input
                id="cat-name"
                name="name"
                placeholder="Ex.: Insumos, Aluguel, Pessoal"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-type" className="text-xs font-semibold text-slate-700">
                Natureza
              </Label>
              <select
                id="cat-type"
                name="type"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
                required
              >
                <option value="EXPENSE">Despesa (Contas a Pagar)</option>
                <option value="REVENUE">Receita (Contas a Receber)</option>
              </select>
            </div>
            <Button
              type="submit"
              className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? "Criando..." : "Criar Categoria"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <BanknoteIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Gestão Financeira
            </h1>
            <p className="text-sm text-slate-500">
              Controle seu fluxo de caixa, contas a pagar e receber, categorias e conciliação bancária.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCreateCategoryOpen(true)}
            className="h-10 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            <TagIcon size={14} />
            <span>Nova Categoria</span>
          </Button>
          <Button
            onClick={() => setCreateTransactionOpen(true)}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <PlusIcon size={16} />
            <span>Nova Transação</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Lançamentos
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <ReceiptIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {transacoes.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {transacoes.filter((t) => t.transaction.status === "PAID").length} quitadas no fluxo
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Receitas a Receber
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {formatCurrency(receitasPendentes)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {transacoes.filter((t) => t.transaction.type === "REVENUE" && t.transaction.status === "PENDING").length} recebimento(s) pendente(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Contas a Pagar
              </span>
              <div className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
                <TrendingDownIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-rose-700">
              {formatCurrency(despesasPendentes)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {transacoes.filter((t) => t.transaction.type === "EXPENSE" && t.transaction.status === "PENDING").length} pagamento(s) pendente(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saldo Previsto
              </span>
              <div
                className={cn(
                  "rounded-lg p-1.5",
                  netProjected >= 0 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700",
                )}
              >
                <BanknoteIcon size={16} />
              </div>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-bold",
                netProjected >= 0 ? "text-blue-700" : "text-amber-700",
              )}
            >
              {formatCurrency(netProjected)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Projeção de fluxo pendente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filtros ─────────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por descrição ou categoria..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            {/* Selects: Status e Categoria */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-44">
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
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="PENDING">Pendentes</SelectItem>
                    <SelectItem value="PAID">Pagos / Recebidos</SelectItem>
                    <SelectItem value="CANCELLED">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-48">
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    setCategoryFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                    <SelectValue placeholder="Categoria..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({cat.type === "REVENUE" ? "Rec." : "Desp."})
                      </SelectItem>
                    ))}
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

          {/* Contador de resultados */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Exibindo <strong className="font-semibold text-slate-900">{currentTabItems.length}</strong> de{" "}
              {transacoes.length} lançamento{transacoes.length !== 1 ? "s" : ""}
            </span>
            {isFiltering && (
              <span className="text-[11px] font-medium text-amber-600">
                Filtros aplicados
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Abas de Natureza (Todas / Receitas / Despesas) ── */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as "all" | "revenue" | "expense");
          setCurrentPage(1);
        }}
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs">
            <TabsTrigger
              value="all"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              Todas ({allFiltered.length})
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <TrendingUpIcon size={13} className="mr-1.5 text-emerald-600" />
              Receitas ({revenueFiltered.length})
            </TabsTrigger>
            <TabsTrigger
              value="expense"
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <TrendingDownIcon size={13} className="mr-1.5 text-rose-600" />
              Despesas ({expenseFiltered.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Container da Tabela e Cards ── */}
        <TabsContent value={activeTab} className="mt-4">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            {currentTabItems.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
                  <ReceiptIcon size={32} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhuma transação encontrada
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {isFiltering
                    ? "Tente ajustar os termos da busca ou limpar os filtros para visualizar outros lançamentos."
                    : "Nenhuma transação registrada nesta aba ainda. Comece lançando uma receita ou despesa!"}
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
                    onClick={() => setCreateTransactionOpen(true)}
                    className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <PlusIcon size={14} />
                    Lançar primeira transação
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Visualização Desktop */}
                <div className="hidden overflow-x-auto sm:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="w-[140px] text-xs font-semibold text-slate-700">
                          Vencimento
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">
                          Descrição
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-700">
                          Categoria
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-700">
                          Valor
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
                      {paginatedItems.map((item) => {
                        const isRevenue = item.transaction.type === "REVENUE";
                        const st = statusConfig[item.transaction.status] ?? {
                          label: item.transaction.status,
                          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                        };

                        return (
                          <TableRow
                            key={item.transaction.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            {/* Data */}
                            <TableCell className="py-3.5 text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <CalendarIcon size={12} className="shrink-0 text-slate-400" />
                                <span>{formatDate(item.transaction.dueDate)}</span>
                              </div>
                            </TableCell>

                            {/* Descrição */}
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                    isRevenue
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700",
                                  )}
                                >
                                  {isRevenue ? (
                                    <TrendingUpIcon size={14} />
                                  ) : (
                                    <TrendingDownIcon size={14} />
                                  )}
                                </div>
                                <span className="font-semibold text-slate-900">
                                  {item.transaction.description}
                                </span>
                              </div>
                            </TableCell>

                            {/* Categoria */}
                            <TableCell className="py-3.5">
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                {item.category?.name ?? "Geral"}
                              </span>
                            </TableCell>

                            {/* Valor */}
                            <TableCell
                              className={cn(
                                "py-3.5 text-right font-semibold",
                                isRevenue ? "text-emerald-700" : "text-rose-700",
                              )}
                            >
                              {isRevenue ? "+" : "−"} {formatCurrency(item.transaction.amount)}
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3.5 text-center">
                              <Badge
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  st.badgeClass,
                                )}
                              >
                                {st.label}
                              </Badge>
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
                                    Opções do Lançamento
                                  </DropdownMenuLabel>
                                  {item.transaction.status === "PENDING" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleStatusUpdate(
                                          item.transaction.id,
                                          "PAID",
                                          item.transaction.description,
                                        )
                                      }
                                      className="gap-2 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 focus:bg-emerald-50"
                                    >
                                      <CheckCircle2Icon size={14} className="text-emerald-600" />
                                      Marcar como Quitado
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setEditTransaction(item.transaction)}
                                    className="gap-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100"
                                  >
                                    <PencilIcon size={14} className="text-slate-500" />
                                    Editar lançamento
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-slate-100" />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDelete(
                                        item.transaction.id,
                                        item.transaction.description,
                                      )
                                    }
                                    className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                                  >
                                    <Trash2Icon size={14} />
                                    Excluir lançamento
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

                {/* Visualização Mobile */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {paginatedItems.map((item) => {
                    const isRevenue = item.transaction.type === "REVENUE";
                    const st = statusConfig[item.transaction.status] ?? {
                      label: item.transaction.status,
                      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                    };

                    return (
                      <div key={item.transaction.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                                isRevenue
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700",
                              )}
                            >
                              {isRevenue ? (
                                <TrendingUpIcon size={15} />
                              ) : (
                                <TrendingDownIcon size={15} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {item.transaction.description}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-slate-500">
                                <CalendarIcon size={11} className="text-slate-400" />
                                {formatDate(item.transaction.dueDate)}
                              </p>
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
                              {item.transaction.status === "PENDING" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(
                                      item.transaction.id,
                                      "PAID",
                                      item.transaction.description,
                                    )
                                  }
                                  className="gap-2 rounded-lg text-xs font-medium text-emerald-700"
                                >
                                  <CheckCircle2Icon size={14} />
                                  Marcar como Quitado
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setEditTransaction(item.transaction)}
                                className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                              >
                                <PencilIcon size={14} />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDelete(
                                    item.transaction.id,
                                    item.transaction.description,
                                  )
                                }
                                className="gap-2 rounded-lg text-xs font-medium text-red-600"
                              >
                                <Trash2Icon size={14} />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {item.category?.name ?? "Geral"}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                isRevenue ? "text-emerald-700" : "text-rose-700",
                              )}
                            >
                              {isRevenue ? "+" : "−"} {formatCurrency(item.transaction.amount)}
                            </span>
                            <Badge className={cn("text-[11px]", st.badgeClass)}>
                              {st.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paginação */}
                <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                      <SelectContent className="rounded-lg border-slate-200 bg-white shadow-lg">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>por página</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="text-xs text-slate-500">
                      Página <strong className="font-semibold text-slate-900">{validCurrentPage}</strong> de{" "}
                      <strong className="font-semibold text-slate-900">{totalPages}</strong>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TransactionFormProps {
  slug: string;
  categorias: FinancialCategory[];
  defaultValues?: FinancialTransaction;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}

function TransactionForm({
  categorias,
  defaultValues,
  onSubmit,
  isPending,
}: TransactionFormProps) {
  const defaultDate = defaultValues?.dueDate
    ? new Date(defaultValues.dueDate).toISOString().split("T")[0]
    : "";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tx-description" className="text-xs font-semibold text-slate-700">
          Descrição
        </Label>
        <Input
          id="tx-description"
          name="description"
          placeholder="Ex.: Aluguel do imóvel, Compra de carne, Fornecedor bebidas"
          defaultValue={defaultValues?.description}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-amount" className="text-xs font-semibold text-slate-700">
            Valor (R$)
          </Label>
          <Input
            id="tx-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultValues ? String(defaultValues.amount) : ""}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-dueDate" className="text-xs font-semibold text-slate-700">
            Data de Vencimento
          </Label>
          <DatePicker
            id="tx-dueDate"
            name="dueDate"
            defaultValue={defaultDate}
            required
            placeholder="Data de vencimento"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-type" className="text-xs font-semibold text-slate-700">
            Natureza da Operação
          </Label>
          <select
            id="tx-type"
            name="type"
            defaultValue={defaultValues?.type ?? "EXPENSE"}
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
            required
          >
            <option value="EXPENSE">Despesa (Contas a Pagar)</option>
            <option value="REVENUE">Receita (Contas a Receber)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-status" className="text-xs font-semibold text-slate-700">
            Status
          </Label>
          <select
            id="tx-status"
            name="status"
            defaultValue={defaultValues?.status ?? "PENDING"}
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
            required
          >
            <option value="PENDING">Pendente</option>
            <option value="PAID">Pago / Recebido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-category" className="text-xs font-semibold text-slate-700">
          Categoria
        </Label>
        <select
          id="tx-category"
          name="categoryId"
          defaultValue={defaultValues?.categoryId ?? ""}
          className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
        >
          <option value="">Sem categoria (Geral)</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.type === "REVENUE" ? "Receita" : "Despesa"})
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Lançando..."
          : defaultValues
            ? "Salvar Alterações"
            : "Lançar no Fluxo de Caixa"}
      </Button>
    </form>
  );
}
