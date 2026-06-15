import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { loadDesignState } from '@/lib/design/queries';
import { carpenterCanPropose } from '@/lib/design/proposals';
import { Page, PageHeader, buttonVariants } from '@/components/ui';
import { IconVoltar } from '@/components/ui/icons';
import { ProposalEditor } from './_components/ProposalEditor';

export const metadata = { title: 'Sugerir mudança — Abilar' };

export default async function SugerirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireRole('CARPENTER');
  if (!(await carpenterCanPropose(id, me.id))) notFound();

  const state = await loadDesignState(id);
  if (state.modules.length === 0) notFound();

  return (
    <Page width="md">
      <PageHeader
        title="Sugerir mudança no projeto"
        description="Edite uma cópia e envie ao cliente como sugestão, ou registre como edição da sua proposta."
        back={
          <Link href={`/marceneiro/pedidos/${id}`} className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} mb-2 -ml-2`}>
            <IconVoltar size={16} aria-hidden /> Voltar ao pedido
          </Link>
        }
      />
      <ProposalEditor projectId={id} initialState={state} />
    </Page>
  );
}
