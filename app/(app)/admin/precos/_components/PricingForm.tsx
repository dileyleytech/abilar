'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PricingConfigInput } from '@abilar/pricing';
import { updatePricingConfig } from '@/lib/pricing/actions';

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-3 py-2 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

type Row = { n: string; mdrPct: string };

export function PricingForm({ initial }: { initial: PricingConfigInput }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [tc, setTc] = useState(String(initial.clientCommissionPct));
  const [tm, setTm] = useState(String(initial.carpenterCommissionPct));
  const [a, setA] = useState(String(initial.architectCommissionPct));
  const [dmin, setDmin] = useState(String(initial.dilutionMinCarpenterSharePct));
  const [mp, setMp] = useState(String(initial.dilutionPlatformMarginPct));
  const [pix, setPix] = useState(String(initial.pixFixedFeeCents));
  const [rows, setRows] = useState<Row[]>(
    initial.installments.map((r) => ({ n: String(r.n), mdrPct: String(r.mdrPct) })),
  );
  const [promoOn, setPromoOn] = useState(!!initial.promo);
  const [promoTc, setPromoTc] = useState(String(initial.promo?.clientCommissionPct ?? ''));
  const [promoTm, setPromoTm] = useState(String(initial.promo?.carpenterCommissionPct ?? ''));

  const setRow = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, { n: '', mdrPct: '' }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = () =>
    start(async () => {
      setMsg(null);
      const promo = promoOn
        ? {
            ...(promoTc !== '' ? { clientCommissionPct: Number(promoTc) } : {}),
            ...(promoTm !== '' ? { carpenterCommissionPct: Number(promoTm) } : {}),
          }
        : null;
      const payload = {
        clientCommissionPct: Number(tc),
        carpenterCommissionPct: Number(tm),
        architectCommissionPct: Number(a),
        dilutionMinCarpenterSharePct: Number(dmin),
        dilutionPlatformMarginPct: Number(mp),
        pixFixedFeeCents: Number(pix),
        installments: rows
          .filter((r) => r.n !== '' && r.mdrPct !== '')
          .map((r) => ({ n: Number(r.n), mdrPct: Number(r.mdrPct) })),
        promo,
      };
      const r = await updatePricingConfig(payload);
      if (r.ok) {
        setMsg({ ok: true, text: 'Configuração salva!' });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });

  return (
    <div className="flex flex-col gap-6">
      <Section title="Comissões (% sobre V)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Cliente (tc)" value={tc} onChange={setTc} suffix="%" />
          <Field label="Marceneiro (tm)" value={tm} onChange={setTm} suffix="%" />
          <Field label="Arquiteto (a)" value={a} onChange={setA} suffix="%" />
        </div>
      </Section>

      <Section title="Diluição do parcelamento">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Mín. do marceneiro (s)" value={dmin} onChange={setDmin} suffix="%" />
          <Field label="Margem da plataforma (mp)" value={mp} onChange={setMp} suffix="%" />
          <Field label="Taxa fixa Pix" value={pix} onChange={setPix} suffix="centavos" />
        </div>
      </Section>

      <Section title="Taxas por nº de parcelas (MDR do cartão)">
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${fld} w-24`} type="number" min={1} placeholder="nº" value={r.n} onChange={(e) => setRow(i, 'n', e.target.value)} />
              <span className="text-muted">x →</span>
              <input className={`${fld} w-32`} type="number" step="0.01" min={0} placeholder="MDR %" value={r.mdrPct} onChange={(e) => setRow(i, 'mdrPct', e.target.value)} />
              <span className="text-muted">%</span>
              <button type="button" onClick={() => removeRow(i)} className="rounded-md px-2 py-1 text-muted hover:bg-deep hover:text-charcoal">
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addRow} className="self-start rounded-xl border border-subtle px-4 py-2 text-sm font-medium text-charcoal hover:bg-deep">
            + Adicionar parcela
          </button>
        </div>
      </Section>

      <Section title="Promoção">
        <label className="flex items-center gap-2 text-base text-charcoal">
          <input type="checkbox" checked={promoOn} onChange={(e) => setPromoOn(e.target.checked)} className="h-5 w-5" />
          Promoção ativa (sobrescreve taxas)
        </label>
        {promoOn && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Cliente na promo" value={promoTc} onChange={setPromoTc} suffix="%" placeholder="deixe vazio p/ manter" />
            <Field label="Marceneiro na promo" value={promoTm} onChange={setPromoTm} suffix="%" placeholder="deixe vazio p/ manter" />
          </div>
        )}
      </Section>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-xl bg-brand-primary px-6 py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {pending ? 'Salvando…' : 'Salvar configuração'}
        </button>
        {msg && (
          <span className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-sage/25 text-charcoal' : 'bg-ochre/20 text-charcoal'}`} role="status">
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-charcoal">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-charcoal">{label}</span>
      <div className="flex items-center gap-2">
        <input className={fld} type="number" step="0.001" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="shrink-0 text-sm text-muted">{suffix}</span>}
      </div>
    </label>
  );
}
