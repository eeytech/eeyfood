"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  FileUpIcon,
  LinkIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
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
import type { BankAccount, BankStatement, BankStatementEntry } from "@fsw/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Math.abs(value),
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_MAP: Record<string, { label: string; variant: "secondary" | "success" | "danger" }> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  MATCHED: { label: "Conciliado", variant: "success" },
  IGNORED: { label: "Ignorado", variant: "danger" },
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
        setUploadMessage(`Extrato importado: ${result.totalEntries} lançamentos encontrados.`);
        if (fileRef.current) fileRef.current.value = "";
        window.location.reload();
      } catch (err) {
        setUploadMessage(
          "Erro: " + (err instanceof Error ? err.message : "Falha ao importar extrato."),
        );
      }
    });
  };

  const handleIgnorar = (entryId: string) => {
    startTransition(async () => {
      await ignorarLancamentoExtratoAction(slug, entryId);
      setExtratos((prev) =>
        prev.map((ext) => ({
          ...ext,
          entries: ext.entries.map((en) =>
            en.id === entryId ? { ...en, status: "IGNORED" as const } : en,
          ),
        })),
      );
    });
  };

  const handleCriarTransacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!novaTransacaoEntry || !selectedContaId) return;
    const fd = new FormData(e.currentTarget);
    fd.set("entryDate", novaTransacaoEntry.entryDate);
    fd.set("amount", String(novaTransacaoEntry.amount));
    startTransition(async () => {
      await criarTransacaoDeExtratoAction(slug, novaTransacaoEntry.id, selectedContaId, fd);
      setNovaTransacaoEntry(null);
      setExtratos((prev) =>
        prev.map((ext) => ({
          ...ext,
          entries: ext.entries.map((en) =>
            en.id === novaTransacaoEntry.id ? { ...en, status: "MATCHED" as const } : en,
          ),
        })),
      );
    });
  };

  const pendingEntries = selectedExtrato?.entries.filter((e) => e.status === "PENDING") ?? [];
  const matchedEntries = selectedExtrato?.entries.filter((e) => e.status === "MATCHED") ?? [];

  return (
    <div className="space-y-6">
      <Dialog
        open={novaTransacaoEntry !== null}
        onOpenChange={(o) => !o && setNovaTransacaoEntry(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar lançamento para este extrato</DialogTitle>
            <DialogDescription>
              {novaTransacaoEntry?.description} —{" "}
              {novaTransacaoEntry && formatCurrency(novaTransacaoEntry.amount)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCriarTransacao} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nova-desc">Descrição</Label>
              <Input
                id="nova-desc"
                name="description"
                defaultValue={novaTransacaoEntry?.description ?? ""}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Criando..." : "Criar e vincular lançamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="font-display text-xl font-semibold">Conciliação Bancária</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Importe extratos OFX e cruze com os lançamentos registrados no sistema.
        </p>
      </div>

      {contas.length === 0 ? (
        <Alert>
          <AlertDescription>
            Cadastre ao menos uma conta bancária em{" "}
            <strong>Contas Bancárias</strong> antes de importar extratos.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importar Extrato OFX</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Conta bancária</Label>
                    <select
                      value={selectedContaId}
                      onChange={(e) => setSelectedContaId(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
                    <Label htmlFor="ofxFile">Arquivo OFX</Label>
                    <Input
                      id="ofxFile"
                      name="ofxFile"
                      type="file"
                      accept=".ofx,.OFX"
                      ref={fileRef}
                      required
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {uploadMessage && (
                  <p
                    className={`text-sm ${uploadMessage.startsWith("Erro") ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {uploadMessage}
                  </p>
                )}

                <Button type="submit" disabled={isPending} className="gap-1.5">
                  <FileUpIcon size={14} />
                  {isPending ? "Importando..." : "Importar extrato"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {extratos.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {extratos.map((ext) => (
                  <Button
                    key={ext.id}
                    variant={selectedExtratoId === ext.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedExtratoId(ext.id)}
                  >
                    {ext.fileName}
                    <Badge variant="secondary" className="ml-1.5 text-xs">
                      {ext.totalEntries}
                    </Badge>
                  </Button>
                ))}
              </div>

              {selectedExtrato && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card className="border-slate-100 bg-slate-50">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Total de lançamentos</p>
                        <p className="text-xl font-semibold">{selectedExtrato.totalEntries}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-emerald-100 bg-emerald-50">
                      <CardContent className="pt-4">
                        <p className="text-xs text-emerald-700">Conciliados</p>
                        <p className="text-xl font-semibold text-emerald-900">
                          {matchedEntries.length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-100 bg-amber-50">
                      <CardContent className="pt-4">
                        <p className="text-xs text-amber-700">Pendentes</p>
                        <p className="text-xl font-semibold text-amber-900">
                          {pendingEntries.length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="p-3 text-left font-medium text-muted-foreground">Data</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">Descrição</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">Valor</th>
                          <th className="p-3 text-center font-medium text-muted-foreground">Status</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedExtrato.entries.map((entry) => {
                          const isCredit = entry.amount >= 0;
                          const statusInfo = STATUS_MAP[entry.status] ?? STATUS_MAP.PENDING!;

                          return (
                            <tr key={entry.id} className="border-b last:border-0">
                              <td className="p-3 text-muted-foreground">
                                {formatDate(entry.entryDate)}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {isCredit ? (
                                    <ArrowUpIcon size={12} className="shrink-0 text-emerald-600" />
                                  ) : (
                                    <ArrowDownIcon size={12} className="shrink-0 text-rose-600" />
                                  )}
                                  <span>{entry.description}</span>
                                </div>
                              </td>
                              <td
                                className={`p-3 text-right font-medium ${isCredit ? "text-emerald-700" : "text-rose-700"}`}
                              >
                                {isCredit ? "+" : "−"} {formatCurrency(entry.amount)}
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                              </td>
                              <td className="p-3">
                                {entry.status === "PENDING" && (
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 gap-1 text-xs"
                                      onClick={() => setNovaTransacaoEntry(entry)}
                                      disabled={isPending}
                                    >
                                      <LinkIcon size={11} />
                                      Criar lançamento
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:bg-slate-50"
                                      title="Ignorar"
                                      onClick={() => handleIgnorar(entry.id)}
                                      disabled={isPending}
                                    >
                                      <XIcon size={12} />
                                    </Button>
                                  </div>
                                )}
                                {entry.status === "MATCHED" && (
                                  <div className="flex justify-end">
                                    <CheckIcon size={16} className="text-emerald-600" />
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {extratos.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-white/60 text-muted-foreground">
              <RefreshCwIcon size={24} className="text-slate-300" />
              <p className="text-sm">Importe um extrato OFX para iniciar a conciliação.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
