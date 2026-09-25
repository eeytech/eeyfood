"use client";

import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  from: string;
  to: string;
}

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const DateRangeFilter = ({ from, to }: DateRangeFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", newFrom);
      params.set("to", newTo);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const today = () => {
    const d = new Date().toISOString().slice(0, 10);
    navigate(d, d);
  };

  const last7 = () => {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - 6);
    navigate(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
  };

  const last30 = () => {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - 29);
    navigate(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
  };

  const thisMonth = () => {
    const now = new Date();
    const f = new Date(now.getFullYear(), now.getMonth(), 1);
    navigate(f.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
  };

  const lastMonth = () => {
    const now = new Date();
    const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const t = new Date(now.getFullYear(), now.getMonth(), 0);
    navigate(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10));
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const t7 = new Date();
  const f7 = new Date();
  f7.setDate(f7.getDate() - 6);
  const isLast7 =
    from === f7.toISOString().slice(0, 10) && to === t7.toISOString().slice(0, 10);

  const t30 = new Date();
  const f30 = new Date();
  f30.setDate(f30.getDate() - 29);
  const isLast30 =
    from === f30.toISOString().slice(0, 10) && to === t30.toISOString().slice(0, 10);

  const fThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const isThisMonth = from === fThisMonth && to === todayStr;

  const fLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 10);
  const tLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .slice(0, 10);
  const isLastMonth = from === fLastMonth && to === tLastMonth;

  const isToday = from === todayStr && to === todayStr;

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm print:hidden">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-slate-500">Atalhos:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={today}
              className={cn(
                "h-9 rounded-xl px-3 text-xs font-medium transition-all",
                isToday
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={last7}
              className={cn(
                "h-9 rounded-xl px-3 text-xs font-medium transition-all",
                isLast7
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              7 dias
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={last30}
              className={cn(
                "h-9 rounded-xl px-3 text-xs font-medium transition-all",
                isLast30
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              30 dias
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={thisMonth}
              className={cn(
                "h-9 rounded-xl px-3 text-xs font-medium transition-all",
                isThisMonth
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              Este mês
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={lastMonth}
              className={cn(
                "h-9 rounded-xl px-3 text-xs font-medium transition-all",
                isLastMonth
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              Mês passado
            </Button>
          </div>

          {/* Date Picker Custom Range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-1">
              <DatePicker
                value={from}
                onChange={(_, str) => str && navigate(str, to)}
                buttonClassName="h-8 rounded-lg border-0 bg-white text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 px-3 min-w-[130px]"
                clearable={false}
                placeholder="Data inicial"
              />
              <span className="text-xs text-slate-400">até</span>
              <DatePicker
                value={to}
                onChange={(_, str) => str && navigate(from, str)}
                buttonClassName="h-8 rounded-lg border-0 bg-white text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 px-3 min-w-[130px]"
                clearable={false}
                placeholder="Data final"
              />
            </div>
          </div>
        </div>

        {/* Results / filter indicator footer */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CalendarIcon size={14} className="text-slate-400" />
            <span>
              Período selecionado:{" "}
              <strong className="font-semibold text-slate-900">
                {fmt(from)} — {fmt(to)}
              </strong>
            </span>
          </div>
          <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            Dados consolidados
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DateRangeFilter;
