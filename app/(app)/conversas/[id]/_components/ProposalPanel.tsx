'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatBRL, type QuoteStatus } from '@abilar/shared';
import { acceptQuote } from '@/lib/contracts/actions';

export type Proposal = {
  projectId: string;
  quoteId: string;
  quoteStatus: QuoteStatus;
  avistaCents: number;
  parceladoCents: number | null;
  installmentValueCents: number | null;
  clientInstallments: number;
  contractId: string | null;
};

/** Painel da proposta no topo do chat: valores + ações (ver pedido, orçamento,
 *  aprovar/gerar contrato). O chat faz parte da negociação. */
export function ProposalPanel({
  meIsClient,
  conversationId,
  proposal,
}: {
  meIsClient: boolean;
  conversationId: string;
  proposal: Proposal;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Origem p/ poder voltar à conversa a partir das telas linkadas.
  const from = `?from=${encodeURIComponent(`/conversas/${conversationId}`)}`;
  const pedidoHref =
    (meIsClient ? `/pedidos/${proposal.projectId}` : `/marceneiro/pedidos/${proposal.projectId}`) + from;

  const approve = () =>
    start(async () => {
      setError(null);
      const r = await acceptQuote(proposal.quoteId);
      if (!r.ok) return setError(r.error);
      router.push(`/contratos/${r.contractId}${from}`);
    });

  return (
    <section className="rounded-2xl border border-subtle bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-charcoal">Proposta</span>
        <Link href={pedidoHref} className="text-sm font-medium text-brand-primary hover:underline">
          Ver pedido →
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="text-sm text-muted">
          À vista: <strong className="text-charcoal">{formatBRL(proposal.avistaCents)}</strong>
        </span>
        {proposal.parceladoCents != null && proposal.installmentValueCents != null && (
          <span className="text-sm text-muted">
            ou em até {proposal.clientInstallments}x de{' '}
            <strong className="text-charcoal">{formatBRL(proposal.installmentValueCents)}</strong>
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/orcamentos/${proposal.quoteId}/imprimir${from}`}
          className="rounded-xl border border-subtle px-3 py-2 text-sm font-semibold text-charcoal hover:bg-deep"
        >
          🖨️ Ver orçamento
        </Link>

        {proposal.contractId ? (
          <Link
            href={`/contratos/${proposal.contractId}${from}`}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            📄 {meIsClient ? 'Ver contrato' : 'Contrato (assinar)'}
          </Link>
        ) : meIsClient ? (
          <button
            type="button"
            onClick={approve}
            disabled={pending}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? '…' : '✅ Aprovar proposta'}
          </button>
        ) : (
          <span className="text-sm text-muted">Aguardando o cliente aprovar.</span>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-ochre">{error}</p>}
    </section>
  );
}
