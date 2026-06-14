import Link from 'next/link';
import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getAdminStats } from '@/lib/admin/stats';
import { PROJECT_STATUS_LABEL } from '@/lib/labels';
import { Page, PageHeader, Section, Card, Stat, buttonVariants } from '@/components/ui';

export const metadata = { title: 'Painel — Admin Abilar' };

const ROLE_LABEL: Record<string, string> = { CLIENT: 'Clientes', CARPENTER: 'Marceneiros', ARCHITECT: 'Arquitetos', ADMIN: 'Admins' };

export default async function AdminPage() {
  await requireRole('ADMIN');
  const s = await getAdminStats();

  return (
    <Page width="xl">
      <PageHeader title="Painel" description="Visão geral da plataforma." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="GMV contratado" value={formatBRL(s.gmvCents)} tone="success" mono />
        <Stat label="Contratos assinados" value={String(s.contractsSigned)} />
        <Stat label="Orçamentos" value={`${s.quotesAccepted}/${s.quotesTotal}`} hint="aceitos/total" />
        <Link href="/admin/denuncias" className="block h-full rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">
          <Stat className="h-full" label="Denúncias abertas" value={s.reportsOpen} tone={s.reportsOpen > 0 ? 'danger' : 'default'} />
        </Link>
      </div>

      <Section title="Resumo">
        <div className="grid gap-6 sm:grid-cols-2">
          <ListCard title="Usuários por papel">
            {Object.entries(s.usersByRole).length === 0 ? (
              <Empty />
            ) : (
              Object.entries(s.usersByRole).map(([role, n]) => <Row key={role} label={ROLE_LABEL[role] ?? role} value={n} />)
            )}
          </ListCard>
          <ListCard title="Pedidos por status">
            {Object.entries(s.projectsByStatus).length === 0 ? (
              <Empty />
            ) : (
              Object.entries(s.projectsByStatus).map(([st, n]) => <Row key={st} label={PROJECT_STATUS_LABEL[st as keyof typeof PROJECT_STATUS_LABEL] ?? st} value={n} />)
            )}
          </ListCard>
        </div>
      </Section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/financeiro" className={buttonVariants({ variant: 'outline' })}>Financeiro</Link>
        <Link href="/admin/arquitetos" className={buttonVariants({ variant: 'outline' })}>Arquitetos</Link>
        <Link href="/admin/precos" className={buttonVariants({ variant: 'outline' })}>Taxas e promoções</Link>
        <Link href="/admin/denuncias" className={buttonVariants({ variant: 'outline' })}>Denúncias</Link>
      </div>
    </Page>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 text-h3 font-semibold text-charcoal">{title}</h2>
      <dl className="flex flex-col gap-2">{children}</dl>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function Empty() {
  return <p className="text-small text-muted">Sem dados ainda.</p>;
}
