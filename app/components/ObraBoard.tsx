'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL, type MilestoneStatus } from '@abilar/shared';
import { advanceMilestone, approveMilestone, concludeMilestone } from '@/lib/obra/actions';
import type { ObraMilestone } from '@/lib/obra/queries';

const COLUMNS: { status: MilestoneStatus; title: string; tint: string }[] = [
  { status: 'PENDING', title: 'A fazer', tint: 'bg-deep' },
  { status: 'IN_PROGRESS', title: 'Em andamento', tint: 'bg-ochre/20' },
  { status: 'DONE', title: 'Aguardando cliente', tint: 'bg-brand-secondary/15' },
  { status: 'APPROVED', title: 'Aprovada ✓', tint: 'bg-sage/25' },
];

/** Quadro da obra estilo Trello (§6.4): colunas por status; o card avança da
 *  esquerda p/ direita. Marceneiro: iniciar → concluir. Cliente: aprovar. */
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

      {/* Colunas (rolagem horizontal no mobile) */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const cards = milestones.filter((m) => m.status === col.status);
          return (
            <div key={col.status} className="flex w-64 shrink-0 flex-col rounded-2xl border border-subtle bg-base p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-charcoal">{col.title}</span>
                <span className="rounded-pill bg-surface px-2 py-0.5 text-xs font-medium text-muted">{cards.length}</span>
              </div>

              <div className="flex flex-col gap-2">
                {cards.length === 0 && <p className="px-1 py-3 text-center text-xs text-subtle">—</p>}
                {cards.map((m) => (
                  <div key={m.id} className={`rounded-xl border border-subtle p-3 ${col.tint}`}>
                    <p className="font-semibold text-charcoal">{m.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{m.event}</p>
                    <p className="mt-1 text-xs text-muted">
                      {m.pct}% · <strong className="text-charcoal">{formatBRL(m.amountCents)}</strong>
                    </p>

                    {m.evidenceUrl && (
                      <a href={m.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.evidenceUrl} alt="Evidência" className="h-20 w-full rounded-lg border border-subtle object-cover" />
                      </a>
                    )}

                    {meIsCarpenter && m.status === 'PENDING' && (
                      <button type="button" onClick={() => run(() => advanceMilestone(m.id))} disabled={pending} className="mt-2 w-full rounded-lg bg-brand-secondary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        Iniciar →
                      </button>
                    )}
                    {meIsCarpenter && m.status === 'IN_PROGRESS' && <ConcludeForm milestoneId={m.id} />}
                    {meIsClient && m.status === 'DONE' && (
                      <button type="button" onClick={() => run(() => approveMilestone(m.id))} disabled={pending} className="mt-2 w-full rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        ✓ Aprovar
                      </button>
                    )}
                    {meIsClient && m.status === 'IN_PROGRESS' && <p className="mt-2 text-xs text-muted">Em execução…</p>}
                    {meIsCarpenter && m.status === 'DONE' && <p className="mt-2 text-xs text-muted">Aguardando o cliente</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-ochre">{error}</p>}
    </div>
  );
}

/** Concluir etapa com foto de evidência opcional (câmera no celular). */
function ConcludeForm({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () =>
    start(async () => {
      setError(null);
      const fd = new FormData();
      fd.set('milestoneId', milestoneId);
      if (file) fd.set('evidence', file);
      const r = await concludeMilestone(fd);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <label className="cursor-pointer rounded-lg border border-dashed border-subtle px-2 py-1.5 text-center text-xs text-muted hover:bg-deep">
        {file ? `📷 ${file.name.slice(0, 18)}` : '📷 Anexar foto (opcional)'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button type="button" onClick={submit} disabled={pending} className="w-full rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? 'Enviando…' : 'Concluir →'}
      </button>
      {error && <p className="text-xs text-ochre">{error}</p>}
    </div>
  );
}
