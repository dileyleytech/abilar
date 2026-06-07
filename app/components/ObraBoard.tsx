'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL } from '@abilar/shared';
import { MILESTONE_STATUS_LABEL, MILESTONE_STATUS_BADGE } from '@/lib/labels';
import { advanceMilestone, approveMilestone } from '@/lib/obra/actions';
import type { ObraMilestone } from '@/lib/obra/queries';

/** Quadro da obra (§6.4): etapas em sequência, com ação por papel.
 *  Marceneiro: iniciar → marcar concluída. Cliente: aprovar a etapa concluída. */
export function ObraBoard({
  milestones,
  meIsClient,
  meIsCarpenter,
  approvedPct,
}: {
  milestones: ObraMilestone[];
  meIsClient: boolean;
  meIsCarpenter: boolean;
  approvedPct: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-sm font-medium text-charcoal">Andamento da obra</span>
          <span className="text-sm font-semibold text-brand-primary">{approvedPct}% concluído</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-deep">
          <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${approvedPct}%` }} />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {milestones.map((m) => (
          <li key={m.id} className="rounded-2xl border border-subtle bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-charcoal">{m.label}</p>
                <p className="text-sm text-muted">{m.event}</p>
              </div>
              <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-semibold ${MILESTONE_STATUS_BADGE[m.status]}`}>
                {MILESTONE_STATUS_LABEL[m.status]}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm text-muted">
                {m.pct}% · <strong className="text-charcoal">{formatBRL(m.amountCents)}</strong>
              </span>

              {meIsCarpenter && m.status === 'PENDING' && (
                <button type="button" onClick={() => run(() => advanceMilestone(m.id))} disabled={pending} className="rounded-xl bg-brand-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Iniciar
                </button>
              )}
              {meIsCarpenter && m.status === 'IN_PROGRESS' && (
                <button type="button" onClick={() => run(() => advanceMilestone(m.id))} disabled={pending} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Marcar como concluída
                </button>
              )}
              {meIsCarpenter && m.status === 'DONE' && <span className="text-sm text-muted">Aguardando o cliente aprovar</span>}

              {meIsClient && m.status === 'DONE' && (
                <button type="button" onClick={() => run(() => approveMilestone(m.id))} disabled={pending} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  ✓ Aprovar etapa
                </button>
              )}
              {meIsClient && m.status === 'IN_PROGRESS' && <span className="text-sm text-muted">Marceneiro trabalhando…</span>}
              {m.status === 'APPROVED' && <span className="text-sm font-semibold text-charcoal">✓ Liberada</span>}
            </div>
          </li>
        ))}
      </ol>
      {error && <p className="text-sm text-ochre">{error}</p>}
    </div>
  );
}
