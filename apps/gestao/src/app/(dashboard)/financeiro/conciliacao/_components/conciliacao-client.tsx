"use client";

import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowLeftRightIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  FileUpIcon,
  LinkIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  importarExtratoOfxAction,
  ignorarLancamentoExtratoAction,
  criarTransacaoDeExtratoAction,
} from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BankAccount, BankStatement, BankStatementEntry } from "@fsw/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Math.abs(value),
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

const STATUS_MAP: Record<string, { label: string; badgeClass: string }> = {
  PENDING: {
    label: "Pendente",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
  },
  MATCHED: {
    label: "Conciliado",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  },
  IGNORED: {
    label: "Ignorado",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

interface ExtratoCombinado extends BankStatement {
  entries: BankStatementEntry[];
}

interface ConciliacaoClientProps {
  slug: string;
  contas: BankAccount[];
}

export function ConciliacaoClient({ slug, contas }: ConciliacaoClientProps) {
  const [selectedContaId, setSelectedContaId] = useState<string>(contas[0]?.id ?? "");
  const [extratos, setExtratos] = useState<ExtratoCombinado[]>([]);
  const [selectedExtratoId, setSelectedExtratoId] = useState<string | null>(null);
  const [novaTransacaoEntry, setNovaTransacaoEntry] = useState<BankStatementEntry | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedExtrato = extratos.find((e) => e.id === selectedExtratoId);

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContaId) {
      setUploadMessage("Selecione uma conta bancária primeiro.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await importarExtratoOfxAction(slug, selectedContaId, fd);
        toast.success(`Extrato importado: ${result.totalEntries} lançamentos encontrados.`);
        setUploadMessage(`Extrato importado: ${result.totalEntries} lançamentos encontrados.`);
        if (fileRef.current) fileRef.current.value = "";
        window.location.reload();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao importar extrato.";
        toast.error("Erro ao importar: " + msg);
        setUploadMessage("Erro: " + msg);
      }
    });
  };

  const handleIgnorar = (entryId: string) => {
    startTransition(async () => {
      try {
        await ignorarLancamentoExtratoAction(slug, entryId);
        setExtratos((prev) =>
          prev.map((ext) => ({
            ...ext,
            entries: ext.entries.map((en) =>
              en.id === entryId ? { ...en, status: "IGNORED" as const } : en,
            ),
          })),
        );
        toast.success("Lançamento ignorado.");
      } catch {
        toast.error("Erro ao ignorar lançamento.");
      }
    });
  };

  const handleCriarTransacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!novaTransacaoEntry || !selectedContaId) return;
    const fd = new FormData(e.currentTarget);
    fd.set("entryDate", novaTransacaoEntry.entryDate);
    fd.set("amount", String(novaTransacaoEntry.amount));
    startTransition(async () => {
      try {
        await criarTransacaoDeExtratoAction(slug, novaTransacaoEntry.id, selectedContaId, fd);
        toast.success("Lançamento financeiro criado e conciliado com sucesso!");
        setNovaTransacaoEntry(null);
        setExtratos((prev) =>
          prev.map((ext) => ({
            ...ext,
            entries: ext.entries.map((en) =>
              en.id === novaTransacaoEntry.id ? { ...en, status: "MATCHED" as const } : en,
            ),
          })),
        );
      } catch {
        toast.error("Erro ao criar lançamento a partir do extrato.");
      }
    });
  };

  const pendingEntries = selectedExtrato?.entries.filter((e) => e.status === "PENDING") ?? [];
  const matchedEntries = selectedExtrato?.entries.filter((e) => e.status === "MATCHED") ?? [];

  return (
    <div className="space-y-6">
      {/* ── Dialog para criar lançamento a partir do extrato ─ */}
      <Dialog
        open={novaTransacaoEntry !== null}
        onOpenChange={(o) => !o && setNovaTransacaoEntry(null)}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-900">
                <LinkIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-slate-900">
                  Criar Lançamento no Fluxo
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {novaTransacaoEntry?.description} —{" "}
                  {novaTransacaoEntry && formatCurrency(novaTransacaoEntry.amount)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCriarTransacao} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nova-desc" className="text-xs font-semibold text-slate-700">
                Descrição do Lançamento
              </Label>
              <Input
                id="nova-desc"
                name="description"
                defaultValue={novaTransacaoEntry?.description ?? ""}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                required
              />
            </div>
            <Button
              type="submit"
              className="h-10 w-full rounded-full bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? "Criando..." : "Criar e Vincular ao Extrato"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <ArrowLeftRightIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Conciliação Bancária OFX
            </h1>
            <p className="text-sm text-slate-500">
              Importe extratos OFX baixados do seu internet banking e cruze os registros com o fluxo de caixa.
            </p>
          </div>
        </div>
      </div>

      {contas.length === 0 ? (
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <AlertCircleIcon size={32} />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Nenhuma conta bancária cadastrada
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Cadastre ao menos uma conta bancária na aba <strong>Contas Bancárias</strong> antes de importar arquivos OFX.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Card de Importação */}
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="font-display text-base font-semibold text-slate-900">
                Importar Novo Extrato OFX
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Conta Bancária de Destino</Label>
                    <select
                      value={selectedContaId}
                      onChange={(e) => setSelectedContaId(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-900 focus:bg-white"
                      required
                    >
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ofxFile" className="text-xs font-semibold text-slate-700">
                      Arquivo OFX (.ofx)
                    </Label>
                    <Input
                      id="ofxFile"
                      name="ofxFile"
                      type="file"
                      accept=".ofx,.OFX"
                      ref={fileRef}
                      required
                      className="h-10 cursor-pointer rounded-xl border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                {uploadMessage && (
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      uploadMessage.startsWith("Erro") ? "text-rose-600" : "text-emerald-600",
                    )}
                  >
                    {uploadMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  <FileUpIcon size={15} />
                  <span>{isPending ? "Importando..." : "Importar Extrato OFX"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {extratos.length > 0 && (
            <>
              {/* Seleção de extrato */}
              <div className="flex flex-wrap gap-2">
                {extratos.map((ext) => (
                  <Button
                    key={ext.id}
                    variant={selectedExtratoId === ext.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedExtratoId(ext.id)}
                    className={cn(
                      "rounded-full text-xs font-medium",
                      selectedExtratoId === ext.id
                        ? "bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    {ext.fileName}
                    <Badge variant="secondary" className="ml-1.5 text-[11px]">
                      {ext.totalEntries}
                    </Badge>
                  </Button>
                ))}
              </div>

              {selectedExtrato && (
                <div className="space-y-4">
                  {/* Metric Cards do extrato */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Total de Lançamentos
                          </span>
                          <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                            <FileTextIcon size={16} />
                          </div>
                        </div>
                        <p className="mt-2 font-display text-2xl font-bold text-slate-900">
                          {selectedExtrato.totalEntries}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">No arquivo OFX</p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Conciliados
                          </span>
                          <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                            <CheckCircle2Icon size={16} />
                          </div>
                        </div>
                        <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
                          {matchedEntries.length}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">Registrados e casados</p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Pendentes
                          </span>
                          <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                            <ClockIcon size={16} />
                          </div>
                        </div>
                        <p className="mt-2 font-display text-2xl font-bold text-amber-700">
                          {pendingEntries.length}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">Aguardando conciliação</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela de Extrato */}
                  <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="w-[140px] text-xs font-semibold text-slate-700">
                            Data
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-slate-700">
                            Descrição no Banco
                          </TableHead>
                          <TableHead className="text-right text-xs font-semibold text-slate-700">
                            Valor
                          </TableHead>
                          <TableHead className="text-center text-xs font-semibold text-slate-700">
                            Status
                          </TableHead>
                          <TableHead className="w-[140px] text-right text-xs font-semibold text-slate-700">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {selectedExtrato.entries.map((entry) => {
                          const isCredit = entry.amount >= 0;
                          const statusInfo = STATUS_MAP[entry.status] ?? STATUS_MAP.PENDING!;

                          return (
                            <TableRow key={entry.id} className="transition-colors hover:bg-slate-50/70">
                              <TableCell className="py-3 text-xs text-slate-600">
                                {formatDate(entry.entryDate)}
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                                      isCredit
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-rose-100 text-rose-700",
                                    )}
                                  >
                                    {isCredit ? (
                                      <ArrowUpIcon size={12} />
                                    ) : (
                                      <ArrowDownIcon size={12} />
                                    )}
                                  </div>
                                  <span className="font-semibold text-slate-900">
                                    {entry.description}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "py-3 text-right font-semibold",
                                  isCredit ? "text-emerald-700" : "text-rose-700",
                                )}
                              >
                                {isCredit ? "+" : "−"} {formatCurrency(entry.amount)}
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                <Badge className={cn("text-[11px]", statusInfo.badgeClass)}>
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                {entry.status === "PENDING" && (
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 rounded-full border-slate-200 text-xs font-semibold"
                                      onClick={() => setNovaTransacaoEntry(entry)}
                                      disabled={isPending}
                                    >
                                      <LinkIcon size={12} />
                                      Lançar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                      title="Ignorar lançamento"
                                      onClick={() => handleIgnorar(entry.id)}
                                      disabled={isPending}
                                    >
                                      <XIcon size={14} />
                                    </Button>
                                  </div>
                                )}
                                {entry.status === "MATCHED" && (
                                  <div className="flex justify-end">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                      <CheckIcon size={14} />
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}
            </>
          )}

          {extratos.length === 0 && (
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
                  <RefreshCwIcon size={28} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                  Nenhum extrato OFX importado
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Envie um arquivo .ofx baixado da sua conta bancária acima para iniciar a conciliação das entradas e saídas.
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
