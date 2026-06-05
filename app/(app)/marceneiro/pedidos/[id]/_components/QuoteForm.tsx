'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reaisToCents, formatBRL } from '@abilar/shared';
import { quotePricing, maxClientInstallments, type PricingConfig } from '@abilar/pricing';
import { sendQuote, withdrawQuote } from '@/lib/quotes/actions';

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
  config,
  initial,
}: {
  projectId: string;
  config: PricingConfig;
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

  const [valor, setValor] = useState(initial?.baseValueReais ?? '');
  const [maxInst, setMaxInst] = useState<number>(initial?.maxInstallments ?? 1);
  const [s, setS] = useState<number>(initial?.dilutionSharePct ?? Math.max(minS, 100));
  const [note, setNote] = useState(initial?.note ?? '');

  const valorNum = Number(valor) || 0;
  const cents = valorNum > 0 ? reaisToCents(valorNum) : 0;

  // A faixa do slider de valor cresce conforme o valor digitado (passo R$ 500).
  const sliderMax = useMemo(() => Math.max(50000, Math.ceil(valorNum / 50000) * 50000), [valorNum]);

  // Preview ao vivo — cálculo INSTANTÂNEO no client (motor puro).
  // O cliente SEMPRE parcela em até `systemMax`; o N do marceneiro é só o teto
  // do subsídio (interno). Sem subsídio (maxInst = 1), o cliente paga a taxa cheia.
  const preview = useMemo(() => {
    if (cents <= 0) return null;
    const subsidizes = maxInst > 1;
    const sEff = subsidizes ? s : 0;
    const avista = quotePricing({ baseValueCents: cents, config, installments: 1, method: 'PIX', carpenterDilutionSharePct: sEff });
    const parc =
      systemMax > 1
        ? quotePricing({
            baseValueCents: cents,
            config,
            installments: subsidizes ? maxInst : 1,
            clientInstallments: systemMax,
            method: 'CARD',
            carpenterDilutionSharePct: sEff,
          })
        : null;
    return { avista, parc, subsidizes };
  }, [cents, maxInst, s, config, systemMax]);

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
      // Enviou/atualizou o orçamento → volta para a lista de pedidos da região.
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

      {/* Valor: barra + campo, atualizam ao vivo */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-charcoal">Seu valor pelo serviço</span>
          <span className="font-mono text-lg font-bold text-brand-primary">{cents > 0 ? formatBRL(cents) : 'R$ 0,00'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={500}
          value={Math.min(valorNum, sliderMax)}
          onChange={(e) => setValor(e.target.value)}
          className="mt-2 w-full accent-brand-primary"
        />
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted">Ou digite:</span>
          <input className={`${fld} max-w-40`} type="number" inputMode="decimal" min={0} step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
      </div>

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
