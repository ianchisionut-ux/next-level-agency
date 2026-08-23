export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink-700 ${className}`} />;
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-3.5 flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <SkeletonBlock className="h-9 w-32 rounded-xl" />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-5 space-y-3">
      <SkeletonBlock className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3.5 w-full" />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card divide-y divide-ink-700 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <SkeletonBlock className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3.5 w-2/3" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCalendarGrid() {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ink-700">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-2 py-2.5 flex justify-center">
            <SkeletonBlock className="h-3 w-6" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[130px] border-b border-r border-ink-700 p-2">
            <SkeletonBlock className="h-5 w-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Pagina generica: header + 4 carduri de statistici + o zona mare de continut. */
export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStatCards />
      <SkeletonCard lines={5} />
    </div>
  );
}
