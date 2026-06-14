import Link from 'next/link';
import { cookies } from 'next/headers';
import { requireUserId } from '@/lib/auth/session';
import { activeArchitectBriefByCode } from '@/lib/architects/queries';
import { Page, PageHeader, Card } from '@/components/ui';
import { NovoPedido } from '../_components/NovoPedido';

export const metadata = { title: 'Novo pedido — Abilar' };

export default async function NovoPedidoPage() {
  await requireUserId();
  // Indicação de arquiteto guardada no cookie (link de compartilhamento).
  const refCode = (await cookies()).get('abilar_ref')?.value;
  const referred = refCode ? await activeArchitectBriefByCode(refCode) : null;
  return (
    <Page width="sm">
      <PageHeader
        title="Novo pedido"
        back={
          <Link href="/pedidos" className="mb-3 inline-flex items-center gap-1 text-small text-muted hover:text-charcoal">
            ← Meus pedidos
          </Link>
        }
      />
      <Card pad="lg">
        <NovoPedido referred={referred ? { id: referred.userId, name: referred.name } : null} />
      </Card>
    </Page>
  );
}
