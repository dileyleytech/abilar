'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  reaisToCents,
  formatBRL,
  checkCompleteness,
  MATERIAL_CATEGORIES,
  MATERIAL_UNITS,
  type MaterialCategory,
  type MaterialUnit,
  type QuoteLineItem,
} from '@abilar/shared';
import { quotePricing, maxClientInstallments, computeItemsBase, type PricingConfig } from '@abilar/pricing';
import { MATERIAL_CATEGORY_LABEL, MATERIAL_UNIT_LABEL } from '@/lib/labels';
import { sendQuote, withdrawQuote } from '@/lib/quotes/actions';

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export type MaterialOption = {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  unitCostCents: number;
};

export type QuoteInitial = {
  baseValueReais: string;
  maxInstallments: number;
  dilutionSharePct: number;
  note: string;
  status: string;
  lineItems?: QuoteLineItem[];
  marginPct?: number;
};

type Line = {
  key: number;
  materialId: string | null;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  qty: string;
  custoReais: string;
};

type DraftItem = Omit<Line, 'key'>;
const emptyDraft: DraftItem = { materialId: null, name: '', category: 'CHAPA', unit: 'M2', qty: '1', custoReais: '' };

export function QuoteForm({
  projectId,
  config,
  materials,
  initial,
}: {
  projectId: string;
  config: PricingConfig;
  materials: MaterialOption[];
  initial?: QuoteInitial;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const minS = config.dilutionMinCarpenterSharePct;
  const systemMax = useMemo(() => maxClientInstallments(config), [config]);
  const installmentOptions = useMemo(
    () => Object.keys(config.installmentTable).map(Number).sort((a, b) => a - b),
    [config],
  );

  const keyRef = useRef(1);
  const [lines, setLines] = useState<Line[]>(
    (initial?.lineItems ?? []).map((it) => ({
      key: keyRef.current++,
      materialId: it.materialId ?? null,
      name: it.name,
      category: it.category,
      unit: it.unit,
      qty: String(it.qty),
      custoReais: String(it.unitCostCents / 100),
    })),
  );
  const [draft, setDraft] = useState<DraftItem>(emptyDraft);
  const [marginPct, setMarginPct] = useState<string>(String(initial?.marginPct ?? 30));
  const [valor, setValor] = useState(initial?.baseValueReais ?? '');
  const [maxInst, setMaxInst] = useState<number>(initial?.maxInstallments ?? 1);
  const [s, setS] = useState<number>(initial?.dilutionSharePct ?? Math.max(minS, 100));
  const [note, setNote] = useState(initial?.note ?? '');

  const hasItems = lines.length > 0;

  // Soma dos itens + margem → valor V. Sem itens, usa o "valor fechado" digitado.
  const itemsTotal = useMemo(
    () =>
      computeItemsBase(
        lines.map((l) => ({ qty: Number(l.qty) || 0, unitCostCents: reaisToCents(Number(l.custoReais) || 0) })),
        Number(marginPct) || 0,
      ),
    [lines, marginPct],
  );
  const manualCents = Number(valor) > 0 ? reaisToCents(Number(valor)) : 0;
  const cents = hasItems ? itemsTotal.baseValueCents : manualCents;
  const costCents = hasItems ? itemsTotal.subtotalCostCents : undefined;

  const suggestions = useMemo(
    () => (hasItems ? checkCompleteness(lines.map((l) => l.category)) : []),
    [hasItems, lines],
  );

  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  // Rascunho do NOVO item (composer separado da lista de adicionados).
  const draftQty = Number(draft.qty) || 0;
  const draftCustoCents = reaisToCents(Number(draft.custoReais) || 0);
  const draftValid = draft.name.trim().length > 0 && draftQty > 0 && Number(draft.custoReais) >= 0;

  const onPickDraftMaterial = (id: string) => {
    if (id === '') return setDraft({ ...draft, materialId: null });
    const m = materials.find((x) => x.id === id);
    if (m) setDraft({ ...draft, materialId: m.id, name: m.name, category: m.category, unit: m.unit, custoReais: String(m.unitCostCents / 100) });
  };

  const addDraft = () => {
    if (!draftValid) return;
    setLines((prev) => [
      ...prev,
      {
        key: keyRef.current++,
        materialId: draft.materialId,
        name: draft.name.trim(),
        category: draft.category,
        unit: draft.unit,
        qty: String(draftQty),
        custoReais: draft.custoReais,
      },
    ]);
    setDraft(emptyDraft);
  };

  // Editar = devolve a linha ao composer e remove da lista (re-adiciona depois).
  const editLine = (l: Line) => {
    setDraft({ materialId: l.materialId, name: l.name, category: l.category, unit: l.unit, qty: l.qty, custoReais: l.custoReais });
    removeLine(l.key);
  };

  const preview = useMemo(() => {
    if (cents <= 0) return null;
    const subsidizes = maxInst > 1;
    const sEff = subsidizes ? s : 0;
    const avista = quotePricing({ baseValueCents: cents, config, installments: 1, method: 'PIX', carpenterDilutionSharePct: sEff });
    const parc =
      systemMax > 1
        ? quotePricing({ baseValueCents: cents, config, installments: subsidizes ? maxInst : 1, clientInstallments: systemMax, method: 'CARD', carpenterDilutionSharePct: sEff })
        : null;
    return { avista, parc, subsidizes };
  }, [cents, maxInst, s, config, systemMax]);

  const submit = () =>
    start(async () => {
      setError(null);
      const lineItems: QuoteLineItem[] | undefined = hasItems
        ? lines.map((l) => ({
            materialId: l.materialId,
            name: l.name.trim() || 'Item',
            category: l.category,
            unit: l.unit,
            qty: Number(l.qty) || 0,
            unitCostCents: reaisToCents(Number(l.custoReais) || 0),
          }))
        : undefined;
      const r = await sendQuote(projectId, {
        baseValueCents: cents,
        maxInstallments: maxInst,
        dilutionSharePct: s,
        note: note.trim() || undefined,
        lineItems,
        marginPct: hasItems ? Number(marginPct) || 0 : undefined,
        carpenterCostCents: costCents,
      });
      if (!r.ok) return setError(r.error);
      router.push('/marceneiro');
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      await withdrawQuote(projectId);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {initial && (
        <p className="rounded-lg bg-sage/25 px-3 py-2 text-sm text-charcoal">
          ✓ Você já enviou um orçamento. Editar e salvar atualiza o que o cliente vê.
        </p>
      )}

      {/* Itens JÁ adicionados (resumo) + margem/valor */}
      {hasItems && (
        <div className="rounded-2xl border border-subtle bg-base p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-charcoal">Itens adicionados ({lines.length})</span>
            <span className="text-sm text-muted">Custo: {formatBRL(itemsTotal.subtotalCostCents)}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {lines.map((l) => {
              const unitCents = reaisToCents(Number(l.custoReais) || 0);
              const lineTotal = Math.round((Number(l.qty) || 0) * unitCents);
              return (
                <li key={l.key} className="flex items-center gap-2 rounded-xl border border-subtle bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-charcoal">{l.name}</p>
                    <p className="text-sm text-muted">
                      {l.qty} {MATERIAL_UNIT_LABEL[l.unit]} × {formatBRL(unitCents)} ={' '}
                      <strong className="text-charcoal">{formatBRL(lineTotal)}</strong>
                    </p>
                  </div>
                  <button type="button" onClick={() => editLine(l)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-brand-primary hover:bg-deep">
                    Editar
                  </button>
                  <button type="button" onClick={() => removeLine(l.key)} className="shrink-0 rounded-lg px-2 py-1 text-sm text-muted hover:text-ochre">
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t border-subtle pt-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
                Margem (lucro)
                <input className={`${fld} w-24`} type="number" inputMode="decimal" min={0} step="1" value={marginPct} onChange={(e) => setMarginPct(e.target.value)} />
                %
              </label>
              <div className="text-right">
                <span className="text-xs text-muted">Seu valor (V)</span>
                <p className="font-mono text-lg font-bold text-brand-primary">{formatBRL(cents)}</p>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted">Lucro: {formatBRL(itemsTotal.marginCents)}. O preço do cliente leva taxas por cima disso.</p>
          </div>
        </div>
      )}

      {/* Adicionar NOVO item (composer separado da lista acima) */}
      <div className="rounded-2xl border border-dashed border-subtle bg-surface p-4">
        <p className="mb-2 text-sm font-semibold text-charcoal">Adicionar item</p>
        {materials.length > 0 && (
          <select className={`${fld} mb-2`} value={draft.materialId ?? ''} onChange={(e) => onPickDraftMaterial(e.target.value)}>
            <option value="">— item avulso —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({formatBRL(m.unitCostCents)}/{MATERIAL_UNIT_LABEL[m.unit]})</option>
            ))}
          </select>
        )}
        {draft.materialId ? (
          <div className="mb-2">
            <p className="font-medium text-charcoal">{draft.name}</p>
            <p className="text-xs text-muted">
              {MATERIAL_CATEGORY_LABEL[draft.category]} · por {MATERIAL_UNIT_LABEL[draft.unit]} · do catálogo
            </p>
          </div>
        ) : (
          <>
            <input className={`${fld} mb-2`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Descrição do item" />
            <div className="grid grid-cols-2 gap-2">
              <select className={fld} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as MaterialCategory })}>
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{MATERIAL_CATEGORY_LABEL[c]}</option>
                ))}
              </select>
              <select className={fld} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as MaterialUnit })}>
                {MATERIAL_UNITS.map((u) => (
                  <option key={u} value={u}>{MATERIAL_UNIT_LABEL[u]}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="mt-2 flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted">Qtd ({MATERIAL_UNIT_LABEL[draft.unit]})</span>
            <input className={fld} type="number" inputMode="decimal" min={0} step="0.01" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted">Custo (R$)</span>
            <input className={fld} type="number" inputMode="decimal" min={0} step="0.01" value={draft.custoReais} onChange={(e) => setDraft({ ...draft, custoReais: e.target.value })} />
          </label>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted">Total</span>
            <span className="py-3 font-mono text-sm font-semibold text-charcoal">{formatBRL(Math.round(draftQty * draftCustoCents))}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={addDraft} disabled={!draftValid} className="rounded-xl bg-brand-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            + Adicionar ao orçamento
          </button>
          {materials.length === 0 && (
            <a href="/marceneiro/catalogo" className="rounded-xl border border-subtle px-4 py-2 text-sm text-charcoal">
              📦 Cadastrar no catálogo
            </a>
          )}
        </div>
      </div>

      {/* Sem itens: valor fechado (modo simples) */}
      {!hasItems && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-charcoal">Ou informe um valor fechado</span>
          <div className="flex items-center gap-2">
            <input className={`${fld} max-w-48`} type="number" inputMode="decimal" min={0} step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            <span className="font-mono text-lg font-bold text-brand-primary">{cents > 0 ? formatBRL(cents) : ''}</span>
          </div>
        </label>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-xl bg-ochre/15 px-4 py-3 text-sm text-charcoal">
          <p className="font-semibold">Confira antes de enviar (sugestões):</p>
          <ul className="mt-1 list-disc pl-5">
            {suggestions.map((sug) => (
              <li key={sug}>{sug}</li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-charcoal">Você topa abater a taxa do cartão até</span>
        <select className={fld} value={maxInst} onChange={(e) => setMaxInst(Number(e.target.value))}>
          {installmentOptions.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? 'Não abato (cliente paga a taxa cheia)' : `${n}x`}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted">
          O cliente sempre pode parcelar em até {systemMax}x. Aqui você decide até quanto quer abrir mão de
          uma parte da taxa para baratear o parcelamento dele.
        </p>
      </label>

      {maxInst > 1 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-charcoal">Quanto da taxa (até {maxInst}x) você absorve</span>
            <span className="font-mono text-base text-brand-primary">{s}%</span>
          </div>
          <input type="range" min={minS} max={100} step={1} value={s} onChange={(e) => setS(Number(e.target.value))} className="mt-2 w-full accent-brand-primary" />
          <p className="text-sm text-muted">Quanto mais você absorve, menos o cliente paga a mais — e você recebe um pouco menos.</p>
        </div>
      )}

      {preview && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-subtle bg-base p-4 sm:grid-cols-2">
          <Scenario title="À vista (Pix)" youGet={preview.avista.carpenterPayoutCents} clientPays={preview.avista.displayedAmountCents} />
          {preview.parc ? (
            <Scenario
              title={preview.subsidizes ? `Cliente parcela (até ${systemMax}x)` : `Se o cliente parcelar (até ${systemMax}x)`}
              youGet={preview.parc.carpenterPayoutCents}
              clientPays={preview.parc.displayedAmountCents}
              installment={Math.round(preview.parc.displayedAmountCents / systemMax)}
              n={systemMax}
            />
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-deep p-4 text-center text-sm text-muted">
              Sem parcelamento configurado.
            </div>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-charcoal">Mensagem ao cliente (opcional)</span>
        <textarea className={`${fld} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Prazo, detalhes do material…" />
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={pending || cents <= 0} className="flex-1 rounded-xl bg-brand-primary px-5 py-4 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {pending ? 'Enviando…' : initial ? 'Atualizar orçamento' : 'Enviar orçamento'}
        </button>
        {initial && (
          <button type="button" onClick={remove} disabled={pending} className="rounded-xl border border-subtle px-4 py-4 text-base text-charcoal hover:bg-deep">
            Retirar
          </button>
        )}
      </div>
      {error && <p className="rounded-xl bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">{error}</p>}
    </div>
  );
}

function Scenario({
  title,
  youGet,
  clientPays,
  installment,
  n,
}: {
  title: string;
  youGet: number;
  clientPays: number;
  installment?: number;
  n?: number;
}) {
  return (
    <div className="rounded-lg bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">{title}</p>
      <p className="mt-1 text-sm text-muted">Você recebe</p>
      <p className="text-xl font-bold text-charcoal">{formatBRL(youGet)}</p>
      <p className="mt-2 text-sm text-muted">Cliente paga</p>
      <p className="text-base font-semibold text-charcoal">
        {formatBRL(clientPays)}
        {installment && n ? <span className="text-muted"> · {n}x de {formatBRL(installment)}</span> : null}
      </p>
    </div>
  );
}
