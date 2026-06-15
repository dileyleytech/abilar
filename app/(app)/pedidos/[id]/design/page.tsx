import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projects, and, eq } from '@abilar/db';
import { requireUserId } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { loadDesignState } from '@/lib/design/queries';
import { Page, PageHeader, buttonVariants } from '@/components/ui';
import { IconVoltar } from '@/components/ui/icons';
import { DesignChat } from './_components/DesignChat';

export const metadata = { title: 'Conversar com a ABI — Abilar' };

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();

  const db = getDb();
  const [project] = await db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.clientId, userId)))
    .limit(1);
  if (!project) notFound();

  const state = await loadDesignState(id);

  return (
    <Page width="md">
      <PageHeader
        title="Conversar com a ABI"
        description={`Ajuste o projeto "${project.title}" falando naturalmente — a ABI entende e atualiza.`}
        back={
          <Link href={`/pedidos/${id}`} className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} mb-2 -ml-2`}>
            <IconVoltar size={16} aria-hidden /> Voltar ao pedido
          </Link>
        }
      />
      <DesignChat projectId={id} initialState={state} />
    </Page>
  );
}
