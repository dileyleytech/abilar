export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-3 h-4 w-40 animate-pulse rounded bg-deep" />
      <div className="mb-6 h-8 w-2/3 max-w-md animate-pulse rounded-lg bg-deep" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-subtle bg-surface p-5 sm:p-6">
            <div className="mb-4 h-6 w-48 animate-pulse rounded bg-deep" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-subtle p-3">
                  <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-deep" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-deep" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-deep" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="h-40 animate-pulse rounded-2xl border border-subtle bg-surface" />
          <div className="h-64 animate-pulse rounded-2xl border border-subtle bg-surface" />
        </aside>
      </div>
    </main>
  );
}
