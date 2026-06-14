'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptContract } from '@/lib/contracts/actions';
import { Button } from '@/components/ui';
import { IconImprimir, IconOk } from '@/components/ui/icons';

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
        <Button variant="outline" onClick={() => window.print()}>
          <IconImprimir size={20} aria-hidden /> Imprimir / PDF
        </Button>
        {canSign && (
          <Button variant="primary" onClick={sign} disabled={pending}>
            {pending ? 'Registrando…' : <><IconOk size={20} aria-hidden /> Aceitar contrato</>}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
