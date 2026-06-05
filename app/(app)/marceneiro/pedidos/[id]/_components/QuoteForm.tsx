'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reaisToCents, formatBRL } from '@abilar/shared';
import { sendQuote, withdrawQuote, previewQuote, type QuotePreview } from '@/lib/quotes/actions';

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export type QuoteInitial = {
  baseValueReais: string;
  maxInstallments: number;
  dilutionSharePct: number;
  note: string;
  status: string;
};

export function QuoteForm({
  projectId,
  minDilutionPct,
  installmentOptions,
  initial,
}: {
  projectId: string;
  minDilutionPct: number;
  installmentOptions: number[];
  initial?: QuoteInitial;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [valor, setValor] = useState(initial?.baseValueReais ?? '');
  const [maxInst, setMaxInst] = useState<number>(initial?.maxInstallments ?? 1);
  const [s, setS] = useState<number>(initial?.dilutionSharePct ?? Math.max(minDilutionPct, 100));
  const [note, setNote] = useState(initial?.note ?? '');
  const [preview, setPreview] = useState<QuotePreview | null>(null);

  const cents = (() => {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? reaisToCents(n) : 0;
  })();

  // Preview ao vivo (calculado no servidor, com debounce).
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (cents <= 0) {
      setPreview(null);
      return;
    }
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      previewQuote({ baseValueCents: cents, maxInstallments: maxInst, dilutionSharePct: s }).then(setPreview);
    }, 300);
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [cents, maxInst, s]);

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await sendQuote(projectId, {
        baseValueCents: cents,
        maxInstallments: maxInst,
        dilutionSharePct: s,
        note: note.trim() || undefined,
      });
      if (!r.ok) return setError(r.error);
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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-charcoal">Seu valor pelo serviço (R$)</span>
        <input className={fld} type="number" inputMode="decimal" min={0} step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-charcoal">Aceita parcelar no cartão até</span>
        <select className={fld} value={maxInst} onChange={(e) => setMaxInst(Number(e.target.value))}>
          {installmentOptions.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? 'Só à vista (Pix/boleto)' : `${n}x`}
            </option>
          ))}
        </select>
      </label>

      {maxInst > 1 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-charcoal">Quanto da taxa do cartão você absorve</span>
            <span className="font-mono text-base text-brand-primary">{s}%</span>
          </div>
          <input type="range" min={minDilutionPct} max={100} step={1} value={s} onChange={(e) => setS(Number(e.target.value))} className="mt-2 w-full accent-brand-primary" />
          <p className="text-sm text-muted">Quanto mais você absorve, menos o cliente paga a mais — e você recebe um pouco menos.</p>
        </div>
      )}

      {preview && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-subtle bg-base p-4 sm:grid-cols-2">
          <Scenario title="À vista (Pix)" youGet={preview.avista.youGetCents} clientPays={preview.avista.clientPaysCents} />
          {preview.parcelado ? (
            <Scenario
              title={`Em ${preview.parcelado.n}x no cartão`}
              youGet={preview.parcelado.youGetCents}
              clientPays={preview.parcelado.clientPaysCents}
              installment={preview.parcelado.installmentCents}
              n={preview.parcelado.n}
            />
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-deep p-4 text-center text-sm text-muted">
              Você só aceita à vista.
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
