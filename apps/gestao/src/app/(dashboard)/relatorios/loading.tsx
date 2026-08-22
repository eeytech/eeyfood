import { Card, CardContent, CardHeader } from "@/components/ui/card";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className ?? ""}`} />
);

const RelatoriosLoading = () => {
  return (
    <main className="space-y-4">
      {/* Header / date filter skeleton */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-white/80 bg-white/90">
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-3 w-24" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart area */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <Skeleton className="h-56 w-56 rounded-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default RelatoriosLoading;
