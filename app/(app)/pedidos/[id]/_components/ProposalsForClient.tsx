'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { mmToCm } from '@abilar/shared';
import type { DesignState } from '@abilar/ai-vision';
import { decideDesignProposal } from '@/lib/design/actions';
import { Card, Button, Badge, PhotoButton } from '@/components/ui';

export type ClientProposal = {
  id: string;
  status: string;
  note: string | null;
  state: DesignState;
  previewUrl: string | null;
};

export function ProposalsForClient({ projectId, proposals }: { projectId: string; proposals: ClientProposal[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (proposalId: string, decision: 'APPROVED' | 'REJECTED') =>
    start(async () => {
      setError(null);
      const r = await decideDesignProposal(projectId, proposalId, decision);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  return (
    <ul className="flex flex-col gap-3">
      {proposals.map((p) => {
        const pendingDecision = p.status === 'PENDING';
        return (
          <li key={p.id}>
            <Card pad="sm" className="flex flex-col gap-3 sm:flex-row">
              {p.previewUrl && (
                <PhotoButton url={p.previewUrl} alt="Prévia da sugestão" className="h-32 w-full rounded-md sm:w-44" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-h3 font-semibold text-charcoal">Sugestão do marceneiro</span>
                  {pendingDecision ? <Badge tone="warning">Aguardando você</Badge> : <Badge tone={p.status === 'APPROVED' ? 'success' : 'neutral'}>{p.status === 'APPROVED' ? 'Aprovada' : 'Recusada'}</Badge>}
                </div>
                {p.note && <p className="text-small text-muted">“{p.note}”</p>}
                <p className="text-caption text-subtle">
                  {p.state.modules.map((m) => `${mmToCm(m.widthMm)}×${mmToCm(m.heightMm)}×${mmToCm(m.depthMm)} cm`).join(' · ')}
                </p>
                {pendingDecision && (
                  <div className="mt-1 flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => decide(p.id, 'APPROVED')} disabled={pending}>Aprovar e aplicar</Button>
                    <Button variant="danger" size="sm" onClick={() => decide(p.id, 'REJECTED')} disabled={pending}>Recusar</Button>
                  </div>
                )}
              </div>
            </Card>
          </li>
        );
      })}
      {error && <p className="text-small text-danger">{error}</p>}
    </ul>
  );
}
