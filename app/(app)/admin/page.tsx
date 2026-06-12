import Link from 'next/link';
import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getAdminStats } from '@/lib/admin/stats';
import { PROJECT_STATUS_LABEL } from '@/lib/labels';

export const metadata = { title: 'Painel — Admin Abilar' };

const ROLE_LABEL: Record<string, string> = { CLIENT: 'Clientes', CARPENTER: 'Marceneiros', ARCHITECT: 'Arquitetos', ADMIN: 'Admins' };

export default async function AdminPage() {
  await requireRole('ADMIN');
  const s = await getAdminStats();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Painel</h1>
      <p className="mb-6 text-sm text-muted">Visão geral da plataforma.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="GMV contratado" value={formatBRL(s.gmvCents)} strong />
        <Kpi label="Contratos assinados" value={String(s.contractsSigned)} />
        <Kpi label="Orçamentos" value={`${s.quotesAccepted}/${s.quotesTotal}`} hint="aceitos/total" />
        <Link href="/admin/denuncias" className="rounded-2xl border border-subtle bg-surface p-4 transition hover:border-brand-primary/40">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Denúncias abertas</p>
          <p className={`mt-1 text-2xl font-bold ${s.reportsOpen > 0 ? 'text-ochre' : 'text-charcoal'}`}>{s.reportsOpen}</p>
        </Link>
      </div>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <Card title="Usuários por papel">
          {Object.entries(s.usersByRole).length === 0 ? (
            <Empty />
          ) : (
            Object.entries(s.usersByRole).map(([role, n]) => <Row key={role} label={ROLE_LABEL[role] ?? role} value={n} />)
          )}
        </Card>
        <Card title="Pedidos por status">
          {Object.entries(s.projectsByStatus).length === 0 ? (
            <Empty />
          ) : (
            Object.entries(s.projectsByStatus).map(([st, n]) => <Row key={st} label={PROJECT_STATUS_LABEL[st as keyof typeof PROJECT_STATUS_LABEL] ?? st} value={n} />)
          )}
        </Card>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/precos" className="rounded-xl border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-charcoal hover:bg-deep">⚙️ Taxas e promoções</Link>
        <Link href="/admin/denuncias" className="rounded-xl border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-charcoal hover:bg-deep">🚩 Denúncias</Link>
      </div>
    </main>
  );
}

function Kpi({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${strong ? 'text-brand-secondary' : 'text-charcoal'}`}>{value}</p>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-subtle bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold text-charcoal">{title}</h2>
      <dl className="flex flex-col gap-2">{children}</dl>
    </section>
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
  return <p className="text-sm text-muted">Sem dados ainda.</p>;
}
