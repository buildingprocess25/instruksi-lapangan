export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <div className="grid grid-cols-1 gap-6 rounded-3xl bg-slate-100 p-6 lg:grid-cols-12 lg:p-8 dark:bg-muted">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-300 lg:col-span-5 dark:bg-slate-700" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-300 lg:col-span-4 dark:bg-slate-700" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-300 lg:col-span-3 dark:bg-slate-700" />
      </div>
    </div>
  )
}
