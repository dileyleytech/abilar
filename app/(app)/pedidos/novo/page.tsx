import { requireUserId } from '@/lib/auth/session';
import { NovoPedido } from '../_components/NovoPedido';

export const metadata = { title: 'Novo pedido — Abilar' };

export default async function NovoPedidoPage() {
  await requireUserId(); // protege a rota
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-center text-xl font-bold text-charcoal">Novo pedido</h1>
      <div className="rounded-lg bg-surface p-6 shadow-sm">
        <NovoPedido />
      </div>
    </main>
  );
}
