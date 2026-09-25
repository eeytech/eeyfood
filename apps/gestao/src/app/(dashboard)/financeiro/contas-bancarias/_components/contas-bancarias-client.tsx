"use client";

import {
  Building2Icon,
  BuildingIcon,
  CheckCircle2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  Wallet2Icon,
  WalletIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  criarContaBancariaAction,
  atualizarContaBancariaAction,
  excluirContaBancariaAction,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
        <Label htmlFor="conta-name" className="text-xs font-semibold text-slate-700">
          Nome da Conta
        </Label>
        <Input
          id="conta-name"
          name="name"
          placeholder="Ex.: Caixa Salão, Itaú Principal, Nubank PJ"
          defaultValue={defaultValues?.name}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="conta-type" className="text-xs font-semibold text-slate-700">
            Tipo da Conta
          </Label>
          <select
            id="conta-type"
            name="type"
            defaultValue={defaultValues?.type ?? "CHECKING"}
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
            required
          >
            <option value="INTERNAL">Caixa Interno (Gaveta)</option>
            <option value="CHECKING">Conta Corrente</option>
            <option value="SAVINGS">Poupança</option>
            <option value="DIGITAL">Conta Digital</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conta-balance" className="text-xs font-semibold text-slate-700">
            Saldo Inicial / Atual (R$)
          </Label>
          <Input
            id="conta-balance"
            name="currentBalance"
            type="number"
            step="0.01"
            defaultValue={defaultValues ? String(defaultValues.currentBalance) : "0"}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conta-bank" className="text-xs font-semibold text-slate-700">
          Instituição / Banco
        </Label>
        <Input
          id="conta-bank"
          name="bankName"
          placeholder="Ex.: Banco do Brasil, Itaú, Nubank"
          defaultValue={defaultValues?.bankName ?? ""}
          className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="conta-agency" className="text-xs font-semibold text-slate-700">
            Agência
          </Label>
          <Input
            id="conta-agency"
            name="agency"
            placeholder="0000"
            defaultValue={defaultValues?.agency ?? ""}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conta-number" className="text-xs font-semibold text-slate-700">
            Número da Conta
          </Label>
          <Input
            id="conta-number"
            name="accountNumber"
            placeholder="00000-0"
            defaultValue={defaultValues?.accountNumber ?? ""}
            className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending
          ? "Salvando..."
          : defaultValues
            ? "Salvar Alterações"
            : "Cadastrar Conta"}
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
      try {
        await criarContaBancariaAction(slug, fd);
        toast.success("Conta bancária criada com sucesso!");
        setCreateOpen(false);
      } catch {
        toast.error("Erro ao criar conta bancária.");
      }
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editConta) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await atualizarContaBancariaAction(slug, editConta.id, fd);
        toast.success("Conta bancária atualizada com sucesso!");
        setEditConta(null);
      } catch {
        toast.error("Erro ao atualizar conta bancária.");
      }
    });
  };

  const handleDelete = (contaId: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a conta "${name}"? A ação não pode ser desfeita.`))
      return;
    startTransition(async () => {
      try {
        await excluirContaBancariaAction(slug, contaId);
        toast.success(`Conta "${name}" excluída.`);
      } catch {
        toast.error("Erro ao excluir conta bancária.");
      }
    });
  };

  const totalSaldo = contas.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalBancos = contas.filter((c) => c.type !== "INTERNAL").length;
  const totalCaixas = contas.filter((c) => c.type === "INTERNAL").length;

  return (
    <div className="space-y-6">
      {/* ── Dialogs ────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <Building2Icon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Nova Conta Bancária
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cadastre caixas físicos, contas correntes ou digitais vinculadas ao restaurante.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ContaForm onSubmit={handleCreate} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={editConta !== null} onOpenChange={(o) => !o && setEditConta(null)}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <PencilIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Editar Conta Bancária
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editConta?.name}
                </DialogDescription>
              </div>
            </div>
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

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Building2Icon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Contas Bancárias e Caixas
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie os saldos de gaveta, contas correntes e contas digitais da sua operação.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <PlusIcon size={16} />
          <span>Nova Conta</span>
        </Button>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de Contas
              </span>
              <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                <BuildingIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {contas.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalBancos} bancária(s) · {totalCaixas} caixa(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saldo Consolidado
              </span>
              <div
                className={cn(
                  "rounded-lg p-1.5",
                  totalSaldo >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                )}
              >
                <WalletIcon size={16} />
              </div>
            </div>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-bold",
                totalSaldo >= 0 ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {formatCurrency(totalSaldo)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Soma de todas as contas ativas
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Contas em Banco
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <Building2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {totalBancos}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Corrente, digital e poupança
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Caixas Internos
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <Wallet2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {totalCaixas}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Gavetas de caixa salão / PDV
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Lista de Contas ──────────────────────────────── */}
      {contas.length === 0 ? (
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <WalletIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhuma conta cadastrada
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Cadastre suas contas bancárias ou caixas de operação para manter os saldos do seu restaurante organizados.
            </p>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="mt-4 gap-1.5 rounded-full bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <PlusIcon size={14} />
              Cadastrar primeira conta
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contas.map((conta) => (
            <Card
              key={conta.id}
              className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300"
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      {conta.type === "INTERNAL" ? (
                        <Wallet2Icon size={18} />
                      ) : (
                        <Building2Icon size={18} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold leading-tight text-slate-900">{conta.name}</p>
                      {conta.bankName && (
                        <p className="text-xs text-slate-500">{conta.bankName}</p>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {TIPO_LABEL[conta.type] ?? conta.type}
                  </span>
                </div>

                {(conta.agency || conta.accountNumber) && (
                  <p className="mb-3 font-mono text-xs text-slate-500">
                    {conta.agency && `Ag. ${conta.agency}`}
                    {conta.agency && conta.accountNumber && " · "}
                    {conta.accountNumber && `Cc. ${conta.accountNumber}`}
                  </p>
                )}

                <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Saldo Atual
                    </span>
                    <p
                      className={cn(
                        "font-display text-xl font-bold",
                        conta.currentBalance >= 0 ? "text-emerald-700" : "text-rose-700",
                      )}
                    >
                      {formatCurrency(conta.currentBalance)}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setEditConta(conta)}
                      title="Editar conta"
                    >
                      <PencilIcon size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDelete(conta.id, conta.name)}
                      disabled={isPending}
                      title="Excluir conta"
                    >
                      <Trash2Icon size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
