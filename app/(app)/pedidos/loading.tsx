export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-9 w-48 animate-pulse rounded-lg bg-deep" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-subtle bg-surface">
            <div className="aspect-[4/3] animate-pulse bg-deep" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-deep" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-deep" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
