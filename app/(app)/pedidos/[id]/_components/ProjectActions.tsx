'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectStatus } from '@abilar/shared';
import { changeProjectStatus } from '@/lib/projects/actions';
import { Button } from '@/components/ui';
import { IconEnviar } from '@/components/ui/icons';

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
          <Button
            variant="primary"
            size="lg"
            className="w-full max-w-md"
            disabled={pending || !hasModules}
            onClick={() => go('OPEN_FOR_QUOTES')}
          >
            {pending ? 'Publicando…' : <><IconEnviar size={20} aria-hidden /> Publicar e receber orçamentos</>}
          </Button>
          {!hasModules && (
            <p className="text-sm text-muted">Adicione ao menos um móvel para publicar o pedido.</p>
          )}
        </>
      )}
      {error && (
        <p className="w-full max-w-md rounded-xl bg-danger/10 px-4 py-3 text-center text-base text-danger" role="alert">
          {error}
        </p>
      )}
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => go('CANCELLED')}
      >
        Cancelar pedido
      </Button>
    </div>
  );
}
