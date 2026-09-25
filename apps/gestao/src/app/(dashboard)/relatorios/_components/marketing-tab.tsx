"use client";

import { CoinsIcon, TagIcon, WalletIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      {/* Cashback metrics */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cashback gerado
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <CoinsIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {fmt(cashbackMetrics.totalEarned)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Creditado aos clientes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cashback resgatado
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <WalletIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {fmt(cashbackMetrics.totalRedeemed)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Utilizado como desconto</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saldo em circulação
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <CoinsIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-blue-700">
              {fmt(cashbackMetrics.currentBalance)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Disponível nas carteiras</p>
          </CardContent>
        </Card>
      </div>

      {/* Coupon usage table */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-slate-900">
            <TagIcon size={16} className="text-slate-500" />
            Uso de cupons no período
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Cupons aplicados em pedidos pagos, com desconto total concedido
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {couponUsage.length === 0 ? (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                  <TagIcon size={24} />
                </div>
                <p className="font-display text-sm font-semibold text-slate-900">Nenhum cupom utilizado</p>
                <p className="max-w-xs text-xs text-slate-500">
                  Nenhum cupom foi aplicado em pedidos durante o período selecionado.
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
                  {couponUsage.map((c, i) => (
                    <TableRow key={c.couponCode} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="font-mono text-xs text-slate-400">#{i + 1}</TableCell>
                      <TableCell>
                        <span className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800">
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
