'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptQuote } from '@/lib/contracts/actions';

/** Cliente aceita o orçamento → gera o contrato e vai para a tela de aceite. */
export function AcceptQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = () =>
    start(async () => {
      setError(null);
      const r = await acceptQuote(quoteId);
      if (!r.ok) return setError(r.error);
      router.push(`/contratos/${r.contractId}`);
    });

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? '…' : '✅ Aceitar e gerar contrato'}
      </button>
      {error && <p className="mt-1 text-sm text-ochre">{error}</p>}
    </div>
  );
}
