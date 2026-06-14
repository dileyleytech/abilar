import Link from 'next/link';
import { requireUserId } from '@/lib/auth/session';
import { listMyProjectsWithCover } from '@/lib/projects/queries';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { Page, PageHeader, EmptyState, buttonVariants } from '@/components/ui';
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
    <Page width="full">
      <PageHeader
        title="Meus pedidos"
        description="Acompanhe e gerencie seus projetos de marcenaria."
        action={
          <Link href="/pedidos/novo" className={buttonVariants({ variant: 'primary' })}>
            Novo pedido
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<span className="text-3xl" aria-hidden>🪵</span>}
          title="Você ainda não tem pedidos"
          hint="Crie um pedido com foto e medidas e receba orçamentos de marceneiros da sua região."
          action={
            <Link href="/pedidos/novo" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Criar meu primeiro pedido
            </Link>
          }
        />
      ) : (
        <PedidosList projects={projects} />
      )}
    </Page>
  );
}
