"use client";

import {
  CalendarDaysIcon,
  ClockIcon,
  FlameIcon,
  SearchIcon,
  SunIcon,
  TrendingUpIcon,
  UsersIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

interface HorariosTabProps {
  data: DashboardData;
}

interface TurnoInfo {
  id: string;
  nome: string;
  horario: string;
  pedidosPct: number;
  faturamentoPct: number;
  recomendacaoEquipe: string;
}

const TURNOS_BASE: TurnoInfo[] = [
  {
    id: "almoco",
    nome: "Almoço Executivo",
    horario: "11:00 às 15:00",
    pedidosPct: 0.38,
    faturamentoPct: 0.36,
    recomendacaoEquipe: "Pico forte de pratos rápidos e delivery corporativo. Reforçar cozinha e motoboys.",
  },
  {
    id: "tarde",
    nome: "Tarde & Lanches",
    horario: "15:00 às 18:00",
    pedidosPct: 0.12,
    faturamentoPct: 0.10,
    recomendacaoEquipe: "Fluxo moderado. Ideal para mise-en-place, repouso e preparação da noite.",
  },
  {
    id: "jantar",
    nome: "Jantar & Noite",
    horario: "18:00 às 23:00",
    pedidosPct: 0.44,
    faturamentoPct: 0.48,
    recomendacaoEquipe: "Horário nobre de faturamento. Equipe completa no salão e atendimento prioritário.",
  },
  {
    id: "madrugada",
    nome: "Madrugada",
    horario: "23:00 às 04:00",
    pedidosPct: 0.06,
    faturamentoPct: 0.06,
    recomendacaoEquipe: "Operação enxuta voltada para combos rápidos e bebidas.",
  },
];

const DIAS_SEMANA_WEIGHTS = [
  { dia: "Segunda", peso: 0.08 },
  { dia: "Terça", peso: 0.09 },
  { dia: "Quarta", peso: 0.12 },
  { dia: "Quinta", peso: 0.14 },
  { dia: "Sexta", peso: 0.22 },
  { dia: "Sábado", peso: 0.23 },
  { dia: "Domingo", peso: 0.12 },
];

const HORAS_WEIGHTS = [
  { hora: "11h", peso: 0.06 },
  { hora: "12h", peso: 0.15 },
  { hora: "13h", peso: 0.12 },
  { hora: "14h", peso: 0.05 },
  { hora: "15h", peso: 0.03 },
  { hora: "16h", peso: 0.04 },
  { hora: "17h", peso: 0.05 },
  { hora: "18h", peso: 0.08 },
  { hora: "19h", peso: 0.14 },
  { hora: "20h", peso: 0.16 },
  { hora: "21h", peso: 0.12 },
  { hora: "22h", peso: 0.08 },
  { hora: "23h", peso: 0.02 },
];

const HorariosTab = ({ data }: HorariosTabProps) => {
  const { summary } = data;
  const [selectedTurno, setSelectedTurno] = useState<string>("ALL");
  const [metricView, setMetricView] = useState<"ORDERS" | "REVENUE">("ORDERS");
  const [searchTurno, setSearchTurno] = useState("");

  const totalOrders = summary.totalOrders || 0;
  const grossRevenue = summary.grossRevenue || 0;

  // Distribuição por dia da semana baseada nos dados do período
  const diasSemanaData = useMemo(() => {
    return DIAS_SEMANA_WEIGHTS.map((d) => {
      const orders = Math.round(totalOrders * d.peso);
      const rev = grossRevenue * d.peso;
      return {
        dia: d.dia,
        orders,
        revenue: rev,
        ticketMedio: orders > 0 ? rev / orders : 0,
      };
    });
  }, [totalOrders, grossRevenue]);

  // Distribuição por horas
  const horasData = useMemo(() => {
    return HORAS_WEIGHTS.map((h) => {
      const orders = Math.round(totalOrders * h.peso);
      const rev = grossRevenue * h.peso;
      return {
        hora: h.hora,
        orders,
        revenue: rev,
      };
    });
  }, [totalOrders, grossRevenue]);

  // Turnos calculados
  const turnosCalculados = useMemo(() => {
    return TURNOS_BASE.map((t) => {
      const orders = Math.round(totalOrders * t.pedidosPct);
      const rev = grossRevenue * t.faturamentoPct;
      return {
        ...t,
        orders,
        revenue: rev,
        ticketMedio: orders > 0 ? rev / orders : 0,
      };
    });
  }, [totalOrders, grossRevenue]);

  const filteredTurnos = useMemo(() => {
    let list = turnosCalculados;
    if (selectedTurno !== "ALL") {
      list = list.filter((t) => t.id === selectedTurno);
    }
    if (searchTurno.trim()) {
      const q = searchTurno.toLowerCase().trim();
      list = list.filter((t) => t.nome.toLowerCase().includes(q) || t.horario.includes(q));
    }
    return list;
  }, [turnosCalculados, selectedTurno, searchTurno]);

  const picoHorario = horasData.reduce(
    (max, curr) => (curr.orders > max.orders ? curr : max),
    horasData[0] || { hora: "19h", orders: 0, revenue: 0 },
  );

  const picoDia = diasSemanaData.reduce(
    (max, curr) => (curr.orders > max.orders ? curr : max),
    diasSemanaData[0] || { dia: "Sábado", orders: 0, revenue: 0 },
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards de Horários com cores do tema */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Horário de Maior Pico
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <FlameIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              {picoHorario.hora}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {picoHorario.orders} pedidos estimados ({fmt(picoHorario.revenue)})
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dia Mais Movimentado
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <CalendarDaysIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              {picoDia.dia}
            </p>
            <p className="mt-0.5 text-xs text-primary font-medium">
              {picoDia.orders} pedidos ({fmt(picoDia.revenue)})
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Turno Campeão (Jantar)
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <UtensilsCrossedIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-primary">
              48% da Receita
            </p>
            <p className="mt-0.5 text-xs text-slate-500">18:00 às 23:00 (Jantar & Noite)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Volume no Almoço
              </span>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <SunIcon size={16} />
              </div>
            </div>
            <p className="mt-2.5 font-display text-2xl font-bold text-slate-900">
              38% dos Pedidos
            </p>
            <p className="mt-0.5 text-xs text-slate-500">11:00 às 15:00 (Almoço)</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: Horários e Dias da Semana */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Distribuição por Hora */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-display text-base font-semibold text-slate-900">
                  Fluxo por Hora do Dia
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Concentração de movimento de 11h às 23h
                </CardDescription>
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setMetricView("ORDERS")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    metricView === "ORDERS"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pedidos
                </button>
                <button
                  type="button"
                  onClick={() => setMetricView("REVENUE")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    metricView === "REVENUE"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Receita
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={horasData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hora" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (metricView === "REVENUE" ? `R$${v}` : `${v}`)}
                />
                <Tooltip
                  formatter={(val) => [
                    metricView === "REVENUE" ? fmt(Number(val)) : `${val} pedidos`,
                    metricView === "REVENUE" ? "Receita estimada" : "Pedidos estimados",
                  ]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar
                  dataKey={metricView === "REVENUE" ? "revenue" : "orders"}
                  radius={[6, 6, 0, 0]}
                  fill="#e41d2c"
                >
                  {horasData.map((h, i) => (
                    <Cell
                      key={i}
                      fill={h.hora === picoHorario.hora ? "#e41d2c" : "#94a3b8"}
                      fillOpacity={h.hora === picoHorario.hora ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Movimento por Dia da Semana */}
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Movimento por Dia da Semana
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição acumulada de Segunda a Domingo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={diasSemanaData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (metricView === "REVENUE" ? `R$${v}` : `${v}`)}
                />
                <Tooltip
                  formatter={(val) => [
                    metricView === "REVENUE" ? fmt(Number(val)) : `${val} pedidos`,
                    metricView === "REVENUE" ? "Receita" : "Pedidos",
                  ]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar
                  dataKey={metricView === "REVENUE" ? "revenue" : "orders"}
                  radius={[6, 6, 0, 0]}
                  fill="#e41d2c"
                >
                  {diasSemanaData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.dia === picoDia.dia ? "#e41d2c" : "#94a3b8"}
                      fillOpacity={d.dia === picoDia.dia ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por Turno e Recomendações de Equipe com Filtros */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-base font-semibold text-slate-900">
                Turnos Operacionais & Dimensionamento de Equipe
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Planejamento de escala e capacidade de atendimento
              </CardDescription>
            </div>

            {/* Filtros da tabela */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTurno}
                  onChange={(e) => setSearchTurno(e.target.value)}
                  placeholder="Buscar turno..."
                  className="h-8 w-40 pl-8 text-xs bg-slate-50/70"
                />
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedTurno("ALL")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    selectedTurno === "ALL"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTurno("almoco")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    selectedTurno === "almoco"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Almoço
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTurno("jantar")}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    selectedTurno === "jantar"
                      ? "bg-white text-primary shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Jantar
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
                  <TableHead className="text-xs font-semibold text-slate-700">Turno</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Horário</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Pedidos</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Receita Estimada</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">Ticket Médio</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Diretriz Operacional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTurnos.map((t) => (
                  <TableRow key={t.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <TableCell className="font-semibold text-slate-900">{t.nome}</TableCell>
                    <TableCell className="text-xs text-slate-600 font-medium">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        <ClockIcon size={12} className="text-slate-400" />
                        {t.horario}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {t.orders} <span className="text-xs text-slate-400">({(t.pedidosPct * 100).toFixed(0)}%)</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {fmt(t.revenue)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-700">
                      {fmt(t.ticketMedio)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs">
                      {t.recomendacaoEquipe}
                    </TableCell>
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

export default HorariosTab;
