"use client";

import {
  BanknoteIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  createFinancialCategoryAction,
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
  updateTransactionStatusAction,
} from "@/app/[slug]/financeiro-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

const statusVariant: Record<string, "secondary" | "success" | "danger"> = {
  PENDING: "secondary",
  PAID: "success",
  CANCELLED: "danger",
};

function TransactionsTable({
  items,
  isPending,
  onEdit,
  onDelete,
  onStatusUpdate,
}: {
  items: TransactionWithCategory[];
  isPending: boolean;
  onEdit: (tx: FinancialTransaction) => void;
  onDelete: (id: string) => void;
  onStatusUpdate: (id: string, status: "PAID" | "CANCELLED") => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BanknoteIcon size={24} className="text-slate-200" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma transação encontrada.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.transaction.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.transaction.dueDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.transaction.type === "REVENUE" ? (
                        <TrendingUpIcon
                          size={14}
                          className="shrink-0 text-emerald-600"
                        />
                      ) : (
                        <TrendingDownIcon
                          size={14}
                          className="shrink-0 text-rose-600"
                        />
                      )}
                      <span className="font-medium">
                        {item.transaction.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.category?.name ?? "Geral"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${item.transaction.type === "REVENUE" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {item.transaction.type === "REVENUE" ? "+" : "−"}{" "}
                    {formatCurrency(item.transaction.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusVariant[item.transaction.status] ?? "secondary"
                      }
                    >
                      {statusLabel[item.transaction.status] ??
                        item.transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {item.transaction.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Marcar como Pago"
                          onClick={() =>
                            onStatusUpdate(item.transaction.id, "PAID")
                          }
                          disabled={isPending}
                        >
                          <TrendingUpIcon size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(item.transaction)}
                      >
                        <PencilIcon size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => onDelete(item.transaction.id)}
                        disabled={isPending}
                      >
                        <Trash2Icon size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function FinanceiroClient({
  slug,
  transacoes,
  categorias,
  receitasPendentes,
  despesasPendentes,
}: FinanceiroClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createTransactionOpen, setCreateTransactionOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editTransaction, setEditTransaction] =
    useState<FinancialTransaction | null>(null);

  const [isPending, startTransition] = useTransition();

  const applyFilters = (items: TransactionWithCategory[]) =>
    items.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.transaction.description
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (item.category?.name.toLowerCase().includes(search.toLowerCase()) ??
          false);
      const matchesStatus =
        statusFilter === "all" || item.transaction.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  const allFiltered = applyFilters(transacoes);
  const revenueFiltered = applyFilters(
    transacoes.filter((i) => i.transaction.type === "REVENUE"),
  );
  const expenseFiltered = applyFilters(
    transacoes.filter((i) => i.transaction.type === "EXPENSE"),
  );

  const handleDelete = (transactionId: string) => {
    startTransition(async () => {
      await deleteTransactionAction(slug, transactionId);
    });
  };

  const handleStatusUpdate = (
    transactionId: string,
    status: "PAID" | "CANCELLED",
  ) => {
    startTransition(async () => {
      await updateTransactionStatusAction(slug, transactionId, status);
    });
  };

  const handleCreateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createTransactionAction(slug, formData);
      setCreateTransactionOpen(false);
    });
  };

  const handleUpdateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTransaction) return;
    const formData = new FormData(e.currentTarget);
    formData.set("transactionId", editTransaction.id);
    startTransition(async () => {
      await updateTransactionAction(slug, formData);
      setEditTransaction(null);
    });
  };

  const handleCreateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createFinancialCategoryAction(slug, formData);
      setCreateCategoryOpen(false);
    });
  };

  return (
    <div className="space-y-4">
      {/* Create Transaction Dialog */}
      <Dialog
        open={createTransactionOpen}
        onOpenChange={setCreateTransactionOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova transação</DialogTitle>
            <DialogDescription>
              Lance uma receita ou despesa no fluxo de caixa.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            slug={slug}
            categorias={categorias}
            onSubmit={handleCreateTransaction}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog
        open={editTransaction !== null}
        onOpenChange={(open) => !open && setEditTransaction(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
            <DialogDescription>{editTransaction?.description}</DialogDescription>
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

      {/* Create Category Dialog */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>
              Organize suas transações com categorias.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nome da categoria</Label>
              <Input
                id="cat-name"
                name="name"
                placeholder="Ex.: Insumos, Pessoal, Infra"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-type">Tipo</Label>
              <select
                id="cat-type"
                name="type"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="EXPENSE">Despesa</option>
                <option value="REVENUE">Receita</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Criando..." : "Criar categoria"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-emerald-100 bg-emerald-50">
          <CardHeader className="pb-2">
            <p className="text-xs text-emerald-700">Receitas a Receber</p>
            <CardTitle className="text-lg text-emerald-900">
              {formatCurrency(receitasPendentes)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-rose-100 bg-rose-50">
          <CardHeader className="pb-2">
            <p className="text-xs text-rose-700">Contas a Pagar</p>
            <CardTitle className="text-lg text-rose-900">
              {formatCurrency(despesasPendentes)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">
            Gestão Financeira
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Controle suas contas a pagar e receber, categorize despesas e
            acompanhe o fluxo de caixa.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateCategoryOpen(true)}
          >
            <TagIcon size={14} />
            Nova categoria
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateTransactionOpen(true)}
          >
            <PlusIcon size={14} />
            Nova transação
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <SearchIcon
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-md pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="PENDING">Pendentes</option>
          <option value="PAID">Pagas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
        <span className="shrink-0 text-sm text-muted-foreground">
          {allFiltered.length}{" "}
          {allFiltered.length === 1 ? "transação" : "transações"}
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas ({allFiltered.length})</TabsTrigger>
          <TabsTrigger value="revenue">
            <TrendingUpIcon size={13} />
            Receitas ({revenueFiltered.length})
          </TabsTrigger>
          <TabsTrigger value="expense">
            <TrendingDownIcon size={13} />
            Despesas ({expenseFiltered.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-3">
          <TransactionsTable
            items={allFiltered}
            isPending={isPending}
            onEdit={setEditTransaction}
            onDelete={handleDelete}
            onStatusUpdate={handleStatusUpdate}
          />
        </TabsContent>
        <TabsContent value="revenue" className="mt-3">
          <TransactionsTable
            items={revenueFiltered}
            isPending={isPending}
            onEdit={setEditTransaction}
            onDelete={handleDelete}
            onStatusUpdate={handleStatusUpdate}
          />
        </TabsContent>
        <TabsContent value="expense" className="mt-3">
          <TransactionsTable
            items={expenseFiltered}
            isPending={isPending}
            onEdit={setEditTransaction}
            onDelete={handleDelete}
            onStatusUpdate={handleStatusUpdate}
          />
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
        <Label htmlFor="tx-description">Descrição</Label>
        <Input
          id="tx-description"
          name="description"
          placeholder="Ex.: Aluguel, Compra de Carne"
          defaultValue={defaultValues?.description}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">Valor</Label>
          <Input
            id="tx-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultValues ? String(defaultValues.amount) : ""}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-dueDate">Vencimento</Label>
          <Input
            id="tx-dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaultDate}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-type">Tipo</Label>
          <select
            id="tx-type"
            name="type"
            defaultValue={defaultValues?.type ?? "EXPENSE"}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="EXPENSE">Despesa (Pagar)</option>
            <option value="REVENUE">Receita (Receber)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-status">Status</Label>
          <select
            id="tx-status"
            name="status"
            defaultValue={defaultValues?.status ?? "PENDING"}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="PENDING">Pendente</option>
            <option value="PAID">Pago / Recebido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-category">Categoria</Label>
        <select
          id="tx-category"
          name="categoryId"
          defaultValue={defaultValues?.categoryId ?? ""}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Sem categoria</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.type === "REVENUE" ? "Rec." : "Desp."})
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? defaultValues
            ? "Salvando..."
            : "Lançando..."
          : defaultValues
            ? "Salvar transação"
            : "Lançar transação"}
      </Button>
    </form>
  );
}
