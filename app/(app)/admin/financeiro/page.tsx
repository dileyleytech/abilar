import Link from 'next/link';
import { formatBRL } from '@abilar/shared';
import { requireRole } from '@/lib/auth/session';
import { getAdminFinancials } from '@/lib/admin/financials';
import { Page, PageHeader, Section, Card, Stat } from '@/components/ui';

export const metadata = { title: 'Financeiro — Admin Abilar' };

export default async function AdminFinanceiroPage() {
  await requireRole('ADMIN');
  const f = await getAdminFinancials();

  return (
    <Page width="xl">
      <PageHeader
        title="Financeiro"
        description={`Repartição dos ${f.contractsCount} contrato(s) assinado(s). Orçamentos avulsos não entram aqui.`}
        back={<Link href="/admin" className="text-small text-muted hover:underline">← Painel</Link>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pago pelos clientes" value={formatBRL(f.clientTotalCents)} hint="total face ao cliente" mono />
        <Stat label="Fica com a plataforma" value={formatBRL(f.platformNetCents)} hint="líquido de comissões" tone="success" mono />
        <Stat label="Repassado a marceneiros" value={formatBRL(f.carpenterTotalCents)} mono />
        <Stat label="Repassado a arquitetos" value={formatBRL(f.architectTotalCents)} mono />
      </div>

      <Section title="Repasse por marceneiro">
        <Card>
          {f.byCarpenter.length === 0 ? (
            <Empty />
          ) : (
            <ul className="flex flex-col divide-y divide-subtle">
              {f.byCarpenter.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-charcoal">{c.name}</p>
                    <p className="text-caption text-muted">{c.contracts} obra(s)</p>
                  </div>
                  <p className="font-mono font-semibold text-charcoal">{formatBRL(c.payoutCents)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

      <Section title="Comissão por arquiteto">
        <Card>
          {f.byArchitect.length === 0 ? (
            <p className="text-small text-muted">Nenhum contrato com arquiteto indicado.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-subtle">
              {f.byArchitect.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-charcoal">{a.name}</p>
                    <p className="text-caption text-muted">{a.contracts} obra(s) · {a.commissionPercent}%</p>
                  </div>
                  <p className="font-mono font-semibold text-charcoal">{formatBRL(a.commissionCents)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

      <p className="mt-6 text-caption text-subtle">
        A comissão do arquiteto sai da fatia da plataforma — o cliente não paga a mais por isso. Repasse e escrow reais entram na Fase 5 (Asaas).
      </p>
    </Page>
  );
}

function Empty() {
  return <p className="text-small text-muted">Sem repasses ainda.</p>;
}
