'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatBRL } from '@abilar/shared';
import { saveExternalQuote, setExternalQuoteStatus, deleteExternalQuote } from '@/lib/external-quotes/actions';

export type LineItem = { materialId?: string | null; name: string; category: string; unit: string; qty: number; unitCostCents: number };
export type CatalogItem = { id: string; name: string; category: string; unit: string; unitCostCents: number };
export type ExternalQuoteCard = {
  id: string;
  clientName: string;
  title: string;
  valueCents: number;
  subtotalCostCents: number;
  marginPct: number;
  status: 'SENT' | 'ACCEPTED' | 'REJECTED' | string;
  note: string | null;
  lineItems: LineItem[];
};

const STATUS_LABEL: Record<string, string> = { SENT: 'Enviado', ACCEPTED: 'Aceito', REJECTED: 'Recusado' };

export function AvulsosManager({ initialQuotes, catalog }: { initialQuotes: ExternalQuoteCard[]; catalog: CatalogItem[] }) {
  const [editing, setEditing] = useState<ExternalQuoteCard | 'new' | null>(null);
  const [pending, start] = useTransition();

  const refresh = () => start(() => Promise.resolve());

  return (
    <div className="flex flex-col gap-4">
      {!editing && (
        <button type="button" onClick={() => setEditing('new')} className="self-start rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
          + Novo orçamento avulso
        </button>
      )}

      {editing ? (
        <Form
          quote={editing === 'new' ? null : editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
        />
      ) : initialQuotes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
          Nenhum orçamento avulso ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {initialQuotes.map((q) => (
            <li key={q.id} className="rounded-2xl border border-subtle bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-charcoal">{q.title}</p>
                  <p className="text-sm text-muted">{q.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-charcoal">{formatBRL(q.valueCents)}</p>
                  <span className="rounded-pill bg-deep px-2 py-0.5 text-xs font-medium text-muted">{STATUS_LABEL[q.status] ?? q.status}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Link href={`/marceneiro/avulsos/${q.id}/imprimir`} className="font-semibold text-brand-primary hover:underline">🖨️ PDF</Link>
                <button type="button" onClick={() => setEditing(q)} className="font-semibold text-brand-secondary hover:underline">Editar</button>
                {q.status !== 'ACCEPTED' && (
                  <button type="button" disabled={pending} onClick={() => start(async () => { await setExternalQuoteStatus(q.id, 'ACCEPTED'); refresh(); })} className="font-semibold text-brand-primary hover:underline">Marcar aceito</button>
                )}
                {q.status !== 'REJECTED' && (
                  <button type="button" disabled={pending} onClick={() => start(async () => { await setExternalQuoteStatus(q.id, 'REJECTED'); refresh(); })} className="text-muted hover:underline">Recusado</button>
                )}
                <button type="button" disabled={pending} onClick={() => { if (confirm('Excluir este orçamento?')) start(async () => { await deleteExternalQuote(q.id); refresh(); }); }} className="text-ochre hover:underline">Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Form({ quote, catalog, onClose }: { quote: ExternalQuoteCard | null; catalog: CatalogItem[]; onClose: () => void }) {
  const [clientName, setClientName] = useState(quote?.clientName ?? '');
  const [title, setTitle] = useState(quote?.title ?? '');
  const [items, setItems] = useState<LineItem[]>(quote?.lineItems ?? []);
  const [margin, setMargin] = useState(String(quote?.marginPct ?? 30));
  const [note, setNote] = useState(quote?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const marginPct = Math.max(0, Number(margin) || 0);
  const subtotal = items.reduce((a, i) => a + Math.round(i.qty * i.unitCostCents), 0);
  const value = Math.round(subtotal * (1 + marginPct / 100));

  const addFromCatalog = (id: string) => {
    const m = catalog.find((c) => c.id === id);
    if (m) setItems((arr) => [...arr, { materialId: m.id, name: m.name, category: m.category, unit: m.unit, qty: 1, unitCostCents: m.unitCostCents }]);
  };

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveExternalQuote(
        { clientName: clientName.trim(), title: title.trim(), lineItems: items, marginPct, note: note.trim() || undefined },
        quote?.id,
      );
      if (!r.ok) return setError(r.error);
      onClose();
    });

  const fld = 'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-subtle bg-surface p-5">
      <h2 className="text-lg font-semibold text-charcoal">{quote ? 'Editar orçamento' : 'Novo orçamento avulso'}</h2>
      <input className={fld} placeholder="Nome do cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} />
      <input className={fld} placeholder="Título (ex.: Cozinha planejada)" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="rounded-xl border border-subtle p-3">
        <p className="mb-2 text-sm font-semibold text-charcoal">Itens</p>
        {items.length === 0 && <p className="text-sm text-muted">Adicione itens do catálogo.</p>}
        <ul className="flex flex-col gap-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-charcoal">{it.name} <span className="text-muted">({formatBRL(it.unitCostCents)}/{it.unit})</span></span>
              <input
                type="number"
                min={0}
                className="w-20 rounded-lg border border-subtle px-2 py-1 text-sm"
                value={it.qty}
                onChange={(e) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, qty: Math.max(0, Number(e.target.value) || 0) } : x)))}
              />
              <button type="button" onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))} className="text-ochre">✕</button>
            </li>
          ))}
        </ul>
        {catalog.length > 0 && (
          <select className={`${fld} mt-2`} value="" onChange={(e) => { if (e.target.value) addFromCatalog(e.target.value); }}>
            <option value="">+ Adicionar do catálogo…</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {formatBRL(c.unitCostCents)}/{c.unit}</option>
            ))}
          </select>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-charcoal">
        Margem (%)
        <input type="number" min={0} className="w-24 rounded-lg border border-subtle px-2 py-1" value={margin} onChange={(e) => setMargin(e.target.value)} />
      </label>
      <p className="text-sm text-muted">Custo {formatBRL(subtotal)} + {marginPct}% = <strong className="text-charcoal">{formatBRL(value)}</strong></p>

      <textarea className={fld} rows={2} placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <p className="rounded-xl bg-ochre/20 px-4 py-2 text-sm text-charcoal">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || items.length === 0} onClick={save} className="flex-1 rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl border border-subtle px-4 py-3 text-base text-charcoal hover:bg-deep">Cancelar</button>
      </div>
    </div>
  );
}
