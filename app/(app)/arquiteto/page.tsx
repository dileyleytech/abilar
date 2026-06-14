import Link from 'next/link';
import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getArchitectDashboard } from '@/lib/architects/queries';
import { PROJECT_STATUS_LABEL } from '@/lib/labels';
import { Page, PageHeader, Section, Card, Stat, Badge, buttonVariants } from '@/components/ui';
import { ShareReferral } from './_components/ShareReferral';

export const metadata = { title: 'Início — Arquiteto Abilar' };

export default async function ArquitetoPage() {
  const me = await requireRole('ARCHITECT');
  const d = await getArchitectDashboard(me.id);

  return (
    <Page width="lg">
      <PageHeader
        title={`Olá, ${me.name ?? 'arquiteto'} 👋`}
        description="Seus projetos indicados e suas comissões."
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Comissão acumulada" value={formatBRL(d.earnedCents)} tone="success" mono hint={`${d.commissionPercent}% por obra`} />
        <Stat label="Projetos indicados" value={String(d.projects.length)} />
        <Stat label="Aguardando" value={String(d.pendingCount)} hint="ainda não contratados" />
      </div>

      <div className="mt-6">
        {d.referralCode ? (
          <ShareReferral code={d.referralCode} />
        ) : (
          <Card className="text-small text-muted">
            Seu código de indicação ainda não foi gerado. Fale com o suporte.
          </Card>
        )}
      </div>

      <Section title="Meus projetos">
        {d.projects.length === 0 ? (
          <Card pad="lg" className="text-center text-muted">
            Nenhum projeto ainda. Compartilhe seu link de indicação com seus clientes.
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {d.projects.map((p) => (
              <li key={p.id}>
                <Card pad="sm" className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-charcoal">{p.title}</p>
                    <p className="text-small text-muted">
                      {p.clientName ?? 'Cliente'} · {PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ?? p.status}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {p.commissionCents != null ? (
                      <>
                        <p className="font-mono font-semibold text-brand-secondary">{formatBRL(p.commissionCents)}</p>
                        <p className="text-caption text-muted">comissão</p>
                      </>
                    ) : (
                      <Badge>em andamento</Badge>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/conversas" className={buttonVariants({ variant: 'outline' })}>Conversas</Link>
        <Link href="/conta" className={buttonVariants({ variant: 'outline' })}>Minha conta</Link>
      </div>
    </Page>
  );
}
