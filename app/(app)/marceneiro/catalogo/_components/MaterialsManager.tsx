'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MATERIAL_CATEGORIES,
  MATERIAL_UNITS,
  reaisToCents,
  formatBRL,
  type MaterialCategory,
  type MaterialUnit,
} from '@abilar/shared';
import { MATERIAL_CATEGORY_LABEL, MATERIAL_UNIT_LABEL } from '@/lib/labels';
import { createMaterial, updateMaterial, setMaterialActive } from '@/lib/carpenter/actions';

export type MaterialView = {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  unitCostCents: number;
  sku: string | null;
  supplier: string | null;
  active: boolean;
};

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

type Draft = {
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  custoReais: string;
  sku: string;
  supplier: string;
};

const emptyDraft: Draft = { name: '', category: 'CHAPA', unit: 'M2', custoReais: '', sku: '', supplier: '' };

export function MaterialsManager({ initial }: { initial: MaterialView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showForm, setShowForm] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<MaterialCategory, MaterialView[]>();
    for (const m of initial) (map.get(m.category) ?? map.set(m.category, []).get(m.category)!).push(m);
    return [...map.entries()];
  }, [initial]);

  const openNew = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };
  const openEdit = (m: MaterialView) => {
    setDraft({
      name: m.name,
      category: m.category,
      unit: m.unit,
      custoReais: String(m.unitCostCents / 100),
      sku: m.sku ?? '',
      supplier: m.supplier ?? '',
    });
    setEditingId(m.id);
    setError(null);
    setShowForm(true);
  };

  const save = () =>
    start(async () => {
      setError(null);
      const custo = Number(draft.custoReais);
      if (!draft.name.trim() || !(custo >= 0)) return setError('Informe nome e custo válidos.');
      const input = {
        name: draft.name.trim(),
        category: draft.category,
        unit: draft.unit,
        unitCostCents: reaisToCents(custo),
        sku: draft.sku.trim() || undefined,
        supplier: draft.supplier.trim() || undefined,
      };
      const r = editingId ? await updateMaterial(editingId, input) : await createMaterial(input);
      if (!r.ok) return setError(r.error);
      setShowForm(false);
      router.refresh();
    });

  const toggleActive = (m: MaterialView) =>
    start(async () => {
      await setMaterialActive(m.id, !m.active);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {!showForm && (
        <button
          type="button"
          onClick={openNew}
          className="w-fit rounded-xl bg-brand-primary px-5 py-3 text-base font-semibold text-white transition hover:opacity-90"
        >
          + Novo item
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-charcoal">{editingId ? 'Editar item' : 'Novo item'}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium text-charcoal">Nome</span>
              <input className={fld} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Chapa MDF 18mm Branco TX" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Categoria</span>
              <select className={fld} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as MaterialCategory })}>
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{MATERIAL_CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Unidade</span>
              <select className={fld} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as MaterialUnit })}>
                {MATERIAL_UNITS.map((u) => (
                  <option key={u} value={u}>{MATERIAL_UNIT_LABEL[u]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Custo por {MATERIAL_UNIT_LABEL[draft.unit]} (R$)</span>
              <input className={fld} type="number" inputMode="decimal" min={0} step="0.01" value={draft.custoReais} onChange={(e) => setDraft({ ...draft, custoReais: e.target.value })} placeholder="0,00" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Fornecedor (opcional)</span>
              <input className={fld} value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium text-charcoal">SKU / código (opcional)</span>
              <input className={fld} value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-ochre">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={save} disabled={pending} className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-subtle px-4 py-2.5 text-sm text-charcoal">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {initial.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
          <span className="text-3xl" aria-hidden>📦</span>
          <p className="mt-2 font-medium text-charcoal">Seu catálogo está vazio</p>
          <p>Cadastre chapas, ferragens, serviços e fretes para montar orçamentos rápido.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([cat, items]) => (
            <section key={cat}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-secondary">
                {MATERIAL_CATEGORY_LABEL[cat]}
              </h3>
              <ul className="flex flex-col gap-2">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className={`flex items-center gap-3 rounded-xl border border-subtle bg-surface p-3 ${m.active ? '' : 'opacity-60'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-charcoal">
                        {m.name}
                        {!m.active && <span className="ml-2 text-xs text-muted">(inativo)</span>}
                      </p>
                      <p className="text-sm text-muted">
                        {formatBRL(m.unitCostCents)} / {MATERIAL_UNIT_LABEL[m.unit]}
                        {m.supplier ? ` · ${m.supplier}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => openEdit(m)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-primary hover:bg-deep">
                      Editar
                    </button>
                    <button type="button" onClick={() => toggleActive(m)} disabled={pending} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-deep">
                      {m.active ? 'Desativar' : 'Reativar'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
