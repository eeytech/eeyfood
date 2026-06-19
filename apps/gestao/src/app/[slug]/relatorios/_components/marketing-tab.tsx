"use client";

import { CoinsIcon, TagIcon, WalletIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface MarketingTabProps {
  data: DashboardData;
}

const MarketingTab = ({ data }: MarketingTabProps) => {
  const { couponUsage, cashbackMetrics } = data;

  return (
    <div className="space-y-4">
      {/* Cashback metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-white/80 bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Cashback gerado</p>
              <p className="font-display mt-0.5 text-2xl font-semibold text-amber-600">
                {fmt(cashbackMetrics.totalEarned)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Creditado aos clientes</p>
            </div>
            <CoinsIcon className="text-amber-400" size={28} />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Cashback resgatado</p>
              <p className="font-display mt-0.5 text-2xl font-semibold text-emerald-600">
                {fmt(cashbackMetrics.totalRedeemed)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Utilizado como desconto</p>
            </div>
            <WalletIcon className="text-emerald-500" size={28} />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Saldo em circulação</p>
              <p className="font-display mt-0.5 text-2xl font-semibold text-blue-600">
                {fmt(cashbackMetrics.currentBalance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Disponível nas carteiras</p>
            </div>
            <CoinsIcon className="text-blue-400" size={28} />
          </CardContent>
        </Card>
      </div>

      {/* Coupon usage table */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TagIcon size={16} />
            Uso de cupons no período
          </CardTitle>
          <CardDescription>
            Cupons aplicados em pedidos pagos, com desconto total concedido
          </CardDescription>
        </CardHeader>
        <CardContent>
          {couponUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-slate-50 py-12">
              <TagIcon className="text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">
                Nenhum cupom utilizado no período selecionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-2 py-3 text-left font-medium">#</th>
                    <th className="px-2 py-3 text-left font-medium">Cupom</th>
                    <th className="px-2 py-3 text-right font-medium">Utilizações</th>
                    <th className="px-2 py-3 text-right font-medium">Desconto total</th>
                    <th className="px-2 py-3 text-right font-medium">Desconto médio</th>
                  </tr>
                </thead>
                <tbody>
                  {couponUsage.map((c, i) => (
                    <tr key={c.couponCode} className="border-b last:border-0">
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">#{i + 1}</td>
                      <td className="px-2 py-2.5">
                        <span className="rounded-lg bg-yellow-100 px-2 py-0.5 font-mono text-xs font-semibold text-yellow-800">
                          {c.couponCode}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold">{c.usageCount}×</td>
                      <td className="px-2 py-2.5 text-right text-red-600">
                        −{fmt(c.totalDiscount)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-muted-foreground">
                        {fmt(c.usageCount > 0 ? c.totalDiscount / c.usageCount : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingTab;
