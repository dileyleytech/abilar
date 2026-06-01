'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, formatCm, dimensionCmError, type Category } from '@abilar/shared';
import { addModule, deleteModule, registerProjectPhoto } from '@/lib/projects/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/labels';

export type ModuleView = {
  id: string;
  ambiente: string | null;
  type: string;
  label: string | null;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  photoUrl: string | null;
};

/** Sobe 1 foto para um módulo (path "<projectId>/<moduleId>/...") e registra. */
async function uploadModulePhoto(projectId: string, moduleId: string, file: File) {
  const supabase = createSupabaseBrowserClient();
  const safe = file.name.replace(/[^\w.-]/g, '_');
  const path = `${projectId}/${moduleId}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from('project-photos').upload(path, file, { upsert: true });
  if (!up.error) await registerProjectPhoto(projectId, { kind: 'REFERENCE', path, moduleId });
}

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ambiente, setAmbiente] = useState('');
  const [type, setType] = useState<Category>('GUARDA_ROUPA');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const groups = new Map<string, ModuleView[]>();
  for (const m of modules) {
    const k = m.ambiente?.trim() || 'Outros';
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m);
  }

  const eW = w === '' ? null : dimensionCmError(Number(w));
  const eH = h === '' ? null : dimensionCmError(Number(h));
  const eD = d === '' ? null : dimensionCmError(Number(d));
  const ready = w !== '' && h !== '' && d !== '' && !eW && !eH && !eD;
  const fld =
    'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';
  const fldErr = 'border-ochre ring-2 ring-ochre/30';

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
      if (file) await uploadModulePhoto(projectId, r.data.moduleId, file);
      setAmbiente('');
      setW('');
      setH('');
      setD('');
      setFile(null);
      setOpen(false);
      router.refresh();
    });

  const remove = (moduleId: string) =>
    start(async () => {
      const r = await deleteModule(projectId, moduleId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const changePhoto = (moduleId: string, f: File | null) => {
    if (!f) return;
    setBusyId(moduleId);
    start(async () => {
      await uploadModulePhoto(projectId, moduleId, f);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-charcoal">Móveis do pedido</h2>
        {editable && !open && (
          <button
            type="button"
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            onClick={() => setOpen(true)}
          >
            + Adicionar móvel
          </button>
        )}
      </div>

      {modules.length === 0 && !open ? (
        <p className="rounded-xl border border-dashed border-subtle p-6 text-center text-muted">
          Nenhum móvel ainda. Adicione o primeiro móvel deste pedido.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([room, mods]) => (
            <div key={room}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-secondary">
                <span className="h-px flex-1 bg-subtle" />
                {room}
                <span className="h-px flex-1 bg-subtle" />
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {mods.map((m) => (
                  <div key={m.id} className="flex gap-3 rounded-xl border border-subtle p-3">
                    {/* Miniatura / upload da foto do móvel */}
                    <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-deep text-2xl">
                      {m.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.photoUrl} alt={m.label ?? m.type} className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden>{CATEGORY_EMOJI[m.type as Category] ?? '🪵'}</span>
                      )}
                      {editable && (
                        <>
                          <span className="absolute bottom-0 w-full bg-charcoal/60 py-0.5 text-center text-[10px] font-medium text-white">
                            {busyId === m.id ? '...' : m.photoUrl ? 'trocar' : '📷 foto'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => changePhoto(m.id, e.target.files?.[0] ?? null)}
                          />
                        </>
                      )}
                    </label>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-charcoal">
                          {m.label ?? CATEGORY_LABELS[m.type as Category] ?? m.type}
                        </p>
                        {editable && (
                          <button
                            type="button"
                            aria-label="Remover móvel"
                            disabled={pending}
                            onClick={() => remove(m.id)}
                            className="shrink-0 rounded-md px-2 py-0.5 text-muted hover:bg-deep hover:text-charcoal disabled:opacity-50"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-sm text-muted">
                        {formatCm(m.widthMm)} × {formatCm(m.heightMm)} × {formatCm(m.depthMm)}
                      </p>
                      <p className="text-xs text-subtle">L × A × P</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form de adicionar móvel */}
      {editable && open && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-subtle bg-base p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Cômodo</span>
              <input className={fld} placeholder="Ex.: Cozinha" value={ambiente} onChange={(e) => setAmbiente(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Tipo de móvel</span>
              <select className={fld} value={type} onChange={(e) => setType(e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input className={`${fld} ${eW ? fldErr : ''}`} type="number" inputMode="numeric" min={1} placeholder="Larg. cm" value={w} onChange={(e) => setW(e.target.value)} />
              {eW && <span className="text-xs text-ochre">{eW}</span>}
            </div>
            <div>
              <input className={`${fld} ${eH ? fldErr : ''}`} type="number" inputMode="numeric" min={1} placeholder="Alt. cm" value={h} onChange={(e) => setH(e.target.value)} />
              {eH && <span className="text-xs text-ochre">{eH}</span>}
            </div>
            <div>
              <input className={`${fld} ${eD ? fldErr : ''}`} type="number" inputMode="numeric" min={1} placeholder="Prof. cm" value={d} onChange={(e) => setD(e.target.value)} />
              {eD && <span className="text-xs text-ochre">{eD}</span>}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-charcoal">Foto do móvel (opcional)</span>
            <input type="file" accept="image/*" className={fld} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={!ready || pending}
              onClick={submit}
            >
              {pending ? 'Salvando…' : 'Adicionar móvel'}
            </button>
            <button type="button" className="rounded-xl border border-subtle px-4 py-3 text-base text-charcoal hover:bg-deep" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
