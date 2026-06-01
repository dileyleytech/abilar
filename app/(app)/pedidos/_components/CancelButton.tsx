'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeProjectStatus } from '@/lib/projects/actions';

/** Botão de cancelar pedido (com confirmação) — usado na listagem. */
export function CancelButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const cancel = () =>
    start(async () => {
      const r = await changeProjectStatus(projectId, 'CANCELLED');
      if (r.ok) router.refresh();
      setConfirming(false);
    });

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="rounded-md bg-charcoal px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? '...' : 'Confirmar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md px-2 py-1 text-xs text-muted hover:text-charcoal"
        >
          Voltar
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setConfirming(true);
      }}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-deep hover:text-charcoal"
    >
      Cancelar
    </button>
  );
}
