'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
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
  updatedAt: string; // ISO
};

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

// Unidade sugerida por categoria — o marceneiro quase nunca precisa mexer.
const DEFAULT_UNIT: Record<MaterialCategory, MaterialUnit> = {
  CHAPA: 'M2',
  ESPELHO: 'M2',
  FITA_BORDA: 'ML',
  SERVICO: 'H',
  FERRAGEM: 'UN',
  ACESSORIO: 'UN',
  FRETE: 'UN',
  OUTRO: 'UN',
};

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

type Draft = {
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  precoReais: string;
  supplier: string;
};

const emptyDraft: Draft = { name: '', category: 'CHAPA', unit: 'M2', precoReais: '', supplier: '' };

export function MaterialsManager({ initial }: { initial: MaterialView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showForm, setShowForm] = useState(false);
  // Atualização rápida de preço (linha a linha).
  const [priceId, setPriceId] = useState<string | null>(null);
  const [priceVal, setPriceVal] = useState('');
  // Lista local: atualiza na hora (otimista); o router.refresh reconcilia depois.
  const [items, setItems] = useState<MaterialView[]>(initial);
  useEffect(() => setItems(initial), [initial]);

  const grouped = useMemo(() => {
    const map = new Map<MaterialCategory, MaterialView[]>();
    for (const m of items) (map.get(m.category) ?? map.set(m.category, []).get(m.category)!).push(m);
    return [...map.entries()];
  }, [items]);

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
      precoReais: String(m.unitCostCents / 100),
      supplier: m.supplier ?? '',
    });
    setEditingId(m.id);
    setError(null);
    setShowForm(true);
  };

  const save = () =>
    start(async () => {
      setError(null);
      const preco = Number(draft.precoReais);
      if (draft.name.trim().length < 2 || !(preco >= 0)) return setError('Coloque um nome e um preço válido.');
      const input = {
        name: draft.name.trim(),
        category: draft.category,
        unit: draft.unit,
        unitCostCents: reaisToCents(preco),
        supplier: draft.supplier.trim() || undefined,
      };
      if (editingId) {
        const r = await updateMaterial(editingId, input);
        if (!r.ok) return setError(r.error);
        setItems((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? { ...m, ...input, supplier: input.supplier ?? null, updatedAt: new Date().toISOString() }
              : m,
          ),
        );
      } else {
        const r = await createMaterial(input);
        if (!r.ok) return setError(r.error);
        const created: MaterialView = {
          ...r.material,
          category: r.material.category as MaterialCategory,
          unit: r.material.unit as MaterialUnit,
        };
        setItems((prev) => [...prev, created]);
      }
      setShowForm(false);
      router.refresh();
    });

  const saveQuickPrice = (m: MaterialView) =>
    start(async () => {
      const preco = Number(priceVal);
      if (!(preco >= 0)) return;
      const cents = reaisToCents(preco);
      const r = await updateMaterial(m.id, {
        name: m.name,
        category: m.category,
        unit: m.unit,
        unitCostCents: cents,
        supplier: m.supplier ?? undefined,
      });
      if (r.ok) {
        setItems((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, unitCostCents: cents, updatedAt: new Date().toISOString() } : x)),
        );
        setPriceId(null);
        router.refresh();
      }
    });

  const toggleActive = (m: MaterialView) =>
    start(async () => {
      await setMaterialActive(m.id, !m.active);
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: !m.active } : x)));
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-sage/20 px-4 py-3 text-sm text-charcoal">
        💡 Coloque o preço que você paga <strong>hoje</strong>. Sempre que comprar e o preço mudar, é só tocar em
        <strong> Atualizar preço</strong>. No orçamento você ainda pode ajustar item a item.
      </p>

      {!showForm && (
        <button
          type="button"
          onClick={openNew}
          className="w-fit rounded-xl bg-brand-primary px-5 py-3 text-base font-semibold text-white transition hover:opacity-90"
        >
          + Adicionar material
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-charcoal">{editingId ? 'Editar material' : 'Novo material'}</h2>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">O que é?</span>
              <input
                className={fld}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex.: Chapa MDF 18mm Branco"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Tipo</span>
              <select
                className={fld}
                value={draft.category}
                onChange={(e) => {
                  const category = e.target.value as MaterialCategory;
                  setDraft({ ...draft, category, unit: DEFAULT_UNIT[category] });
                }}
              >
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{MATERIAL_CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-charcoal">Quanto você paga (R$)</span>
                <input
                  className={fld}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={draft.precoReais}
                  onChange={(e) => setDraft({ ...draft, precoReais: e.target.value })}
                  placeholder="0,00"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-charcoal">Por</span>
                <select className={fld} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as MaterialUnit })}>
                  {MATERIAL_UNITS.map((u) => (
                    <option key={u} value={u}>{MATERIAL_UNIT_LABEL[u]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-charcoal">Onde compra (opcional)</span>
              <input className={fld} value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} placeholder="Ex.: Leo Madeiras" />
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

      {items.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
          <span className="text-3xl" aria-hidden>📦</span>
          <p className="mt-2 font-medium text-charcoal">Seu catálogo está vazio</p>
          <p>Cadastre o que você usa (chapa, espelho, ferragem, serviço) pra montar orçamentos rápido.</p>
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
                  <li key={m.id} className={`rounded-xl border border-subtle bg-surface p-3 ${m.active ? '' : 'opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-charcoal">
                          {m.name}
                          {!m.active && <span className="ml-2 text-xs text-muted">(inativo)</span>}
                        </p>
                        <p className="text-sm text-muted">
                          {formatBRL(m.unitCostCents)} / {MATERIAL_UNIT_LABEL[m.unit]}
                          <span className="text-subtle"> · atualizado em {dateLabel(m.updatedAt)}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPriceId(priceId === m.id ? null : m.id);
                          setPriceVal(String(m.unitCostCents / 100));
                        }}
                        className="shrink-0 rounded-lg bg-deep px-3 py-1.5 text-sm font-semibold text-charcoal hover:bg-sand-deep"
                      >
                        💲 Atualizar preço
                      </button>
                    </div>

                    {priceId === m.id && (
                      <div className="mt-3 flex items-end gap-2 border-t border-subtle pt-3">
                        <label className="flex flex-1 flex-col gap-1">
                          <span className="text-xs text-muted">Novo preço por {MATERIAL_UNIT_LABEL[m.unit]} (R$)</span>
                          <input
                            autoFocus
                            className={fld}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={priceVal}
                            onChange={(e) => setPriceVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveQuickPrice(m)}
                          />
                        </label>
                        <button type="button" onClick={() => saveQuickPrice(m)} disabled={pending} className="rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                          Salvar
                        </button>
                      </div>
                    )}

                    <div className="mt-2 flex gap-3 text-sm">
                      <button type="button" onClick={() => openEdit(m)} className="font-medium text-brand-primary hover:underline">
                        Editar
                      </button>
                      <button type="button" onClick={() => toggleActive(m)} disabled={pending} className="text-muted hover:text-charcoal">
                        {m.active ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
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
