"use client";

import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  DollarSignIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  criarFiadoAction,
  atualizarFiadoAction,
  receberPagamentoFiadoAction,
  inativarFiadoAction,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BankAccount, CustomerLedger } from "@fsw/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
};

interface FiadosClientProps {
  slug: string;
  fiados: CustomerLedger[];
  contas: BankAccount[];
}

function FiadoForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: CustomerLedger;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fiado-name" className="text-xs font-semibold text-slate-700">
          Nome do Cliente
        </Label>
        <Input
          id="fiado-name"
          name="customerName"
          placeholder="Nome completo do cliente"
          defaultValue={defaultValues?.customerName}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fiado-cpf" className="text-xs font-semibold text-slate-700">
            CPF
          </Label>
          <Input
            id="fiado-cpf"
            name="customerCpf"
            placeholder="000.000.000-00"
            defaultValue={defaultValues?.customerCpf ?? ""}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fiado-phone" className="text-xs font-semibold text-slate-700">
            Telefone / WhatsApp
          </Label>
          <Input
            id="fiado-phone"
            name="customerPhone"
            placeholder="(00) 00000-0000"
            defaultValue={defaultValues?.customerPhone ?? ""}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fiado-limit" className="text-xs font-semibold text-slate-700">
          Limite de Crédito Autorizado (R$)
        </Label>
        <Input
          id="fiado-limit"
          name="creditLimit"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValues ? String(defaultValues.creditLimit) : "100.00"}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fiado-notes" className="text-xs font-semibold text-slate-700">
          Observações
        </Label>
        <Input
          id="fiado-notes"
          name="notes"
          placeholder="Ex.: Parente do vizinho, paga sempre no dia 15"
          defaultValue={defaultValues?.notes ?? ""}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
        />
      </div>

      <Button
        type="submit"
        className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? "Salvando..." : defaultValues ? "Salvar Alterações" : "Cadastrar Cliente"}
      </Button>
    </form>
  );
}

