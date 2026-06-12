import { CategoryNavSkeleton, ProductCardSkeleton } from "./components/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Placeholder */}
      <div className="relative h-[280px] w-full animate-pulse bg-slate-200 sm:h-[320px] lg:h-[380px]" />

      <div className="relative z-20 mt-[-1.5rem] rounded-t-[2rem] bg-white">
        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Info Card Placeholder */}
          <div className="flex flex-col gap-5 rounded-[32px] bg-slate-50 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-200" />
              <div className="space-y-3">
                <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-4 w-64 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          </div>

          {/* Search Bar Placeholder */}
          <div className="mt-5 h-10 w-full animate-pulse rounded-full bg-slate-50" />

          {/* Category Nav Placeholder */}
          <div className="mt-6 border-b pb-4 lg:hidden">
            <CategoryNavSkeleton />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_340px] xl:grid-cols-[260px_minmax(0,1fr)_360px]">
            {/* Sidebar Placeholder */}
            <aside className="hidden lg:block">
              <div className="space-y-4 rounded-[32px] border bg-white p-4 shadow-sm">
                <div className="space-y-2 px-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-14 w-full animate-pulse rounded-2xl bg-slate-50"
                    />
                  ))}
                </div>
              </div>
            </aside>

            {/* Products Grid Placeholder */}
            <section className="space-y-8">
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            </section>

            {/* Cart Panel Placeholder */}
            <aside className="hidden lg:block">
              <div className="h-[400px] w-full animate-pulse rounded-[32px] bg-slate-50" />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
