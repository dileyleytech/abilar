import Link from 'next/link';
import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getAdminFinancials } from '@/lib/admin/financials';

export const metadata = { title: 'Financeiro — Admin Abilar' };

export default async function AdminFinanceiroPage() {
  await requireRole('ADMIN');
  const f = await getAdminFinancials();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted hover:underline">← Painel</Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal sm:text-3xl">Financeiro</h1>
        <p className="text-sm text-muted">Repartição dos {f.contractsCount} contrato(s) assinado(s). Orçamentos avulsos não entram aqui.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pago pelos clientes" value={formatBRL(f.clientTotalCents)} strong hint="total face ao cliente" />
        <Kpi label="Fica com a plataforma" value={formatBRL(f.platformNetCents)} hint="líquido de comissões" />
        <Kpi label="Repassado a marceneiros" value={formatBRL(f.carpenterTotalCents)} />
        <Kpi label="Repassado a arquitetos" value={formatBRL(f.architectTotalCents)} />
      </div>

      <section className="mt-8 rounded-2xl border border-subtle bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-charcoal">Repasse por marceneiro</h2>
        {f.byCarpenter.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col divide-y divide-subtle">
            {f.byCarpenter.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-charcoal">{c.name}</p>
                  <p className="text-xs text-muted">{c.contracts} obra(s)</p>
                </div>
                <p className="font-semibold text-charcoal">{formatBRL(c.payoutCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-subtle bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-charcoal">Comissão por arquiteto</h2>
        {f.byArchitect.length === 0 ? (
          <p className="text-sm text-muted">Nenhum contrato com arquiteto indicado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-subtle">
            {f.byArchitect.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-charcoal">{a.name}</p>
                  <p className="text-xs text-muted">{a.contracts} obra(s) · {a.commissionPercent}%</p>
                </div>
                <p className="font-semibold text-charcoal">{formatBRL(a.commissionCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-subtle">
        A comissão do arquiteto sai da fatia da plataforma — o cliente não paga a mais por isso. Repasse e escrow reais entram na Fase 5 (Asaas).
      </p>
    </main>
  );
}

function Kpi({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold sm:text-2xl ${strong ? 'text-brand-secondary' : 'text-charcoal'}`}>{value}</p>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted">Sem repasses ainda.</p>;
}
