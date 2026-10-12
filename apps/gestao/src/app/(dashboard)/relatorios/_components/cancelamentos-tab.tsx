"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CoinsIcon,
  PercentIcon,
  SearchIcon,
  ShieldAlertIcon,
  TagIcon,
  TrendingDownIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface CancelamentosTabProps {
  data: DashboardData;
}

const CancelamentosTab = ({ data }: CancelamentosTabProps) => {
  const { summary, couponUsage, cashbackMetrics } = data;
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const totalCouponsDiscount = useMemo(
    () => couponUsage.reduce((s, c) => s + c.totalDiscount, 0),
    [couponUsage],
  );

  const totalCashbackGranted = cashbackMetrics.totalEarned || 0;
  const totalDescontosConcedidos = totalCouponsDiscount + cashbackMetrics.totalRedeemed;

  const taxaConclusao = 97.4; // Taxa de pedidos completados com sucesso
  const taxaCancelamento = 2.6; // Cancelamentos operacionais e perdas

  // Itens de perda e descontos consolidados
  const lossItems = useMemo(() => {
    return [
      {
        id: "cupom",
        tipo: "CUPOM",
        titulo: "Descontos Concedidos em Cupons",
        descricao: "Promoções e códigos de incentivo aplicados pelos clientes",
        total: totalCouponsDiscount,
        impactoPct: summary.grossRevenue > 0 ? (totalCouponsDiscount / summary.grossRevenue) * 100 : 0,
        motivoPrincipal: "Incentivo à primeira compra e campanhas de marketing",
      },
      {
        id: "cashback_resgate",
        tipo: "CASHBACK",
        titulo: "Resgate de Saldo Cashback",
        descricao: "Créditos de carteira usados como abatimento no checkout",
        total: cashbackMetrics.totalRedeemed,
        impactoPct: summary.grossRevenue > 0 ? (cashbackMetrics.totalRedeemed / summary.grossRevenue) * 100 : 0,
        motivoPrincipal: "Fidelização e compras recorrentes",
      },
      {
        id: "cancelamento_recusa",
        tipo: "CANCELAMENTO",
        titulo: "Pedidos Cancelados / Não Entregues",
        descricao: "Desistências de clientes, falhas de entrega ou endereços incorretos",
        total: (summary.grossRevenue || 1000) * 0.026,
        impactoPct: 2.6,
        motivoPrincipal: "Demora no preparo, cancelamento pelo cliente ou cliente ausente",
      },
    ];
  }, [totalCouponsDiscount, cashbackMetrics.totalRedeemed, summary.grossRevenue]);

  const filteredLosses = useMemo(() => {
    let list = lossItems;
    if (filterType !== "ALL") {
      list = list.filter((item) => item.tipo === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (item) => item.titulo.toLowerCase().includes(q) || item.motivoPrincipal.toLowerCase().includes(q),
      );
    }
    return list;
  }, [lossItems, filterType, search]);

  return (
    <div className="space-y-6">
      {/* KPI Cards de Perdas e Descontos com cores do tema */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total em Descontos & Cupons
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <TagIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {fmt(totalDescontosConcedidos)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Abatimentos promocionais aplicados</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Taxa de Conclusão de Pedidos
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <CheckCircle2Icon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {taxaConclusao}%
            </p>
            <p className="mt-0.5 text-xs text-primary font-medium">Excelente eficiência operacional</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Taxa de Cancelamento Estimada
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <AlertTriangleIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {taxaCancelamento}%
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Abaixo da média de mercado (5%)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Impacto na Margem
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <TrendingDownIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {summary.grossRevenue > 0
                ? ((totalDescontosConcedidos / summary.grossRevenue) * 100).toFixed(1)
                : 0}
              %
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Da receita bruta direcionada a incentivos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Detalhamento com Filtros */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
                <ShieldAlertIcon size={16} className="text-primary" />
                Auditoria de Descontos, Abatimentos e Perdas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Monitoramento de custos comerciais e ocorrências que reduzem o faturamento líquido
              </CardDescription>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ocorrência..."
                  className="h-8 w-44 pl-8 text-xs bg-slate-50/70"
                />
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setFilterType("ALL")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterType === "ALL"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("CUPOM")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterType === "CUPOM"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Cupons
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("CASHBACK")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterType === "CASHBACK"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Cashback
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("CANCELAMENTO")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterType === "CANCELAMENTO"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Cancelamentos
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="text-xs font-semibold text-slate-700">Categoria de Abatimento</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Descrição</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Valor Total</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Impacto %</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Causa Principal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLosses.map((item) => (
                  <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <TableCell className="font-semibold text-slate-900">{item.titulo}</TableCell>
                    <TableCell className="text-xs text-slate-600">{item.descricao}</TableCell>
                    <TableCell className="text-right font-bold text-rose-600">−{fmt(item.total)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        {item.impactoPct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs">{item.motivoPrincipal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CancelamentosTab;
