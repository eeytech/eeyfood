"use client";

import {
  BuildingIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  criarContaBancariaAction,
  atualizarContaBancariaAction,
  excluirContaBancariaAction,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BankAccount } from "@fsw/db";

const TIPO_LABEL: Record<string, string> = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  INTERNAL: "Caixa Interno",
  DIGITAL: "Conta Digital",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface ContasBancariasClientProps {
  slug: string;
  contas: BankAccount[];
}

function ContaForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: BankAccount;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="conta-name">Nome da conta</Label>
        <Input
          id="conta-name"
          name="name"
          placeholder="Ex.: Caixa Interno, Conta Itaú"
          defaultValue={defaultValues?.name}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="conta-type">Tipo</Label>
          <select
            id="conta-type"
            name="type"
            defaultValue={defaultValues?.type ?? "CHECKING"}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="INTERNAL">Caixa Interno</option>
            <option value="CHECKING">Conta Corrente</option>
            <option value="SAVINGS">Poupança</option>
            <option value="DIGITAL">Conta Digital</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conta-balance">Saldo atual (R$)</Label>
          <Input
            id="conta-balance"
            name="currentBalance"
            type="number"
            step="0.01"
            defaultValue={defaultValues ? String(defaultValues.currentBalance) : "0"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conta-bank">Nome do banco</Label>
        <Input
          id="conta-bank"
          name="bankName"
          placeholder="Ex.: Itaú, Nubank"
          defaultValue={defaultValues?.bankName ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="conta-agency">Agência</Label>
          <Input
            id="conta-agency"
            name="agency"
            placeholder="0000"
            defaultValue={defaultValues?.agency ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conta-number">Número da conta</Label>
          <Input
            id="conta-number"
            name="accountNumber"
            placeholder="00000-0"
            defaultValue={defaultValues?.accountNumber ?? ""}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Salvando..."
          : defaultValues
            ? "Salvar alterações"
            : "Criar conta"}
      </Button>
    </form>
  );
}

export function ContasBancariasClient({ slug, contas }: ContasBancariasClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editConta, setEditConta] = useState<BankAccount | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await criarContaBancariaAction(slug, fd);
      setCreateOpen(false);
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editConta) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await atualizarContaBancariaAction(slug, editConta.id, fd);
      setEditConta(null);
    });
  };

  const handleDelete = (contaId: string) => {
    if (!confirm("Excluir esta conta bancária? A ação não pode ser desfeita.")) return;
    startTransition(async () => {
      await excluirContaBancariaAction(slug, contaId);
    });
  };

  const totalSaldo = contas.reduce((sum, c) => sum + c.currentBalance, 0);

  return (
    <div className="space-y-4">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova conta bancária</DialogTitle>
            <DialogDescription>
              Cadastre caixas, contas correntes ou contas digitais vinculadas ao restaurante.
            </DialogDescription>
          </DialogHeader>
          <ContaForm onSubmit={handleCreate} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={editConta !== null} onOpenChange={(o) => !o && setEditConta(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
            <DialogDescription>{editConta?.name}</DialogDescription>
          </DialogHeader>
          {editConta && (
            <ContaForm
              key={editConta.id}
              defaultValues={editConta}
              onSubmit={handleUpdate}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Contas Bancárias</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie os saldos das suas contas e vincule transações a elas.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <PlusIcon size={14} />
          Nova conta
        </Button>
      </div>

      <Card className="border-blue-100 bg-blue-50">
        <CardHeader className="pb-2">
          <p className="text-xs text-blue-700">Saldo Total Consolidado</p>
          <CardTitle className="text-lg text-blue-900">{formatCurrency(totalSaldo)}</CardTitle>
        </CardHeader>
      </Card>

      {contas.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-white/60 text-muted-foreground">
          <WalletIcon size={28} className="text-slate-300" />
          <p className="text-sm">Nenhuma conta cadastrada. Crie a primeira!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contas.map((conta) => (
            <Card key={conta.id} className="relative overflow-hidden">
              <CardContent className="pt-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BuildingIcon size={16} className="shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium leading-tight">{conta.name}</p>
                      {conta.bankName && (
                        <p className="text-xs text-muted-foreground">{conta.bankName}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {TIPO_LABEL[conta.type] ?? conta.type}
                  </Badge>
                </div>

                {(conta.agency || conta.accountNumber) && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    {conta.agency && `Ag. ${conta.agency}`}
                    {conta.agency && conta.accountNumber && " · "}
                    {conta.accountNumber && `Cc. ${conta.accountNumber}`}
                  </p>
                )}

                <p
                  className={`text-lg font-semibold ${
                    conta.currentBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatCurrency(conta.currentBalance)}
                </p>

                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditConta(conta)}
                  >
                    <PencilIcon size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => handleDelete(conta.id)}
                    disabled={isPending}
                  >
                    <Trash2Icon size={13} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
