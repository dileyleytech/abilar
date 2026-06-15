'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, cmToMm, formatCm, dimensionCmError, type Category, type WorkType } from '@abilar/shared';
import { addModule, updateModule, deleteModule, registerProjectPhoto } from '@/lib/projects/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { downscaleImage } from '@/lib/image';
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/labels';
import { Button } from '@/components/ui';
import { IconAdicionar, IconEditar, IconExcluir, IconFoto, IconNovo, IconAtualizar } from '@/components/ui/icons';

export type ModuleView = {
  id: string;
  ambiente: string | null;
  type: string;
  workType: WorkType | null;
  label: string | null;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  photoUrl: string | null;
};

/** Sobe 1 foto para um módulo (path "<projectId>/<moduleId>/...") e registra. */
// Devolve um aviso se a foto foi recusada pela moderação (§8.7).
async function uploadModulePhoto(projectId: string, moduleId: string, file: File): Promise<string | null> {
  const toUpload = await downscaleImage(file); // comprime no navegador (upload rápido)
  const supabase = createSupabaseBrowserClient();
  const safe = toUpload.name.replace(/[^\w.-]/g, '_');
  const path = `${projectId}/${moduleId}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from('project-photos').upload(path, toUpload, { upsert: true });
  if (up.error) return null;
  const r = await registerProjectPhoto(projectId, { kind: 'REFERENCE', path, moduleId });
  return r.ok ? null : r.error;
}

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent"
      aria-hidden
    />
  );
}

export function ModulesSection({
  projectId,
  modules,
  editable,
  autoOpen = false,
}: {
  projectId: string;
  modules: ModuleView[];
  editable: boolean;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen && editable);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ambiente, setAmbiente] = useState('');
  const [type, setType] = useState<Category>('GUARDA_ROUPA');
  const [label, setLabel] = useState('');
  const [wt, setWt] = useState<WorkType>('NEW_INSTALL');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // UI otimista: o móvel aparece na hora (sem flash de "lista vazia") e some o
  // erro percebido; quando o router.refresh sincroniza, os dados reais assumem.
  const [optimisticModules, addOptimistic] = useOptimistic(modules, (state, m: ModuleView) => [
    ...state,
    m,
  ]);

  const groups = new Map<string, ModuleView[]>();
  for (const m of optimisticModules) {
    const k = m.ambiente?.trim() || 'Outros';
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m);
  }

  const eW = w === '' ? null : dimensionCmError(Number(w));
  const eH = h === '' ? null : dimensionCmError(Number(h));
  const eD = d === '' ? null : dimensionCmError(Number(d));
  const ready = w !== '' && h !== '' && d !== '' && !eW && !eH && !eD;
  const fld =
    'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';
  const fldErr = 'border-danger ring-2 ring-danger/30';

  const resetForm = () => {
    setAmbiente('');
    setType('GUARDA_ROUPA');
    setLabel('');
    setWt('NEW_INSTALL');
    setW('');
    setH('');
    setD('');
    setFile(null);
    setEditId(null);
    setOpen(false);
  };

  const startEdit = (m: ModuleView) => {
    setEditId(m.id);
    setAmbiente(m.ambiente ?? '');
    setType(m.type as Category);
    setLabel(m.label ?? '');
    setWt((m.workType as WorkType) ?? 'NEW_INSTALL');
    setW(String(m.widthMm / 10));
    setH(String(m.heightMm / 10));
    setD(String(m.depthMm / 10));
    setFile(null);
    setOpen(true);
  };

  const submit = () => {
    const payload = {
      ambiente: ambiente.trim() || undefined,
      type,
      label: type === 'OUTRO' ? label.trim() || undefined : undefined,
      workType: wt,
      widthMm: Number(w),
      heightMm: Number(h),
      depthMm: Number(d),
    };
    const localFile = file;
    const isEdit = editId;
    resetForm();

    start(async () => {
      setError(null);
      if (isEdit) {
        const r = await updateModule(projectId, isEdit, payload);
        if (!r.ok) return setError(r.error);
        if (localFile) { const warn = await uploadModulePhoto(projectId, isEdit, localFile); if (warn) setError(warn); }
        return router.refresh();
      }
      addOptimistic({
        id: `temp-${Date.now()}`,
        ambiente: payload.ambiente ?? null,
        type: payload.type,
        workType: payload.workType,
        label: payload.label ?? null,
        widthMm: cmToMm(payload.widthMm),
        heightMm: cmToMm(payload.heightMm),
        depthMm: cmToMm(payload.depthMm),
        photoUrl: localFile ? URL.createObjectURL(localFile) : null,
      });
      const r = await addModule(projectId, payload);
      if (!r.ok) return setError(r.error); // otimista reverte ao fim da transição
      if (localFile) { const warn = await uploadModulePhoto(projectId, r.data.moduleId, localFile); if (warn) setError(warn); }
      router.refresh();
    });
  };

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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-charcoal sm:text-xl">
          Móveis do pedido
          {pending && (
            <span className="inline-flex items-center gap-1 text-sm font-normal text-muted">
              <Spinner /> salvando…
            </span>
          )}
        </h2>
        {editable && !open && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => { resetForm(); setOpen(true); }}
          >
            <IconAdicionar size={20} aria-hidden /> Adicionar móvel
          </Button>
        )}
      </div>

      {optimisticModules.length === 0 && !open ? (
        <div className="rounded-2xl bg-surface p-8 text-center shadow-sm">
          <p className="text-3xl" aria-hidden>🪵</p>
          <p className="mt-2 font-medium text-charcoal">Nenhum móvel ainda</p>
          <p className="text-sm text-muted">Adicione o primeiro móvel deste pedido — com medidas e foto.</p>
        </div>
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
                  <div
                    key={m.id}
                    className={`flex gap-3 rounded-xl bg-surface p-3 shadow-sm transition ${m.id.startsWith('temp-') ? 'opacity-60' : ''}`}
                  >
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
                          <span className="absolute bottom-0 flex w-full items-center justify-center gap-1 bg-charcoal/60 py-0.5 text-center text-[10px] font-medium text-white">
                            {busyId === m.id ? '...' : m.photoUrl ? 'trocar' : <><IconFoto size={12} aria-hidden /> foto</>}
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
                        {editable && !m.id.startsWith('temp-') && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Editar móvel"
                              disabled={pending}
                              onClick={() => startEdit(m)}
                            >
                              <IconEditar size={16} aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Remover móvel"
                              disabled={pending}
                              onClick={() => remove(m.id)}
                            >
                              <IconExcluir size={16} aria-hidden />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-sm text-muted">
                        {formatCm(m.widthMm)} × {formatCm(m.heightMm)} × {formatCm(m.depthMm)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-subtle">L × A × P</span>
                        {m.workType && (
                          <span className="rounded-pill bg-deep px-2 py-0.5 text-[10px] font-medium text-muted">
                            {m.workType === 'NEW_INSTALL' ? 'Novo' : 'Troca'}
                          </span>
                        )}
                      </div>
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
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-deep p-4">
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
          {type === 'OUTRO' && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Qual é o móvel?</span>
              <input className={fld} placeholder="Ex.: Adega, sapateira…" value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
          )}
          <div className="flex gap-2">
            {([
              { v: 'NEW_INSTALL', t: 'Móvel novo', Icon: IconNovo },
              { v: 'REPLACE_EXISTING', t: 'Substituição', Icon: IconAtualizar },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setWt(o.v)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  wt === o.v ? 'border-brand-primary bg-brand-primary/10 text-charcoal' : 'border-subtle text-muted'
                }`}
              >
                <o.Icon size={16} aria-hidden /> {o.t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input className={`${fld} ${eW ? fldErr : ''}`} type="number" inputMode="numeric" min={1} placeholder="Larg. cm" value={w} onChange={(e) => setW(e.target.value)} />
              {eW && <span className="text-xs text-danger">{eW}</span>}
            </div>
            <div>
              <input className={`${fld} ${eH ? fldErr : ''}`} type="number" inputMode="numeric" min={1} placeholder="Alt. cm" value={h} onChange={(e) => setH(e.target.value)} />
              {eH && <span className="text-xs text-danger">{eH}</span>}
            </div>
            <div>
              <input className={`${fld} ${eD ? fldErr : ''}`} type="number" inputMode="numeric" min={1} placeholder="Prof. cm" value={d} onChange={(e) => setD(e.target.value)} />
              {eD && <span className="text-xs text-danger">{eD}</span>}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-charcoal">
              {editId ? 'Trocar a foto (opcional)' : 'Foto do móvel (opcional)'}
            </span>
            <input type="file" accept="image/*" className={fld} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!ready || pending}
              onClick={submit}
            >
              {pending ? 'Salvando…' : editId ? 'Salvar alterações' : 'Adicionar móvel'}
            </Button>
            <Button variant="outline" size="lg" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-danger/10 px-4 py-3 text-base text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
