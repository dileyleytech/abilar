import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getCarpenterReport } from '@/lib/reports/queries';

export const metadata = { title: 'Relatórios — Abilar' };

export default async function RelatoriosPage() {
  const profile = await requireRole('CARPENTER');
  const r = await getCarpenterReport(profile.id);

  const Block = ({ title, d }: { title: string; d: { sent: number; accepted: number; valueCents: number; costCents: number; profitCents: number } }) => (
    <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-charcoal">{title}</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Enviados" value={String(d.sent)} />
        <Stat label="Aceitos" value={String(d.accepted)} />
        <Stat label="Conversão" value={d.sent ? `${Math.round((d.accepted / d.sent) * 100)}%` : '—'} />
        <Stat label="Faturado" value={formatBRL(d.valueCents)} />
        <Stat label="Custo" value={formatBRL(d.costCents)} />
        <Stat label="Lucro estimado" value={formatBRL(d.profitCents)} strong />
      </dl>
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Relatórios</h1>
      <p className="mb-6 text-sm text-muted">Seus ganhos e conversão — pedidos da plataforma (aceitos) + orçamentos avulsos.</p>

      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border-2 border-brand-secondary/25 bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-charcoal">Total geral</h2>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Faturado" value={formatBRL(r.total.valueCents)} />
            <Stat label="Custo" value={formatBRL(r.total.costCents)} />
            <Stat label="Lucro estimado" value={formatBRL(r.total.profitCents)} strong />
          </dl>
        </section>
        <Block title="Plataforma" d={r.platform} />
        <Block title="Avulsos" d={r.external} />
      </div>
      <p className="mt-4 text-xs text-subtle">Lucro estimado = valor − custo dos materiais informados. Não inclui impostos nem comissões da plataforma.</p>
    </main>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-base p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-0.5 text-lg font-bold ${strong ? 'text-brand-secondary' : 'text-charcoal'}`}>{value}</dd>
    </div>
  );
}
