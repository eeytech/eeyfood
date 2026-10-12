"use client";

import { BikeIcon, SearchIcon, TrophyIcon, UserCheckIcon } from "lucide-react";
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

interface LogisticaTabProps {
  data: DashboardData;
}

const MEDAL_COLORS = ["text-amber-500", "text-slate-400", "text-amber-700"];

const LogisticaTab = ({ data }: LogisticaTabProps) => {
  const { courierMetrics } = data;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [sortBy, setSortBy] = useState<"DELIVERIES" | "FEES">("DELIVERIES");

  const totalDeliveries = courierMetrics.reduce((s, c) => s + c.deliveryCount, 0);
  const activeCouriers = courierMetrics.filter((c) => c.deliveryCount > 0).length;

  const filteredCouriers = useMemo(() => {
    let list = [...courierMetrics];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((c) => c.courierName.toLowerCase().includes(q));
    }
    if (statusFilter === "ACTIVE") {
      list = list.filter((c) => c.deliveryCount > 0);
    } else if (statusFilter === "INACTIVE") {
      list = list.filter((c) => c.deliveryCount === 0);
    }
    if (sortBy === "FEES") {
      list.sort((a, b) => b.totalFees - a.totalFees);
    } else {
      list.sort((a, b) => b.deliveryCount - a.deliveryCount);
    }
    return list;
  }, [courierMetrics, search, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Meta cards com cores do tema */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total de entregas
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <BikeIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {totalDeliveries}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Entregas concluídas no período</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Entregadores ativos
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <UserCheckIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {activeCouriers}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Com pelo menos 1 entrega</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Média por entregador
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <TrophyIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {activeCouriers > 0 ? (totalDeliveries / activeCouriers).toFixed(1) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Entregas por motoboy ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard com Filtros */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-base font-semibold text-slate-900">
                Ranking de entregadores
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Desempenho de cada motoboy no período selecionado
              </CardDescription>
            </div>

            {/* Filtros da aba */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar entregador..."
                  className="h-8 w-44 pl-8 text-xs bg-slate-50/70"
                />
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "ALL"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "ACTIVE"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Ativos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("INACTIVE")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "INACTIVE"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sem entregas
                </button>
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setSortBy("DELIVERIES")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    sortBy === "DELIVERIES"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Por entregas
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("FEES")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    sortBy === "FEES"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Por taxas
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCouriers.length === 0 ? (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                  <BikeIcon size={24} />
                </div>
                <p className="font-display text-sm font-semibold text-slate-900">Nenhum entregador encontrado</p>
                <p className="max-w-xs text-xs text-slate-500">Tente ajustar os filtros acima.</p>
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
                  {filteredCouriers.map((c, i) => (
                    <TableRow key={c.courierId} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className={`font-bold ${MEDAL_COLORS[i] ?? "text-slate-400"}`}>
                        {i < 3 ? <TrophyIcon size={16} /> : `#${i + 1}`}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{c.courierName}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {c.deliveryCount}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {fmt(c.totalFees)}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.deliveryCount > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
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
