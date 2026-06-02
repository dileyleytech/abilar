import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <Link href="/" className="flex justify-center" aria-label="Abilar — início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/abilar-wordmark-color.svg" alt="Abilar" className="h-9 w-auto" />
      </Link>
      <div className="rounded-2xl border border-subtle bg-surface p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}
