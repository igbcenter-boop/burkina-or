/** États de chargement sobres, aux couleurs de la charte. */
export function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-sand ${className}`} />;
}

export function ProductSkeleton() {
  return (
    <main className="wrap pt-7">
      <Bar className="h-4 w-64" />
      <div className="mt-5 grid gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="stripes-ink aspect-square animate-pulse rounded-xl" />
        <div className="flex flex-col gap-5">
          <Bar className="h-7 w-48" />
          <Bar className="h-12 w-3/4" />
          <div className="h-44 rounded-xl border border-line bg-white" />
          <Bar className="h-12 w-full" />
          <div className="h-64 rounded-xl border border-line bg-white" />
        </div>
      </div>
    </main>
  );
}

export function PageSkeleton({ title = true }: { title?: boolean }) {
  return (
    <main className="wrap py-10">
      {title && <Bar className="mb-6 h-10 w-72" />}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl border border-line bg-white" />
        ))}
      </div>
    </main>
  );
}

export function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}
