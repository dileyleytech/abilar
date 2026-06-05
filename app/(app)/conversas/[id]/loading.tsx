export default function Loading() {
  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-screen-md flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-deep" />
      <div className="flex flex-1 flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={i % 2 === 0 ? 'self-start' : 'self-end'}>
            <div
              className={`h-12 animate-pulse rounded-2xl bg-deep ${i % 2 === 0 ? 'w-56' : 'w-44'}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 h-12 w-full animate-pulse rounded-pill bg-deep" />
    </main>
  );
}
