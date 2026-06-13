import Link from 'next/link';
import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getArchitectDashboard } from '@/lib/architects/queries';
import { PROJECT_STATUS_LABEL } from '@/lib/labels';
import { ShareReferral } from './_components/ShareReferral';

export const metadata = { title: 'Início — Arquiteto Abilar' };

export default async function ArquitetoPage() {
  const me = await requireRole('ARCHITECT');
  const d = await getArchitectDashboard(me.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">Olá, {me.name ?? 'arquiteto'} 👋</h1>
      <p className="mb-6 text-sm text-muted">Seus projetos indicados e suas comissões.</p>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Comissão acumulada" value={formatBRL(d.earnedCents)} strong hint={`${d.commissionPercent}% por obra`} />
        <Kpi label="Projetos indicados" value={String(d.projects.length)} />
        <Kpi label="Aguardando" value={String(d.pendingCount)} hint="ainda não contratados" />
      </div>

      <div className="mt-6">
        {d.referralCode ? <ShareReferral code={d.referralCode} /> : <p className="rounded-2xl border border-dashed border-subtle bg-surface p-5 text-sm text-muted">Seu código de indicação ainda não foi gerado. Fale com o suporte.</p>}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-charcoal">Meus projetos</h2>
        {d.projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
            Nenhum projeto ainda. Compartilhe seu link de indicação com seus clientes.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {d.projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-subtle bg-surface p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-charcoal">{p.title}</p>
                  <p className="text-sm text-muted">
                    {p.clientName ?? 'Cliente'} · {PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ?? p.status}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {p.commissionCents != null ? (
                    <>
                      <p className="font-semibold text-brand-secondary">{formatBRL(p.commissionCents)}</p>
                      <p className="text-xs text-muted">comissão</p>
                    </>
                  ) : (
                    <span className="rounded-pill bg-deep px-2 py-0.5 text-xs text-muted">em andamento</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/conversas" className="rounded-xl border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-charcoal hover:bg-deep">💬 Conversas</Link>
        <Link href="/conta" className="rounded-xl border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-charcoal hover:bg-deep">👤 Minha conta</Link>
      </div>
    </main>
  );
}

function Kpi({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold sm:text-2xl ${strong ? 'text-brand-secondary' : 'text-charcoal'}`}>{value}</p>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}
