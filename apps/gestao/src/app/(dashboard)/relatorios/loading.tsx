import { Card, CardContent, CardHeader } from "@/components/ui/card";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className ?? ""}`} />
);

const RelatoriosLoading = () => {
  return (
    <div className="space-y-6">
      {/* ── Page Header Skeleton ─────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* ── Filter Card Skeleton ─────────────────────────── */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-14" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-72 rounded-xl" />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs Navigation Skeleton ─────────────────────── */}
      <div className="flex h-12 gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-full w-28 rounded-xl bg-slate-200/60" />
        ))}
      </div>

      {/* ── Metric KPI Cards Skeleton ────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton className="mt-2 h-7 w-24" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Chart Area Skeleton ──────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-52" />
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-4">
            <Skeleton className="h-56 w-56 rounded-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatoriosLoading;
