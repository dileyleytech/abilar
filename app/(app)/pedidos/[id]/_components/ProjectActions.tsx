'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectStatus } from '@abilar/shared';
import { changeProjectStatus } from '@/lib/projects/actions';

export function ProjectActions({
  projectId,
  status,
  hasModules = true,
}: {
  projectId: string;
  status: ProjectStatus;
  hasModules?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = (to: ProjectStatus) =>
    start(async () => {
      setError(null);
      const r = await changeProjectStatus(projectId, to);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  if (status === 'EXECUTED' || status === 'CANCELLED') {
    return <p className="text-center text-sm text-muted">Este pedido está {status === 'EXECUTED' ? 'concluído' : 'cancelado'}.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {status === 'DRAFT' && (
        <>
          <button
            type="button"
            className="w-full max-w-md rounded-xl bg-brand-primary px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            disabled={pending || !hasModules}
            onClick={() => go('OPEN_FOR_QUOTES')}
          >
            {pending ? 'Publicando…' : '📨 Publicar e receber orçamentos'}
          </button>
          {!hasModules && (
            <p className="text-sm text-muted">Adicione ao menos um móvel para publicar o pedido.</p>
          )}
        </>
      )}
      {error && (
        <p className="w-full max-w-md rounded-xl bg-ochre/20 px-4 py-3 text-center text-base text-charcoal" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="text-sm font-medium text-muted underline-offset-2 transition hover:text-charcoal hover:underline disabled:opacity-50"
        disabled={pending}
        onClick={() => go('CANCELLED')}
      >
        Cancelar pedido
      </button>
    </div>
  );
}
