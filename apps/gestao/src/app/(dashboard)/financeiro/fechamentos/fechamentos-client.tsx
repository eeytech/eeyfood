"use client";

import { useState, useTransition } from "react";
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalculatorIcon,
  CalendarCheck2Icon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  FileSpreadsheetIcon,
  LockIcon,
  PackageCheckIcon,
  PercentIcon,
  RotateCcwIcon,
  TrendingUpIcon,
  UnlockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  calcularPreviaDREAction,
  executarFechamentoCompetenciaAction,
  reabrirFechamentoCompetenciaAction,
} from "./fechamento-actions";
import type { FechamentoResumoItem, PreviaDREData } from "./fechamento-actions";

interface FechamentosClientProps {
  slug: string;
  initialClosings: FechamentoResumoItem[];
  kpis: {
    totalFechamentos: number;
    faturamentoTotalAuditado: number;
    custoTotalAuditado: number;
    lucroTotalAuditado: number;
    margemMediaAuditada: number;
  };
}

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const ANOS = [2024, 2025, 2026, 2027];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

export function FechamentosClient({
  slug,
  initialClosings,
  kpis: initialKpis,
}: FechamentosClientProps) {
  const [closings, setClosings] = useState<FechamentoResumoItem[]>(initialClosings);
  const [kpis, setKpis] = useState(initialKpis);

  // Período selecionado
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState<number>(now.getFullYear());

  // Prévia DRE
  const [previa, setPrevia] = useState<PreviaDREData | null>(null);
  const [isCalculando, startCalcular] = useTransition();

  // Fechar ou Reabrir
  const [isExecuting, startExecuting] = useTransition();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<FechamentoResumoItem | null>(null);

  const handleCalcularPrevia = () => {
    startCalcular(async () => {
      const res = await calcularPreviaDREAction(slug, selectedAno, selectedMes);
      if (res.success && res.previa) {
        setPrevia(res.previa);
        toast.success(`Prévia de ${MESES.find((m) => m.value === selectedMes)?.label}/${selectedAno} calculada!`);
      } else {
        toast.error(res.error || "Não foi possível calcular a prévia.");
      }
    });
  };

  const handleConfirmarFechamento = () => {
    startExecuting(async () => {
      const res = await executarFechamentoCompetenciaAction(slug, selectedAno, selectedMes);
      if (res.success) {
        toast.success(res.message);
        setConfirmModalOpen(false);

        // Recalcular prévia atualizada
        const updated = await calcularPreviaDREAction(slug, selectedAno, selectedMes);
        if (updated.previa) setPrevia(updated.previa);

        // Atualizar lista local
        window.location.reload();
      } else {
        toast.error(res.error || "Falha ao fechar competência.");
      }
    });
  };

  const handleConfirmarReabertura = () => {
    if (!reopenTarget) return;
    startExecuting(async () => {
      const res = await reabrirFechamentoCompetenciaAction(slug, reopenTarget.id);
      if (res.success) {
        toast.success(res.message);
        setReopenTarget(null);
        window.location.reload();
      } else {
        toast.error(res.error || "Falha ao reabrir competência.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Competências
              </span>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <CalendarCheck2Icon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {kpis.totalFechamentos}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Meses auditados e fechados</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Receita Auditada
              </span>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <ArrowUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-600">
              {formatCurrency(kpis.faturamentoTotalAuditado)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Consolidado dos períodos</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Custos Auditados
              </span>
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <ArrowDownIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-rose-600">
              {formatCurrency(kpis.custoTotalAuditado)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Despesas e saídas registradas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Lucro Líquido
              </span>
              <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-violet-600">
              {formatCurrency(kpis.lucroTotalAuditado)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Margem média: {kpis.margemMediaAuditada.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Nova Auditoria / Painel de Fechamento de Mês ── */}
      <Card className="border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <CalculatorIcon size={18} className="text-blue-600" />
                <span>Auditoria & Fechamento de Competência</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione o mês fiscal para calcular a DRE e consolidar os números definitivos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Mês de competência"
                value={selectedMes}
                onChange={(e) => {
                  setSelectedMes(Number(e.target.value));
                  setPrevia(null);
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Ano de competência"
                value={selectedAno}
                onChange={(e) => {
                  setSelectedAno(Number(e.target.value));
                  setPrevia(null);
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden"
              >
                {ANOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                size="sm"
                onClick={handleCalcularPrevia}
                disabled={isCalculando}
                className="h-9 gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                <CalculatorIcon size={14} />
                <span>{isCalculando ? "Calculando..." : "Calcular DRE"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        {previa && (
          <CardContent className="pt-0">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Demonstrativo de Resultado do Período (DRE)
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-white text-xs font-bold text-slate-700"
                    >
                      {MESES.find((m) => m.value === previa.mes)?.label} / {previa.ano}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {previa.isClosed
                      ? `Competência fechada e auditada em ${formatDate(previa.closedAt!)}`
                      : "Período aberto para auditoria e conferência contábil"}
                  </p>
                </div>

                <div>
                  {previa.isClosed ? (
                    <Badge className="gap-1.5 bg-emerald-600 text-white font-semibold">
                      <LockIcon size={12} />
                      <span>Auditado & Bloqueado</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 font-semibold">
                      <UnlockIcon size={12} />
                      <span>Aberto para Fechamento</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* DRE Structure */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <PackageCheckIcon size={14} className="text-blue-600" />
                    Receita de Pedidos ({previa.totalOrders} pedidos)
                  </span>
                  <span className="font-semibold text-slate-900">
                    +{formatCurrency(previa.faturamentoPedidos)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <DollarSignIcon size={14} className="text-emerald-600" />
                    Outras Receitas Operacionais
                  </span>
                  <span className="font-semibold text-slate-900">
                    +{formatCurrency(previa.outrasReceitas)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 font-bold">
                  <span className="text-emerald-900">(=) Receita Bruta Total</span>
                  <span className="text-sm text-emerald-700">
                    {formatCurrency(previa.receitaBruta)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <ArrowDownIcon size={14} className="text-rose-600" />
                    Custos & Despesas Pagas
                  </span>
                  <span className="font-semibold text-rose-600">
                    -{formatCurrency(previa.custoTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 text-white font-bold">
                  <div>
                    <span className="text-sm block">(=) Lucro Líquido do Período</span>
                    <span className="text-[11px] font-normal text-slate-300">
                      Margem Líquida: {previa.margemLiquida.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-lg font-display text-emerald-400">
                    {formatCurrency(previa.lucroLiquido)}
                  </span>
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {previa.isClosed ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const item = closings.find((c) => c.referenceDate === previa.refDateString);
                      if (item) setReopenTarget(item);
                    }}
                    className="gap-1.5 rounded-xl border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcwIcon size={13} />
                    <span>Reabrir Competência</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={isExecuting}
                    className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs"
                  >
                    <CheckCircle2Icon size={14} />
                    <span>Auditar & Fechar Competência {MESES.find((m) => m.value === previa.mes)?.label}/{previa.ano}</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Tabela de Fechamentos Auditados ── */}
      <Card className="border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FileSpreadsheetIcon size={18} className="text-slate-700" />
              <span>Histórico de Fechamentos Contábeis (DRE Auditada)</span>
            </CardTitle>
            <Badge variant="outline" className="border-slate-200 text-xs font-medium text-slate-600">
              {closings.length} competências registradas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {closings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarDaysIcon size={36} className="text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma competência contábil foi fechada ainda
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                Utilize o painel acima para calcular a DRE do mês desejado e auditar o fechamento oficial.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="pb-2.5">Competência</th>
                    <th className="pb-2.5">Receita Bruta</th>
                    <th className="pb-2.5">Custos/Despesas</th>
                    <th className="pb-2.5">Lucro Líquido</th>
                    <th className="pb-2.5">Margem</th>
                    <th className="pb-2.5">Pedidos</th>
                    <th className="pb-2.5">Auditado Em</th>
                    <th className="pb-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {closings.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">
                        {MESES.find((m) => m.value === c.mes)?.label || c.mes} / {c.ano}
                      </td>
                      <td className="py-3 text-emerald-600 font-semibold">
                        {formatCurrency(c.grossRevenue)}
                      </td>
                      <td className="py-3 text-rose-600">
                        {formatCurrency(c.estimatedCost)}
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        {formatCurrency(c.estimatedProfit)}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            c.profitMargin >= 20
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 text-slate-600"
                          }
                        >
                          {c.profitMargin.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-600">
                        {c.totalOrders}
                      </td>
                      <td className="py-3 text-slate-500 text-[11px]">
                        {c.closedAt ? formatDate(c.closedAt) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setReopenTarget(c)}
                          className="h-7 gap-1 px-2 text-[11px] text-slate-500 hover:text-rose-600"
                        >
                          <RotateCcwIcon size={12} />
                          <span>Reabrir</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Confirmar Fechamento ── */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <LockIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-base font-bold text-slate-900">
                  Confirmar Fechamento Contábil
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Competência {MESES.find((m) => m.value === selectedMes)?.label}/{selectedAno}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {previa && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Ao auditar e fechar esta competência, os números oficiais de receita bruta, custos e lucro líquido serão congelados para fins de auditoria gerencial e relatórios de DRE.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receita Bruta:</span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(previa.receitaBruta)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Custos / Despesas:</span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(previa.custoTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-900 font-bold">Lucro Líquido:</span>
                  <span className="text-emerald-600 font-bold">{formatCurrency(previa.lucroLiquido)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-xl border-slate-200 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarFechamento}
              disabled={isExecuting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {isExecuting ? "Fechando..." : "Confirmar e Bloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Reabertura ── */}
      <Dialog open={Boolean(reopenTarget)} onOpenChange={(open) => !open && setReopenTarget(null)}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                <AlertCircleIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-display text-base font-bold text-slate-900">
                  Reabrir Competência Contábil
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {reopenTarget && `${MESES.find((m) => m.value === reopenTarget.mes)?.label}/${reopenTarget.ano}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 leading-relaxed">
            Tem certeza de que deseja reabrir este mês? O status de auditoria congelado será desfeito, permitindo que você recalcule a DRE após adicionar novos lançamentos ou correções.
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReopenTarget(null)}
              className="rounded-xl border-slate-200 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarReabertura}
              disabled={isExecuting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {isExecuting ? "Reabrindo..." : "Confirmar Reabertura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
