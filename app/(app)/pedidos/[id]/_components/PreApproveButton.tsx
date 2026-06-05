'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { preApproveQuote } from '@/lib/chat/actions';

/** Cliente pré-aprova o orçamento e abre o chat com o marceneiro. */
export function PreApproveButton({ quoteId, approved }: { quoteId: string; approved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = () =>
    start(async () => {
      setError(null);
      const r = await preApproveQuote(quoteId);
      if (!r.ok) return setError(r.error);
      router.push(`/conversas/${r.conversationId}`);
    });

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          approved ? 'border border-subtle text-charcoal hover:bg-deep' : 'bg-brand-primary text-white hover:opacity-90'
        }`}
      >
        {pending ? '…' : approved ? '💬 Abrir conversa' : '👍 Pré-aprovar e conversar'}
      </button>
      {error && <p className="mt-1 text-sm text-ochre">{error}</p>}
    </div>
  );
}
