// Skeleton loader for /search — shown while results are being fetched.
export default function SearchLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      {/* Title skeleton */}
      <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />

      {/* Search input skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-12 flex-1 animate-pulse rounded-xl bg-muted" />
        <div className="h-12 w-24 animate-pulse rounded-xl bg-muted" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>

      {/* Quick pills skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-muted" />
        ))}
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="h-40 w-full animate-pulse bg-muted" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-2 flex gap-2">
                <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted" />
                <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
