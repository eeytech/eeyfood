import { CategoryNavSkeleton, ProductCardSkeleton } from "./components/skeletons";

const MenuPageLoading = () => {
  return (
    <div>
      {/* Header */}
      <div
        className="h-[200px] animate-pulse bg-slate-200 sm:h-[250px]"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-20 mt-[-1.5rem] rounded-t-[2rem] bg-white">
        <div className="mx-auto max-w-[1600px] px-5 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {/* Restaurant info skeleton */}
          <div
            className="flex animate-pulse flex-col gap-5 rounded-[32px] bg-slate-50 p-5 sm:p-6"
            aria-hidden="true"
          >
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 flex-shrink-0 rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 rounded-lg bg-slate-200" />
                <div className="h-4 w-full max-w-sm rounded-lg bg-slate-200" />
                <div className="h-6 w-36 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>

          {/* Search skeleton */}
          <div
            className="mt-5 h-10 animate-pulse rounded-full bg-slate-200"
            aria-hidden="true"
          />

          {/* Mobile category nav skeleton */}
          <div className="mt-4 lg:hidden" aria-hidden="true">
            <CategoryNavSkeleton />
          </div>

          {/* Product grid skeleton */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuPageLoading;
