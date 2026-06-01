import Link from 'next/link';
import { requireUserId } from '@/lib/auth/session';
import { NovoPedido } from '../_components/NovoPedido';

export const metadata = { title: 'Novo pedido — Abilar' };

export default async function NovoPedidoPage() {
  await requireUserId();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/pedidos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-charcoal">
        ← Meus pedidos
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold text-charcoal sm:text-3xl">Novo pedido</h1>
      <div className="rounded-2xl border border-subtle bg-surface p-6 shadow-sm sm:p-8">
        <NovoPedido />
      </div>
    </main>
  );
}