function PagamentoForm({
  fiado,
  contas,
  onSubmit,
  isPending,
}: {
  fiado: CustomerLedger;
  contas: BankAccount[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
        <p className="font-semibold text-slate-900">{fiado.customerName}</p>
        <p className="mt-1 text-slate-500">
          Saldo devedor atual:{" "}
          <strong className="font-bold text-rose-700">{formatCurrency(fiado.debtBalance)}</strong>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pag-amount" className="text-xs font-semibold text-slate-700">
          Valor do Pagamento (R$)
        </Label>
        <Input
          id="pag-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={String(fiado.debtBalance)}
          defaultValue={String(fiado.debtBalance)}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          required
        />
      </div>

      {contas.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="pag-conta" className="text-xs font-semibold text-slate-700">
            Conta de Destino (Opcional)
          </Label>
          <select
            id="pag-conta"
            name="bankAccountId"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
          >
            <option value="">Nenhuma (lançamento avulso)</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pag-desc" className="text-xs font-semibold text-slate-700">
          Descrição
        </Label>
        <Input
          id="pag-desc"
          name="description"
          defaultValue="Recebimento de fiado"
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
        />
      </div>

      <Button
        type="submit"
        className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? "Registrando..." : "Confirmar Recebimento"}
      </Button>
    </form>
  );
}

export function FiadosClient({ slug, fiados, contas }: FiadosClientProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editFiado, setEditFiado] = useState<CustomerLedger | null>(null);
  const [pagamentoFiado, setPagamentoFiado] = useState<CustomerLedger | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = fiados.filter(
    (f) =>
      f.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (f.customerPhone?.includes(search) ?? false),
  );

  const totalDevedor = fiados.reduce((sum, f) => sum + f.debtBalance, 0);
  const totalComDebito = fiados.filter((f) => f.debtBalance > 0).length;
  const totalEmDia = fiados.filter((f) => f.debtBalance === 0).length;

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await criarFiadoAction(slug, fd);
        toast.success("Cliente cadastrado no livro de fiados!");
        setCreateOpen(false);
      } catch {
        toast.error("Erro ao cadastrar cliente.");
      }
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editFiado) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await atualizarFiadoAction(slug, editFiado.id, fd);
        toast.success("Cadastro atualizado com sucesso!");
        setEditFiado(null);
      } catch {
        toast.error("Erro ao atualizar cadastro.");
      }
    });
  };

  const handlePagamento = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pagamentoFiado) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await receberPagamentoFiadoAction(slug, pagamentoFiado.id, fd);
        toast.success("Pagamento registrado com sucesso!");
        setPagamentoFiado(null);
      } catch {
        toast.error("Erro ao registrar pagamento.");
      }
    });
  };

  const handleInativar = (ledgerId: string, name: string) => {
    if (!confirm(`Deseja inativar o cliente "${name}" do livro de fiados?`)) return;
    startTransition(async () => {
      try {
        await inativarFiadoAction(slug, ledgerId);
        toast.success(`Cliente "${name}" inativado.`);
      } catch {
        toast.error("Erro ao inativar cliente.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Dialogs ────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <BookOpenIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Novo Cliente no Livro de Fiados
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cadastre o cliente para autorizar e controlar vendas a prazo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <FiadoForm onSubmit={handleCreate} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={editFiado !== null} onOpenChange={(o) => !o && setEditFiado(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Cadastro de Fiado
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editFiado?.customerName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editFiado && (
            <FiadoForm
              key={editFiado.id}
              defaultValues={editFiado}
              onSubmit={handleUpdate}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pagamentoFiado !== null}
        onOpenChange={(o) => !o && setPagamentoFiado(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <DollarSignIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Receber Pagamento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Baixa de dívida de {pagamentoFiado?.customerName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {pagamentoFiado && (
            <PagamentoForm
              fiado={pagamentoFiado}
              contas={contas}
              onSubmit={handlePagamento}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <BookOpenIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Livro de Fiados
            </h1>
            <p className="text-sm text-slate-500">
              Controle vendas a prazo, limites autorizados por cliente e recebimentos pendentes.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={16} />
          <span>Novo Cliente</span>
        </Button>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Clientes
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <UsersIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {fiados.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Cadastrados no livro
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total a Receber
              </span>
              <div className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
                <DollarSignIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-rose-700">
              {formatCurrency(totalDevedor)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Soma das dívidas em aberto
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Com Débito Ativo
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <AlertCircleIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {totalComDebito}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Clientes devendo no momento
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saldo Quitado
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {totalEmDia}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Sem pendências financeiras
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filtros ─────────────────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar cliente por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500">
              Exibindo <strong className="font-semibold text-slate-900">{filtered.length}</strong> de{" "}
              {fiados.length} cliente{fiados.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela e Cards ───────────────────────────────── */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <BookOpenIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhum cliente encontrado
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {search
                ? "Tente ajustar os termos da busca para encontrar o cliente desejado."
                : "Nenhum cliente cadastrado no livro de fiados ainda."}
            </p>
            {search ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
                className="mt-4 gap-1.5 rounded-full border-slate-200 text-xs"
              >
                Limpar busca
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <PlusIcon size={14} />
                Cadastrar primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-[280px] text-xs font-semibold text-slate-700">
                      Cliente
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">
                      Contato
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">
                      Limite de Crédito
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">
                      Saldo Devedor
                    </TableHead>
                    <TableHead className="w-[160px] text-right text-xs font-semibold text-slate-700">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filtered.map((fiado) => {
                    const disponivel = fiado.creditLimit - fiado.debtBalance;
                    const isOverLimit = fiado.debtBalance >= fiado.creditLimit;

                    return (
                      <TableRow
                        key={fiado.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        {/* Cliente */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                              {getInitials(fiado.customerName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {fiado.customerName}
                              </p>
                              {fiado.customerCpf && (
                                <p className="truncate font-mono text-xs text-slate-400">
                                  {fiado.customerCpf}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Contato */}
                        <TableCell className="py-3.5 text-xs text-slate-600">
                          {fiado.customerPhone ? (
                            <span className="flex items-center gap-1">
                              <PhoneIcon size={12} className="text-slate-400" />
                              {fiado.customerPhone}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Limite */}
                        <TableCell className="py-3.5 text-right">
                          <p className="text-xs font-semibold text-slate-900">
                            {formatCurrency(fiado.creditLimit)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Disp.:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                disponivel <= 0 ? "text-rose-600" : "text-emerald-600",
                              )}
                            >
                              {formatCurrency(Math.max(0, disponivel))}
                            </span>
                          </p>
                        </TableCell>

                        {/* Saldo Devedor */}
                        <TableCell className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isOverLimit && (
                              <Badge variant="danger" className="text-[11px]">
                                Limite
                              </Badge>
                            )}
                            <span
                              className={cn(
                                "font-semibold",
                                fiado.debtBalance > 0 ? "text-rose-700" : "text-emerald-700",
                              )}
                            >
                              {formatCurrency(fiado.debtBalance)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {fiado.debtBalance > 0 && (
                              <Button
                                size="sm"
                                onClick={() => setPagamentoFiado(fiado)}
                                className="h-8 gap-1 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                              >
                                Receber
                              </Button>
                            )}

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
                                <DropdownMenuItem
                                  onClick={() => setEditFiado(fiado)}
                                  className="gap-2 rounded-lg text-xs font-medium text-slate-700"
                                >
                                  <PencilIcon size={14} />
                                  Editar dados
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem
                                  onClick={() => handleInativar(fiado.id, fiado.customerName)}
                                  className="gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  <XCircleIcon size={14} />
                                  Inativar cliente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {filtered.map((fiado) => (
                <div key={fiado.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-bold text-slate-700">
                        {getInitials(fiado.customerName)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{fiado.customerName}</p>
                        <p className="text-xs text-slate-500">{fiado.customerPhone || "Sem telefone"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {fiado.debtBalance > 0 && (
                        <Button
                          size="sm"
                          onClick={() => setPagamentoFiado(fiado)}
                          className="h-7 rounded-full bg-emerald-600 px-2.5 text-xs text-white"
                        >
                          Receber
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400"
                        onClick={() => setEditFiado(fiado)}
                      >
                        <PencilIcon size={13} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <div>
                      <span className="text-slate-400">Limite: </span>
                      <strong className="font-semibold text-slate-700">
                        {formatCurrency(fiado.creditLimit)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Dívida: </span>
                      <strong
                        className={cn(
                          "font-bold",
                          fiado.debtBalance > 0 ? "text-rose-700" : "text-emerald-700",
                        )}
                      >
                        {formatCurrency(fiado.debtBalance)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
