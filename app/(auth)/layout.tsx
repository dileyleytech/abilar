import Link from 'next/link';
import { brand } from '@abilar/shared/tokens';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <Link href="/" className="text-center text-2xl font-bold text-charcoal">
        {brand.name}
      </Link>
      <div className="rounded-lg bg-surface p-6 shadow-sm">{children}</div>
    </main>
  );
}
