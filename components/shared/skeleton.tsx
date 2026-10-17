// Placeholder while a screen's data loads. Same rhythm as the real screens.
export function ScreenSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="flex min-h-[52px] items-center px-4 pt-3">
        <div className="h-5 w-24 rounded bg-line" />
      </div>
      <div className="flex flex-col gap-2 px-4 pt-2">
        <div className="h-8 w-48 rounded bg-line" />
        <div className="h-4 w-64 rounded bg-line-soft" />
      </div>
      <div className="mx-4 mt-6 flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl border border-line bg-card"
          />
        ))}
      </div>
    </div>
  );
}
