import Link from 'next/link';
import { requireUserId } from '@/lib/auth/session';
import { listMyProjectsWithCover } from '@/lib/projects/queries';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { PedidosList, type ProjectCard } from './_components/PedidosList';

export const metadata = { title: 'Meus pedidos — Abilar' };

export default async function PedidosPage() {
  const userId = await requireUserId();
  const rows = await listMyProjectsWithCover(userId);
  const projects: ProjectCard[] = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      moduleCount: p.moduleCount,
      quoteCount: p.quoteCount,
      obraPct: p.obraPct,
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
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-12 text-center shadow-sm">
          <span className="text-5xl" aria-hidden>🪵</span>
          <p className="text-lg font-medium text-charcoal">Você ainda não tem pedidos</p>
          <p className="max-w-sm text-muted">
            Crie um pedido com foto e medidas e receba orçamentos de marceneiros da sua região.
          </p>
          <Link href="/pedidos/novo" className="mt-2 rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white">
            Criar meu primeiro pedido
          </Link>
        </div>
      ) : (
        <PedidosList projects={projects} />
      )}
    </main>
  );
}
