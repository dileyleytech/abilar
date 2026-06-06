'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptContract } from '@/lib/contracts/actions';

/** Botão de aceite eletrônico do contrato + imprimir. Some na impressão. */
export function ContractActions({ contractId, canSign }: { contractId: string; canSign: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sign = () =>
    start(async () => {
      setError(null);
      const r = await acceptContract(contractId);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-2 print:hidden">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-subtle px-4 py-3 text-sm font-semibold text-charcoal hover:bg-deep"
        >
          🖨️ Imprimir / PDF
        </button>
        {canSign && (
          <button
            type="button"
            onClick={sign}
            disabled={pending}
            className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Registrando…' : '✓ Aceitar contrato'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-ochre">{error}</p>}
    </div>
  );
}
