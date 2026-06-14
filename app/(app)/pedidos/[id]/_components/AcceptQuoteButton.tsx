'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptQuote } from '@/lib/contracts/actions';
import { Button } from '@/components/ui';
import { IconOk } from '@/components/ui/icons';

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
      <Button variant="primary" size="sm" onClick={go} disabled={pending}>
        {pending ? '…' : <><IconOk size={20} aria-hidden /> Aceitar e gerar contrato</>}
      </Button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
