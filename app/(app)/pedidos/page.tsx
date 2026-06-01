import Link from 'next/link';
import type { ProjectStatus } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { listMyProjects } from '@/lib/projects/queries';

export const metadata = { title: 'Meus pedidos — Abilar' };

const STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Rascunho',
  OPEN_FOR_QUOTES: 'Recebendo orçamentos',
  IN_NEGOTIATION: 'Em negociação',
  HIRED: 'Contratado',
  EXECUTED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export default async function PedidosPage() {
  const userId = await requireUserId();
  const projects = await listMyProjects(userId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-charcoal">Meus pedidos</h1>
        <Link href="/pedidos/novo" className="rounded-md bg-brand px-4 py-2 text-base font-medium text-white">
          + Novo
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg bg-surface p-6 text-center text-muted shadow-sm">
          <p>Você ainda não tem pedidos.</p>
          <Link href="/pedidos/novo" className="mt-2 inline-block font-medium text-brand underline">
            Criar meu primeiro pedido
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/pedidos/${p.id}`} className="block rounded-lg border border-subtle bg-surface p-4 shadow-sm transition hover:border-brand">
                <span className="block text-lg font-semibold text-charcoal">{p.title ?? p.category}</span>
                <span className="text-sm text-muted">{STATUS_LABEL[p.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
