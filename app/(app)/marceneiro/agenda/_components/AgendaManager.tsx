'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveJob, setJobStatus, setJobDates, deleteJob, setMaxParallel, setProjectDates } from '@/lib/pipeline/actions';

export type JobCard = { id: string; title: string; clientName: string | null; startDate: string | null; endDate: string | null; note: string | null };
type Obra = { projectId: string; title: string; approvedPct: number; startDate: string | null; endDate: string | null };

const fmtDate = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null);

export function AgendaManager({ maxParallel, activeCount, overloaded, obras, jobs }: { maxParallel: number; activeCount: number; overloaded: boolean; obras: Obra[]; jobs: JobCard[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingMax, setEditingMax] = useState(false);
  const [maxVal, setMaxVal] = useState(String(maxParallel));
  const [adding, setAdding] = useState(false);

  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-5">
      {/* Capacidade / sobrecarga */}
      <section className={`rounded-2xl border p-4 ${overloaded ? 'border-ochre bg-ochre/10' : 'border-subtle bg-surface'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-charcoal">
            {activeCount} obra(s) ativa(s) · capacidade {maxParallel}
          </p>
          {editingMax ? (
            <span className="flex items-center gap-2">
              <input type="number" min={1} max={50} value={maxVal} onChange={(e) => setMaxVal(e.target.value)} className="w-20 rounded-lg border border-subtle px-2 py-1" />
              <button type="button" disabled={pending} onClick={() => start(async () => { await setMaxParallel(Number(maxVal)); setEditingMax(false); refresh(); })} className="rounded-lg bg-brand-primary px-3 py-1 text-sm font-semibold text-white">Salvar</button>
            </span>
          ) : (
            <button type="button" onClick={() => setEditingMax(true)} className="text-sm font-semibold text-brand-secondary hover:underline">Ajustar capacidade</button>
          )}
        </div>
        {overloaded && <p className="mt-1 text-sm text-charcoal">⚠️ Você está acima da sua capacidade — atenção aos prazos antes de aceitar novas obras.</p>}
      </section>

      {/* Obras da plataforma */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-charcoal">Obras da plataforma</h2>
        {obras.length === 0 ? (
          <p className="rounded-xl border border-dashed border-subtle p-6 text-center text-muted">Nenhuma obra contratada no momento.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {obras.map((o) => (
              <li key={o.projectId} className="rounded-xl border border-subtle bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/marceneiro/pedidos/${o.projectId}`} className="font-medium text-charcoal hover:underline">{o.title}</Link>
                  <span className="text-sm font-semibold text-brand-primary">{o.approvedPct}%</span>
                </div>
                <DatesEditor startDate={o.startDate} endDate={o.endDate} onSave={async (s, e) => { await setProjectDates(o.projectId, { startDate: s, endDate: e }); refresh(); }} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Obras externas (manuais) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">Obras externas</h2>
          {!adding && <button type="button" onClick={() => setAdding(true)} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">+ Adicionar</button>}
        </div>
        {adding && <JobForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}
        {jobs.length === 0 && !adding ? (
          <p className="rounded-xl border border-dashed border-subtle p-6 text-center text-muted">Cadastre obras fora da plataforma para vê-las na agenda.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-xl border border-subtle bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-charcoal">{j.title}</p>
                    {j.clientName && <p className="text-sm text-muted">{j.clientName}</p>}
                  </div>
                </div>
                <DatesEditor startDate={j.startDate} endDate={j.endDate} onSave={async (s, e) => { await setJobDates(j.id, { startDate: s, endDate: e }); refresh(); }} />
                <div className="mt-2 flex gap-3 text-sm">
                  <button type="button" disabled={pending} onClick={() => start(async () => { await setJobStatus(j.id, 'DONE'); refresh(); })} className="font-semibold text-brand-primary hover:underline">Concluir</button>
                  <button type="button" disabled={pending} onClick={() => { if (confirm('Excluir?')) start(async () => { await deleteJob(j.id); refresh(); }); }} className="text-ochre hover:underline">Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DatesEditor({ startDate, endDate, onSave }: { startDate: string | null; endDate: string | null; onSave: (s?: string, e?: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(startDate ?? '');
  const [end, setEnd] = useState(endDate ?? '');
  const [pending, startT] = useTransition();

  if (!editing) {
    return (
      <div className="mt-1 flex items-center gap-2 text-sm text-muted">
        {startDate || endDate ? (
          <span>📅 {fmtDate(startDate) ?? '—'} → {fmtDate(endDate) ?? '—'}</span>
        ) : (
          <span>Sem prazos definidos</span>
        )}
        <button type="button" onClick={() => setEditing(true)} className="font-semibold text-brand-secondary hover:underline">
          {startDate || endDate ? 'editar prazos' : 'definir prazos'}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-xs text-muted">Início<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="block rounded-lg border border-subtle px-2 py-1 text-sm" /></label>
      <label className="text-xs text-muted">Término<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="block rounded-lg border border-subtle px-2 py-1 text-sm" /></label>
      <button type="button" disabled={pending} onClick={() => startT(async () => { await onSave(start || undefined, end || undefined); setEditing(false); })} className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white">Salvar</button>
      <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted">Cancelar</button>
    </div>
  );
}

function JobForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fld = 'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveJob({ title: title.trim(), clientName: clientName.trim() || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
      if (!r.ok) return setError(r.error);
      onSaved();
    });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-subtle bg-surface p-4">
      <input className={fld} placeholder="Título da obra" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className={fld} placeholder="Cliente (opcional)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm text-muted">Início<input type="date" className={fld} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="text-sm text-muted">Término<input type="date" className={fld} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
      </div>
      {error && <p className="rounded-xl bg-ochre/20 px-4 py-2 text-sm text-charcoal">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || !title.trim()} onClick={save} className="flex-1 rounded-xl bg-brand-primary px-4 py-3 font-semibold text-white disabled:opacity-50">Salvar</button>
        <button type="button" onClick={onClose} className="rounded-xl border border-subtle px-4 py-3 text-charcoal hover:bg-deep">Cancelar</button>
      </div>
    </div>
  );
}
