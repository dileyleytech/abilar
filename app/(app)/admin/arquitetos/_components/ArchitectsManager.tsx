'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminArchitect } from '@/lib/admin/architects';
import { createArchitect, updateArchitect } from '../actions';

const fld = 'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

export function ArchitectsManager({ initial }: { initial: AdminArchitect[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      {!adding && (
        <button type="button" onClick={() => setAdding(true)} className="self-start rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
          + Cadastrar arquiteto
        </button>
      )}
      {adding && <CreateForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); router.refresh(); }} />}

      {initial.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">Nenhum arquiteto cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {initial.map((a) => (
            <li key={a.userId} className="rounded-2xl border border-subtle bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-charcoal">{a.name}{!a.active && <span className="ml-2 rounded-pill bg-deep px-2 py-0.5 text-xs text-muted">inativo</span>}</p>
                  {a.cau && <p className="text-sm text-muted">CAU {a.cau}</p>}
                </div>
                <p className="text-sm text-muted">Comissão: <strong className="text-charcoal">{Number(a.commissionPercent)}%</strong></p>
              </div>
              <EditRow architect={a} onSaved={() => router.refresh()} pending={pending} start={start} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditRow({ architect, onSaved, pending, start }: { architect: AdminArchitect; onSaved: () => void; pending: boolean; start: (cb: () => Promise<void>) => void }) {
  const [editing, setEditing] = useState(false);
  const [commission, setCommission] = useState(String(Number(architect.commissionPercent)));

  if (!editing) {
    return (
      <div className="mt-2 flex gap-3 text-sm">
        <button type="button" onClick={() => setEditing(true)} className="font-semibold text-brand-secondary hover:underline">Editar comissão</button>
        <button type="button" disabled={pending} onClick={() => start(async () => { await updateArchitect(architect.userId, { active: !architect.active }); onSaved(); })} className="text-muted hover:underline">
          {architect.active ? 'Inativar' : 'Ativar'}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-xs text-muted">Comissão (%)<input type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(e.target.value)} className="block w-24 rounded-lg border border-subtle px-2 py-1" /></label>
      <button type="button" disabled={pending} onClick={() => start(async () => { await updateArchitect(architect.userId, { commissionPercent: Number(commission) }); setEditing(false); onSaved(); })} className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white">Salvar</button>
      <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted">Cancelar</button>
    </div>
  );
}

function CreateForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cau, setCau] = useState('');
  const [commission, setCommission] = useState('5');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setError(null);
      const r = await createArchitect({ name: name.trim(), email: email.trim(), cau: cau.trim() || undefined, commissionPercent: Number(commission) });
      if (!r.ok) return setError(r.error);
      onSaved();
    });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-subtle bg-surface p-5">
      <h2 className="text-lg font-semibold text-charcoal">Novo arquiteto</h2>
      <input className={fld} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={fld} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={fld} placeholder="CAU (opcional)" value={cau} onChange={(e) => setCau(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-charcoal">Comissão (%)<input type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(e.target.value)} className="w-24 rounded-lg border border-subtle px-2 py-1" /></label>
      {error && <p className="rounded-xl bg-ochre/20 px-4 py-2 text-sm text-charcoal">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || !name.trim() || !email.trim()} onClick={save} className="flex-1 rounded-xl bg-brand-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{pending ? 'Cadastrando…' : 'Cadastrar'}</button>
        <button type="button" onClick={onClose} className="rounded-xl border border-subtle px-4 py-3 text-charcoal hover:bg-deep">Cancelar</button>
      </div>
      <p className="text-xs text-subtle">O arquiteto entra com o e-mail (código/senha). A comissão sai da fatia da plataforma.</p>
    </div>
  );
}
