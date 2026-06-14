'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { preApproveQuote } from '@/lib/chat/actions';
import { Button } from '@/components/ui';
import { IconConversas, IconOk } from '@/components/ui/icons';

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
      <Button variant={approved ? 'outline' : 'primary'} size="sm" onClick={go} disabled={pending}>
        {pending ? '…' : approved ? <><IconConversas size={20} aria-hidden /> Abrir conversa</> : <><IconOk size={20} aria-hidden /> Pré-aprovar e conversar</>}
      </Button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
