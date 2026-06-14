import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBRL, CONTRACT_CLAUSES, CONTRACT_LEGAL_NOTE } from '@abilar/shared';
import { allocateProportional } from '@abilar/pricing';
import { requireUserId } from '@/lib/auth/session';
import { getContract } from '@/lib/contracts/queries';
import { MATERIAL_UNIT_LABEL } from '@/lib/labels';
import { backFrom } from '@/lib/nav';
import { IconConcluido } from '@/components/ui/icons';
import { ContractActions } from './_components/ContractActions';

export const metadata = { title: 'Contrato — Abilar' };

const dt = (d: Date) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function ContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const userId = await requireUserId();
  const c = await getContract(id, userId);
  if (!c) notFound();

  const ms = c.terms.milestones ?? [];
  const amounts = ms.length ? allocateProportional(c.valueCents, ms.map((m) => m.pct)) : [];
  const iSigned = c.meIsClient ? c.acceptedByClientAt : c.acceptedByCarpenterAt;
  const canSign = c.status === 'DRAFT' && !iSigned;
  const back = backFrom(from, c.meIsClient ? `/pedidos/${c.projectId}` : `/marceneiro/pedidos/${c.projectId}`);

  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 print:py-0">
      <div className="mb-5 flex items-center justify-between gap-2 print:hidden">
        <Link href={back.href} className="text-small text-muted hover:text-charcoal">{back.label}</Link>
        <ContractActions contractId={c.id} canSign={canSign} />
      </div>

      {c.status === 'SIGNED' ? (
        <p className="mb-4 flex items-center gap-1.5 rounded-md bg-sage/25 px-4 py-3 text-small font-semibold text-charcoal print:hidden">
          <IconConcluido size={18} aria-hidden /> Contrato assinado pelas duas partes.
        </p>
      ) : canSign ? (
        <p className="mb-4 rounded-md bg-ochre/15 px-4 py-3 text-small text-charcoal print:hidden">
          Falta o seu aceite. Leia o contrato e clique em <strong>Aceitar contrato</strong>.
        </p>
      ) : (
        <p className="mb-4 rounded-md bg-deep px-4 py-3 text-small text-charcoal print:hidden">
          Você já aceitou. Aguardando a outra parte assinar.
        </p>
      )}

      <article className="rounded-lg border border-subtle bg-surface p-8 text-charcoal shadow-card print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-subtle pb-5">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-8 w-auto" />
            <p className="mt-2 text-h3 font-semibold">Contrato de prestação de serviço de marcenaria</p>
          </div>
          <span className="rounded-pill bg-deep px-3 py-1 text-caption font-semibold text-charcoal">
            {c.status === 'SIGNED' ? 'Assinado' : 'Aguardando aceite'}
          </span>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-4 text-small">
          <div>
            <p className="text-caption uppercase tracking-wide text-muted">Marceneiro (contratado)</p>
            <p className="font-semibold">{c.carpenterName}</p>
            {c.carpenterCompany && <p className="text-muted">{c.carpenterCompany}</p>}
          </div>
          <div>
            <p className="text-caption uppercase tracking-wide text-muted">Cliente (contratante)</p>
            <p className="font-semibold">{c.clientName}</p>
            {c.projectCity && <p className="text-muted">{c.projectCity}</p>}
          </div>
        </section>

        <section className="mt-5">
          <p className="text-caption uppercase tracking-wide text-muted">Objeto / pedido</p>
          <p className="font-semibold">{c.projectTitle}</p>
        </section>

        {c.terms.items?.length > 0 && (
          <section className="mt-5">
            <p className="mb-2 text-caption uppercase tracking-wide text-muted">Escopo</p>
            <ul className="list-disc pl-5 text-small">
              {c.terms.items.map((it, i) => (
                <li key={i}>{it.name} — {it.qty} {MATERIAL_UNIT_LABEL[it.unit]}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <p className="text-caption uppercase tracking-wide text-muted">Valor e forma de pagamento</p>
          <p className="text-body">
            Valor total: <strong>{formatBRL(c.valueCents)}</strong> à vista (Pix/boleto).
            {c.terms.parceladoCents != null && c.terms.installmentValueCents != null && (
              <> No cartão, em até {c.terms.clientInstallments}x de {formatBRL(c.terms.installmentValueCents)} ({formatBRL(c.terms.parceladoCents)}).</>
            )}
          </p>
        </section>

        {ms.length > 0 && (
          <section className="mt-5">
            <p className="mb-2 text-caption uppercase tracking-wide text-muted">Cronograma de pagamento por marco (escrow)</p>
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-subtle text-left text-muted">
                  <th className="py-1 font-medium">Marco</th>
                  <th className="py-1 font-medium">Evento</th>
                  <th className="py-1 text-right font-medium">%</th>
                  <th className="py-1 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ms.map((m, i) => (
                  <tr key={m.key} className="border-b border-subtle/60 align-top">
                    <td className="py-1.5 font-medium">{m.label}</td>
                    <td className="py-1.5 text-muted">{m.event}</td>
                    <td className="py-1.5 text-right">{m.pct}%</td>
                    <td className="py-1.5 text-right">{formatBRL(amounts[i] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-5 flex flex-col gap-3">
          {CONTRACT_CLAUSES.map((cl) => (
            <div key={cl.title}>
              <p className="text-small font-semibold">{cl.title}</p>
              <p className="text-small text-muted">{cl.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 border-t border-subtle pt-5 text-small">
          <div>
            <p className="text-caption uppercase tracking-wide text-muted">Aceite do cliente</p>
            {c.acceptedByClientAt ? <p className="flex items-center gap-1 font-semibold text-charcoal"><IconConcluido size={16} aria-hidden /> {dt(c.acceptedByClientAt)}</p> : <p className="text-muted">pendente</p>}
          </div>
          <div>
            <p className="text-caption uppercase tracking-wide text-muted">Aceite do marceneiro</p>
            {c.acceptedByCarpenterAt ? <p className="flex items-center gap-1 font-semibold text-charcoal"><IconConcluido size={16} aria-hidden /> {dt(c.acceptedByCarpenterAt)}</p> : <p className="text-muted">pendente</p>}
          </div>
        </section>

        <footer className="mt-6 border-t border-subtle pt-4 text-center text-caption text-muted">{CONTRACT_LEGAL_NOTE}</footer>
      </article>

      {canSign && (
        <div className="mt-5 print:hidden">
          <ContractActions contractId={c.id} canSign={canSign} />
        </div>
      )}
    </main>
  );
}
