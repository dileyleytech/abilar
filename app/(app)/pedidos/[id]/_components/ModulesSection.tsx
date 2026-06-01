'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, formatCm, type Category } from '@abilar/shared';
import { addModule, deleteModule } from '@/lib/projects/actions';
import { CATEGORY_LABELS } from '@/lib/labels';

export type ModuleView = {
  id: string;
  ambiente: string | null;
  type: string;
  label: string | null;
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export function ModulesSection({
  projectId,
  modules,
  editable,
}: {
  projectId: string;
  modules: ModuleView[];
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form
  const [ambiente, setAmbiente] = useState('');
  const [type, setType] = useState<Category>('GUARDA_ROUPA');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');

  // Agrupa por cômodo.
  const groups = new Map<string, ModuleView[]>();
  for (const m of modules) {
    const k = m.ambiente?.trim() || 'Sem cômodo definido';
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m);
  }

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await addModule(projectId, {
        ambiente: ambiente.trim() || undefined,
        type,
        widthMm: Number(w),
        heightMm: Number(h),
        depthMm: Number(d),
      });
      if (!r.ok) return setError(r.error);
      setAmbiente('');
      setW('');
      setH('');
      setD('');
      setOpen(false);
      router.refresh();
    });

  const remove = (moduleId: string) =>
    start(async () => {
      const r = await deleteModule(projectId, moduleId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const ready = Number(w) > 0 && Number(h) > 0 && Number(d) > 0;
  const fld = 'w-full rounded-md border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none focus:border-brand';

  return (
    <section className="rounded-lg bg-surface p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-charcoal">Móveis do pedido</h2>

      {modules.length === 0 ? (
        <p className="text-muted">Nenhum móvel ainda.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([room, mods]) => (
            <div key={room}>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-secondary">{room}</h3>
              <ul className="flex flex-col gap-2">
                {mods.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-base text-charcoal">
                      <span className="font-medium">{m.label ?? CATEGORY_LABELS[m.type as Category] ?? m.type}</span>{' '}
                      <span className="font-mono text-muted">
                        {formatCm(m.widthMm)} × {formatCm(m.heightMm)} × {formatCm(m.depthMm)}
                      </span>
                    </span>
                    {editable && (
                      <button
                        type="button"
                        aria-label="Remover móvel"
                        className="shrink-0 rounded-md px-3 py-1 text-base text-muted hover:text-charcoal disabled:opacity-50"
                        disabled={pending}
                        onClick={() => remove(m.id)}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="mt-4">
          {!open ? (
            <button
              type="button"
              className="w-full rounded-md border border-subtle px-5 py-3 text-base font-medium text-charcoal"
              onClick={() => setOpen(true)}
            >
              + Adicionar móvel
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-md border border-subtle p-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-charcoal">Cômodo (opcional)</span>
                <input className={fld} placeholder="Ex.: Cozinha" value={ambiente} onChange={(e) => setAmbiente(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-charcoal">Tipo de móvel</span>
                <select className={fld} value={type} onChange={(e) => setType(e.target.value as Category)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input className={fld} type="number" inputMode="numeric" min={1} placeholder="Larg. cm" value={w} onChange={(e) => setW(e.target.value)} />
                <input className={fld} type="number" inputMode="numeric" min={1} placeholder="Alt. cm" value={h} onChange={(e) => setH(e.target.value)} />
                <input className={fld} type="number" inputMode="numeric" min={1} placeholder="Prof. cm" value={d} onChange={(e) => setD(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="button" className="flex-1 rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-50" disabled={!ready || pending} onClick={submit}>
                  {pending ? 'Salvando…' : 'Adicionar'}
                </button>
                <button type="button" className="rounded-md border border-subtle px-4 py-3 text-base text-charcoal" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
