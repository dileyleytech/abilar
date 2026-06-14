import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterReport } from '@/lib/reports/queries';
import { Page, PageHeader, Section, Stat } from '@/components/ui';

export const metadata = { title: 'Relatórios — Abilar' };

export default async function RelatoriosPage() {
  const profile = await requireRole('CARPENTER');
  const r = await getCarpenterReport(profile.id);

  const Block = ({ title, d }: { title: string; d: { sent: number; accepted: number; valueCents: number; costCents: number; profitCents: number } }) => (
    <Section title={title} className="mt-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Enviados" value={String(d.sent)} />
        <Stat label="Aceitos" value={String(d.accepted)} />
        <Stat label="Conversão" value={d.sent ? `${Math.round((d.accepted / d.sent) * 100)}%` : '—'} />
        <Stat label="Faturado" value={formatBRL(d.valueCents)} mono />
        <Stat label="Custo" value={formatBRL(d.costCents)} mono />
        <Stat label="Lucro estimado" value={formatBRL(d.profitCents)} tone="success" mono />
      </div>
    </Section>
  );

  return (
    <Page width="lg">
      <PageHeader
        title="Relatórios"
        description="Seus ganhos e conversão — pedidos da plataforma (aceitos) + orçamentos avulsos."
      />

      <Section title="Total geral">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Faturado" value={formatBRL(r.total.valueCents)} mono />
          <Stat label="Custo" value={formatBRL(r.total.costCents)} mono />
          <Stat label="Lucro estimado" value={formatBRL(r.total.profitCents)} tone="success" mono />
        </div>
      </Section>
      <Block title="Plataforma" d={r.platform} />
      <Block title="Avulsos" d={r.external} />

      <p className="mt-4 text-caption text-subtle">Lucro estimado = valor − custo dos materiais informados. Não inclui impostos nem comissões da plataforma.</p>
    </Page>
  );
}
