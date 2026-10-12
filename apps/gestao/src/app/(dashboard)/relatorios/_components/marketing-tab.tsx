"use client";

import { CoinsIcon, SearchIcon, TagIcon, WalletIcon } from "lucide-react";
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

interface MarketingTabProps {
  data: DashboardData;
}

const MarketingTab = ({ data }: MarketingTabProps) => {
  const { couponUsage, cashbackMetrics } = data;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"USAGE" | "DISCOUNT">("USAGE");

  const filteredCoupons = useMemo(() => {
    let list = [...couponUsage];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((c) => c.couponCode.toLowerCase().includes(q));
    }
    if (sortBy === "DISCOUNT") {
      list.sort((a, b) => b.totalDiscount - a.totalDiscount);
    } else {
      list.sort((a, b) => b.usageCount - a.usageCount);
    }
    return list;
  }, [couponUsage, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Cashback metrics com cores do tema */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cashback gerado
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <CoinsIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {fmt(cashbackMetrics.totalEarned)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Creditado aos clientes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cashback resgatado
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <WalletIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {fmt(cashbackMetrics.totalRedeemed)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Utilizado como desconto</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Saldo em circulação
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <CoinsIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {fmt(cashbackMetrics.currentBalance)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Disponível nas carteiras</p>
          </CardContent>
        </Card>
      </div>

      {/* Coupon usage table com Filtros */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
                <TagIcon size={16} className="text-primary" />
                Uso de cupons no período
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cupons aplicados em pedidos pagos, com desconto total concedido
              </CardDescription>
            </div>

            {/* Filtros da tabela */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cupom..."
                  className="h-8 w-40 pl-8 text-xs bg-slate-50/70"
                />
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setSortBy("USAGE")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === "USAGE"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mais usados
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("DISCOUNT")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === "DISCOUNT"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Maior desconto
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCoupons.length === 0 ? (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                  <TagIcon size={24} />
                </div>
                <p className="font-display text-sm font-semibold text-slate-900">Nenhum cupom encontrado</p>
                <p className="max-w-xs text-xs text-slate-500">
                  Nenhum cupom corresponde aos critérios ou foi aplicado no período selecionado.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-12 text-xs font-semibold text-slate-700">#</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Cupom</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">Utilizações</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">Desconto total</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">Desconto médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons.map((c, i) => (
                    <TableRow key={c.couponCode} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="font-mono text-xs text-slate-400">#{i + 1}</TableCell>
                      <TableCell>
                        <span className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                          {c.couponCode}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">{c.usageCount}×</TableCell>
                      <TableCell className="text-right font-semibold text-rose-600">
                        −{fmt(c.totalDiscount)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-600">
                        {fmt(c.usageCount > 0 ? c.totalDiscount / c.usageCount : 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingTab;
