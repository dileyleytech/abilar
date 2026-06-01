'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectStatus } from '@abilar/shared';
import { changeProjectStatus } from '@/lib/projects/actions';

export function ProjectActions({ projectId, status }: { projectId: string; status: ProjectStatus }) {
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

  if (status === 'EXECUTED' || status === 'CANCELLED') return null;

  return (
    <div className="flex flex-col gap-3">
      {status === 'DRAFT' && (
        <button
          type="button"
          className="w-full rounded-md bg-brand px-5 py-4 text-lg font-medium text-white disabled:opacity-50"
          disabled={pending}
          onClick={() => go('OPEN_FOR_QUOTES')}
        >
          {pending ? 'Publicando…' : 'Publicar e receber orçamentos'}
        </button>
      )}
      <button
        type="button"
        className="w-full rounded-md border border-subtle px-5 py-4 text-lg font-medium text-charcoal disabled:opacity-50"
        disabled={pending}
        onClick={() => go('CANCELLED')}
      >
        Cancelar pedido
      </button>
      {error && (
        <p className="rounded-md bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
