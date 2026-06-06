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

  const addLine = (m?: MaterialOption) =>
    setLines((prev) => [
      ...prev,
      {
        key: keyRef.current++,
        materialId: m?.id ?? null,
        name: m?.name ?? '',
        category: m?.category ?? 'OUTRO',
        unit: m?.unit ?? 'UN',
        qty: '1',
        custoReais: m ? String(m.unitCostCents / 100) : '',
      },
    ]);
  const patchLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const onPickMaterial = (key: number, id: string) => {
    if (id === '') return patchLine(key, { materialId: null });
    const m = materials.find((x) => x.id === id);
    if (m) patchLine(key, { materialId: m.id, name: m.name, category: m.category, unit: m.unit, custoReais: String(m.unitCostCents / 100) });
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

      {/* Itens do orçamento (puxa do catálogo) */}
      <div className="rounded-2xl border border-subtle bg-base p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-charcoal">Itens do orçamento</span>
          {hasItems && <span className="text-sm text-muted">Custo: {formatBRL(itemsTotal.subtotalCostCents)}</span>}
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((l) => {
            const lineTotal = Math.round((Number(l.qty) || 0) * reaisToCents(Number(l.custoReais) || 0));
            return (
              <div key={l.key} className="rounded-xl border border-subtle bg-surface p-3">
                {materials.length > 0 && (
                  <select className={`${fld} mb-2`} value={l.materialId ?? ''} onChange={(e) => onPickMaterial(l.key, e.target.value)}>
                    <option value="">— item avulso —</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({formatBRL(m.unitCostCents)}/{MATERIAL_UNIT_LABEL[m.unit]})</option>
                    ))}
                  </select>
                )}
                <input className={`${fld} mb-2`} value={l.name} onChange={(e) => patchLine(l.key, { name: e.target.value })} placeholder="Descrição do item" />
                <div className="grid grid-cols-2 gap-2">
                  <select className={fld} value={l.category} onChange={(e) => patchLine(l.key, { category: e.target.value as MaterialCategory })}>
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{MATERIAL_CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                  <select className={fld} value={l.unit} onChange={(e) => patchLine(l.key, { unit: e.target.value as MaterialUnit })}>
                    {MATERIAL_UNITS.map((u) => (
                      <option key={u} value={u}>{MATERIAL_UNIT_LABEL[u]}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-muted">Qtd ({MATERIAL_UNIT_LABEL[l.unit]})</span>
                    <input className={fld} type="number" inputMode="decimal" min={0} step="0.01" value={l.qty} onChange={(e) => patchLine(l.key, { qty: e.target.value })} />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-muted">Custo (R$)</span>
                    <input className={fld} type="number" inputMode="decimal" min={0} step="0.01" value={l.custoReais} onChange={(e) => patchLine(l.key, { custoReais: e.target.value })} />
                  </label>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted">Total</span>
                    <span className="py-3 font-mono text-sm font-semibold text-charcoal">{formatBRL(lineTotal)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => removeLine(l.key)} className="mt-1 text-sm text-ochre hover:underline">
                  remover
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => addLine(materials[0])} className="rounded-xl bg-brand-secondary px-4 py-2 text-sm font-semibold text-white">
            + Adicionar item
          </button>
          {materials.length === 0 && (
            <a href="/marceneiro/catalogo" className="rounded-xl border border-subtle px-4 py-2 text-sm text-charcoal">
              📦 Cadastrar no catálogo
            </a>
          )}
        </div>

        {hasItems && (
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
        )}
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
