"use client";

import { BikeIcon, TrophyIcon, UserCheckIcon } from "lucide-react";

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

interface LogisticaTabProps {
  data: DashboardData;
}

const MEDAL_COLORS = ["text-amber-500", "text-slate-400", "text-amber-700"];

const LogisticaTab = ({ data }: LogisticaTabProps) => {
  const { courierMetrics } = data;

  const totalDeliveries = courierMetrics.reduce((s, c) => s + c.deliveryCount, 0);
  const activeCouriers = courierMetrics.filter((c) => c.deliveryCount > 0).length;

  return (
    <div className="space-y-6">
      {/* Meta cards */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total de entregas
              </span>
              <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                <BikeIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              {totalDeliveries}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Entregas concluídas no período</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Entregadores ativos
              </span>
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <UserCheckIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700">
              {activeCouriers}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Com pelo menos 1 entrega</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Média por entregador
              </span>
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                <TrophyIcon size={16} />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-amber-700">
              {activeCouriers > 0 ? (totalDeliveries / activeCouriers).toFixed(1) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Entregas por motoboy ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="font-display text-base font-semibold text-slate-900">
            Ranking de entregadores
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Desempenho de cada motoboy no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {courierMetrics.length === 0 ? (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                  <BikeIcon size={24} />
                </div>
                <p className="font-display text-sm font-semibold text-slate-900">Nenhum entregador</p>
                <p className="max-w-xs text-xs text-slate-500">Nenhum entregador cadastrado ou ativo no período.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-12 text-xs font-semibold text-slate-700">#</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Entregador</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">Entregas</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">Taxa total arrecadada</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courierMetrics.map((c, i) => (
                    <TableRow key={c.courierId} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className={`font-bold ${MEDAL_COLORS[i] ?? "text-slate-400"}`}>
                        {i < 3 ? <TrophyIcon size={16} /> : `#${i + 1}`}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{c.courierName}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {c.deliveryCount}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {fmt(c.totalFees)}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.deliveryCount > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            Sem entregas
                          </span>
                        )}
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

export default LogisticaTab;
