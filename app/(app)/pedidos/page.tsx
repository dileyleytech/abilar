import Link from 'next/link';
import { isTerminalProjectStatus, type Category } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { listMyProjects } from '@/lib/projects/queries';
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/labels';
import { StatusBadge } from '@/components/StatusBadge';
import { CancelButton } from './_components/CancelButton';

export const metadata = { title: 'Meus pedidos — Abilar' };

export default async function PedidosPage() {
  const userId = await requireUserId();
  const projects = await listMyProjects(userId);

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Meus pedidos</h1>
          <p className="text-sm text-muted">Acompanhe e gerencie seus projetos de marcenaria.</p>
        </div>
        <Link
          href="/pedidos/novo"
          className="shrink-0 rounded-xl bg-brand-primary px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          + Novo pedido
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-subtle bg-surface p-12 text-center">
          <span className="text-5xl" aria-hidden>
            🪵
          </span>
          <p className="text-lg font-medium text-charcoal">Você ainda não tem pedidos</p>
          <p className="max-w-sm text-muted">
            Crie um pedido com foto e medidas e receba orçamentos de marceneiros da sua região.
          </p>
          <Link
            href="/pedidos/novo"
            className="mt-2 rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white"
          >
            Criar meu primeiro pedido
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => (
            <li key={p.id} className="group relative">
              <Link
                href={`/pedidos/${p.id}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-subtle bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-deep text-2xl" aria-hidden>
                    {CATEGORY_EMOJI[p.category as Category]}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">
                    {p.title ?? CATEGORY_LABELS[p.category as Category]}
                  </h2>
                  <p className="text-sm text-muted">
                    {p.workType === 'NEW_INSTALL' ? 'Móvel novo' : 'Substituição'}
                  </p>
                </div>
              </Link>
              {!isTerminalProjectStatus(p.status) && (
                <div className="absolute bottom-3 right-3">
                  <CancelButton projectId={p.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
