import Link from 'next/link';
import { isTerminalProjectStatus } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { listMyProjectsWithCover } from '@/lib/projects/queries';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { StatusBadge } from '@/components/StatusBadge';
import { CancelButton } from './_components/CancelButton';

export const metadata = { title: 'Meus pedidos — Abilar' };

export default async function PedidosPage() {
  const userId = await requireUserId();
  const rows = await listMyProjectsWithCover(userId);
  const projects = await Promise.all(
    rows.map(async (p) => ({
      ...p,
      coverUrl: p.coverPath ? await signedProjectPhotoUrl(p.coverPath) : null,
    })),
  );

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
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-deep">
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-5xl" aria-hidden>
                      🛋️
                    </span>
                  )}
                  <span className="absolute right-2 top-2">
                    <StatusBadge status={p.status} />
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-charcoal">{p.title}</h2>
                  <p className="text-sm text-muted">
                    {p.moduleCount} {p.moduleCount === 1 ? 'móvel' : 'móveis'}
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
