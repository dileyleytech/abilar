'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL, type MilestoneStatus } from '@abilar/shared';
import { advanceMilestone, approveMilestone, concludeMilestone, addMilestoneEvidence } from '@/lib/obra/actions';
import { MILESTONE_STATUS_LABEL, MILESTONE_STATUS_BADGE } from '@/lib/labels';
import { Button } from '@/components/ui';
import { IconOk, IconFechar, IconFoto, IconConversas, IconAvancar } from '@/components/ui/icons';
import type { ObraMilestone } from '@/lib/obra/queries';

const COLUMNS: { status: MilestoneStatus; title: string; tint: string }[] = [
  { status: 'PENDING', title: 'A fazer', tint: 'bg-deep' },
  { status: 'IN_PROGRESS', title: 'Em andamento', tint: 'bg-ochre/20' },
  { status: 'DONE', title: 'Aguardando cliente', tint: 'bg-brand-secondary/15' },
  { status: 'APPROVED', title: 'Aprovada', tint: 'bg-sage/25' },
];

const dateLabel = (d: Date) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

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
  const [openId, setOpenId] = useState<string | null>(null);
  const open = milestones.find((m) => m.id === openId) ?? null;

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

      {/* Colunas (kanban) com cards compactos e clicáveis */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const cards = milestones.filter((m) => m.status === col.status);
          return (
            <div key={col.status} className="flex w-60 shrink-0 flex-col rounded-2xl border border-subtle bg-base p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-charcoal">
                  {col.status === 'APPROVED' && <IconOk size={16} aria-hidden />}
                  {col.title}
                </span>
                <span className="rounded-pill bg-surface px-2 py-0.5 text-xs font-medium text-muted">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {cards.length === 0 && <p className="px-1 py-3 text-center text-xs text-subtle">—</p>}
                {cards.map((m) => {
                  const photos = m.evidences.reduce((a, e) => a + e.photoUrls.length, 0);
                  const comments = m.evidences.filter((e) => e.comment).length;
                  const cover = m.evidences.find((e) => e.photoUrls.length > 0)?.photoUrls[0];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOpenId(m.id)}
                      className={`flex w-full items-center gap-2 rounded-xl border border-subtle p-3 text-left transition hover:border-brand-primary/40 ${col.tint}`}
                    >
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-subtle object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-charcoal">{m.label}</p>
                        <p className="flex items-center gap-1 text-xs text-muted">
                          <span>{m.pct}% · {formatBRL(m.amountCents)}</span>
                          {photos > 0 && (
                            <span className="inline-flex items-center gap-0.5">· <IconFoto size={12} aria-hidden /> {photos}</span>
                          )}
                          {comments > 0 && (
                            <span className="inline-flex items-center gap-0.5">· <IconConversas size={12} aria-hidden /> {comments}</span>
                          )}
                        </p>
                      </div>
                      <IconAvancar size={16} className="shrink-0 text-muted" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <MilestoneModal
          key={open.id}
          milestone={open}
          meIsClient={meIsClient}
          meIsCarpenter={meIsCarpenter}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function MilestoneModal({
  milestone: m,
  meIsClient,
  meIsCarpenter,
  onClose,
}: {
  milestone: ObraMilestone;
  meIsClient: boolean;
  meIsCarpenter: boolean;
  onClose: () => void;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2 border-b border-subtle p-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-charcoal">{m.label}</h3>
            <span className={`mt-1 inline-block rounded-pill px-2.5 py-0.5 text-xs font-semibold ${MILESTONE_STATUS_BADGE[m.status]}`}>
              {MILESTONE_STATUS_LABEL[m.status]}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg px-2 py-1 text-muted hover:bg-deep"><IconFechar size={20} aria-hidden /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-muted">{m.event}</p>
          <p className="mt-1 text-sm text-muted">
            {m.pct}% · <strong className="text-charcoal">{formatBRL(m.amountCents)}</strong>
          </p>

          <h4 className="mt-4 text-sm font-semibold text-charcoal">Fotos e comentários</h4>
          {m.evidences.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Nenhuma evidência ainda.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-3">
              {m.evidences.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-subtle bg-base p-3">
                  {ev.photoUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {ev.photoUrls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="Evidência" className="aspect-square w-full rounded-lg border border-subtle object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {ev.comment && <p className="mt-2 text-sm text-charcoal">{ev.comment}</p>}
                  <p className="mt-1 text-xs text-subtle">{dateLabel(ev.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ações por papel */}
        <footer className="border-t border-subtle p-4">
          {meIsCarpenter && m.status === 'PENDING' && (
            <Button variant="secondary" onClick={() => run(() => advanceMilestone(m.id))} disabled={pending} className="w-full">
              Iniciar etapa →
            </Button>
          )}
          {meIsCarpenter && m.status === 'IN_PROGRESS' && <EvidenceForm milestoneId={m.id} />}
          {meIsClient && m.status === 'DONE' && (
            <Button variant="primary" onClick={() => run(() => approveMilestone(m.id))} disabled={pending} className="w-full">
              <IconOk size={18} aria-hidden /> Aprovar etapa
            </Button>
          )}
          {meIsClient && m.status === 'IN_PROGRESS' && <p className="text-center text-sm text-muted">Em execução pelo marceneiro…</p>}
          {meIsCarpenter && m.status === 'DONE' && <p className="text-center text-sm text-muted">Aguardando o cliente aprovar.</p>}
          {m.status === 'APPROVED' && <p className="inline-flex w-full items-center justify-center gap-1.5 text-center text-sm font-semibold text-charcoal"><IconOk size={16} aria-hidden /> Etapa aprovada e liberada.</p>}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </footer>
      </div>
    </div>
  );
}

/** Evidência: várias fotos + comentário. "Adicionar" não muda o status; "Concluir" sim. */
function EvidenceForm({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [files, setFiles] = useState<FileList | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const build = () => {
    const fd = new FormData();
    fd.set('milestoneId', milestoneId);
    if (comment.trim()) fd.set('comment', comment.trim());
    if (files) Array.from(files).forEach((f) => fd.append('photos', f));
    return fd;
  };
  const exec = (fn: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn(build());
      if (!r.ok) return setError(r.error);
      setComment('');
      setFiles(null);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-subtle px-3 py-2.5 text-center text-sm text-muted hover:bg-deep">
        <IconFoto size={16} aria-hidden />
        {files && files.length ? `${files.length} foto(s) selecionada(s)` : 'Adicionar fotos (pode escolher várias)'}
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(e.target.files)} />
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentário (opcional)"
        className="min-h-16 rounded-xl border border-subtle bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => exec(addMilestoneEvidence)} disabled={pending} className="flex-1">
          Adicionar
        </Button>
        <Button variant="primary" onClick={() => exec(concludeMilestone)} disabled={pending} className="flex-1">
          Concluir →
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
