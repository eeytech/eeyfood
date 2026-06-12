const ProductCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="animate-pulse overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
  >
    <div className="aspect-[16/10] w-full bg-slate-200" />
    <div className="flex flex-col gap-4 p-5">
      <div className="space-y-2">
        <div className="h-4 w-3/4 rounded-lg bg-slate-200" />
        <div className="h-3 w-full rounded-lg bg-slate-200" />
        <div className="h-3 w-2/3 rounded-lg bg-slate-200" />
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-3 w-14 rounded bg-slate-200" />
          <div className="h-5 w-20 rounded bg-slate-200" />
        </div>
        <div className="h-9 w-28 rounded-full bg-slate-200" />
      </div>
    </div>
  </div>
);

const CategoryNavSkeleton = () => (
  <div aria-hidden="true" className="flex gap-3 overflow-hidden">
    {[80, 96, 72, 104, 64].map((width, i) => (
      <div
        key={i}
        className="h-8 flex-shrink-0 animate-pulse rounded-full bg-slate-200"
        style={{ width }}
      />
    ))}
  </div>
);

export { ProductCardSkeleton, CategoryNavSkeleton };
