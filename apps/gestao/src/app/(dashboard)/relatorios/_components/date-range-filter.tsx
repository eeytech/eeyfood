"use client";

import { CalendarIcon, FilterIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <Card className="overflow-hidden border-white/80 bg-white/90 print:hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2 text-xl">
              <FilterIcon className="text-primary" size={18} />
              Relatórios &amp; Analytics
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              Período:{" "}
              <span className="font-medium text-foreground">
                {fmt(from)} — {fmt(to)}
              </span>
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={today}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={last7}>
              7 dias
            </Button>
            <Button variant="outline" size="sm" onClick={last30}>
              30 dias
            </Button>
            <Button variant="outline" size="sm" onClick={thisMonth}>
              Este mês
            </Button>
            <Button variant="outline" size="sm" onClick={lastMonth}>
              Mês passado
            </Button>

            <div className="flex items-center gap-1.5">
              <CalendarIcon className="text-muted-foreground" size={14} />
              <input
                type="date"
                defaultValue={from}
                key={`from-${from}`}
                className="h-8 rounded-full border border-input bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => e.target.value && navigate(e.target.value, to)}
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="date"
                defaultValue={to}
                key={`to-${to}`}
                className="h-8 rounded-full border border-input bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => e.target.value && navigate(from, e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3" />
    </Card>
  );
};

export default DateRangeFilter;
