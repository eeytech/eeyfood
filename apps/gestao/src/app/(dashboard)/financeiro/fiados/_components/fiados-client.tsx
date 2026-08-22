"use client";

import {
  BookOpenIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  criarFiadoAction,
  atualizarFiadoAction,
  receberPagamentoFiadoAction,
  inativarFiadoAction,
} from "../actions";
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
import type { BankAccount, CustomerLedger } from "@fsw/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

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
        <Label htmlFor="fiado-name">Nome do cliente</Label>
        <Input
          id="fiado-name"
          name="customerName"
          placeholder="Nome completo"
          defaultValue={defaultValues?.customerName}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fiado-phone">Telefone</Label>
          <Input
            id="fiado-phone"
            name="customerPhone"
            placeholder="(11) 99999-9999"
            defaultValue={defaultValues?.customerPhone ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fiado-cpf">CPF</Label>
          <Input
            id="fiado-cpf"
            name="customerCpf"
            placeholder="000.000.000-00"
            defaultValue={defaultValues?.customerCpf ?? ""}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fiado-limit">Limite de crédito (R$)</Label>
        <Input
          id="fiado-limit"
          name="creditLimit"
          type="number"
          step="0.01"
          min="0"
          defaultValue={String(defaultValues?.creditLimit ?? 200)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fiado-notes">Observações</Label>
        <Input
          id="fiado-notes"
          name="notes"
          placeholder="Informações adicionais"
          defaultValue={defaultValues?.notes ?? ""}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Salvando..."
          : defaultValues
            ? "Salvar alterações"
            : "Cadastrar cliente"}
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
      <div className="rounded-lg bg-rose-50 p-3 text-sm">
        <p className="text-rose-700">Saldo devedor atual</p>
        <p className="text-lg font-semibold text-rose-900">
          {formatCurrency(fiado.debtBalance)}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pag-amount">Valor do pagamento (R$)</Label>
        <Input
          id="pag-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={String(fiado.debtBalance)}
          required
        />
      </div>
      {contas.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="pag-conta">Conta de destino</Label>
          <select
            id="pag-conta"
            name="bankAccountId"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
        <Label htmlFor="pag-desc">Descrição</Label>
        <Input
          id="pag-desc"
          name="description"
          defaultValue="Pagamento de fiado"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Registrando..." : "Confirmar recebimento"}
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

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await criarFiadoAction(slug, fd);
      setCreateOpen(false);
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editFiado) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await atualizarFiadoAction(slug, editFiado.id, fd);
      setEditFiado(null);
    });
  };

  const handlePagamento = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pagamentoFiado) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await receberPagamentoFiadoAction(slug, pagamentoFiado.id, fd);
      setPagamentoFiado(null);
    });
  };

  const handleInativar = (ledgerId: string) => {
    if (!confirm("Inativar este cliente do livro de fiados?")) return;
    startTransition(async () => {
      await inativarFiadoAction(slug, ledgerId);
    });
  };

  return (
    <div className="space-y-4">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo cliente no Livro de Fiados</DialogTitle>
            <DialogDescription>
              Cadastre o cliente para registrar vendas a prazo.
            </DialogDescription>
          </DialogHeader>
          <FiadoForm onSubmit={handleCreate} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={editFiado !== null} onOpenChange={(o) => !o && setEditFiado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar cadastro</DialogTitle>
            <DialogDescription>{editFiado?.customerName}</DialogDescription>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receber Pagamento</DialogTitle>
            <DialogDescription>{pagamentoFiado?.customerName}</DialogDescription>
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Livro de Fiados</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Controle vendas a prazo e recebimentos de clientes cadastrados.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <PlusIcon size={14} />
          Novo cliente
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-rose-100 bg-rose-50">
          <CardHeader className="pb-2">
            <p className="text-xs text-rose-700">Total a Receber (Fiados)</p>
            <CardTitle className="text-lg text-rose-900">
              {formatCurrency(totalDevedor)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-100 bg-slate-50">
          <CardHeader className="pb-2">
            <p className="text-xs text-slate-600">Clientes Cadastrados</p>
            <CardTitle className="text-lg">{fiados.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="relative max-w-xs">
        <SearchIcon
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-white/60 text-muted-foreground">
          <BookOpenIcon size={28} className="text-slate-300" />
          <p className="text-sm">
            {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado no livro de fiados."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Contato</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Limite</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Saldo devedor</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fiado) => {
                const disponivel = fiado.creditLimit - fiado.debtBalance;
                const isOverLimit = fiado.debtBalance >= fiado.creditLimit;

                return (
                  <tr key={fiado.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <UserIcon size={14} className="shrink-0 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{fiado.customerName}</p>
                          {fiado.customerCpf && (
                            <p className="text-xs text-muted-foreground">{fiado.customerCpf}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {fiado.customerPhone ?? "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div>
                        <p>{formatCurrency(fiado.creditLimit)}</p>
                        <p className="text-xs text-muted-foreground">
                          Disponível:{" "}
                          <span className={disponivel < 0 ? "text-rose-600" : "text-emerald-600"}>
                            {formatCurrency(Math.max(0, disponivel))}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isOverLimit && <Badge variant="danger" className="text-xs">Limite atingido</Badge>}
                        <span
                          className={`font-semibold ${fiado.debtBalance > 0 ? "text-rose-700" : "text-emerald-700"}`}
                        >
                          {formatCurrency(fiado.debtBalance)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {fiado.debtBalance > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => setPagamentoFiado(fiado)}
                          >
                            Receber
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setEditFiado(fiado)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                          onClick={() => handleInativar(fiado.id)}
                          disabled={isPending}
                          title="Inativar cliente"
                        >
                          <XCircleIcon size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
