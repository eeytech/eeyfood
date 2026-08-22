"use client";

import { BikeIcon, TrophyIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/admin-queries";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface LogisticaTabProps {
  data: DashboardData;
}

const MEDAL_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-700"];

const LogisticaTab = ({ data }: LogisticaTabProps) => {
  const { courierMetrics } = data;

  const totalDeliveries = courierMetrics.reduce((s, c) => s + c.deliveryCount, 0);
  const activeCouriers = courierMetrics.filter((c) => c.deliveryCount > 0).length;

  return (
    <div className="space-y-4">
      {/* Meta cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Total de entregas</p>
              <p className="font-display mt-0.5 text-2xl font-semibold">{totalDeliveries}</p>
            </div>
            <BikeIcon className="text-blue-500" size={22} />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Entregadores ativos</p>
              <p className="font-display mt-0.5 text-2xl font-semibold">{activeCouriers}</p>
            </div>
            <BikeIcon className="text-emerald-500" size={22} />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Média por entregador ativo</p>
              <p className="font-display mt-0.5 text-2xl font-semibold">
                {activeCouriers > 0 ? (totalDeliveries / activeCouriers).toFixed(1) : "—"}
              </p>
            </div>
            <TrophyIcon className="text-amber-500" size={22} />
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="text-base">Ranking de entregadores</CardTitle>
          <CardDescription>Desempenho de cada motoboy no período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          {courierMetrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-slate-50 py-12">
              <BikeIcon className="text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">Nenhum entregador cadastrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-2 py-3 text-left font-medium">#</th>
                    <th className="px-2 py-3 text-left font-medium">Entregador</th>
                    <th className="px-2 py-3 text-right font-medium">Entregas</th>
                    <th className="px-2 py-3 text-right font-medium">Taxa total arrecadada</th>
                    <th className="px-2 py-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {courierMetrics.map((c, i) => (
                    <tr key={c.courierId} className="border-b last:border-0">
                      <td className={`px-2 py-2.5 font-bold ${MEDAL_COLORS[i] ?? "text-muted-foreground"}`}>
                        {i < 3 ? <TrophyIcon size={15} /> : `#${i + 1}`}
                      </td>
                      <td className="px-2 py-2.5 font-medium">{c.courierName}</td>
                      <td className="px-2 py-2.5 text-right">
                        <span className="font-semibold">{c.deliveryCount}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right text-emerald-600">
                        {fmt(c.totalFees)}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {c.deliveryCount > 0 ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Sem entregas
                          </Badge>
                        )}
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

export default LogisticaTab;
