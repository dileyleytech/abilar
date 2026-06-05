'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectLocation } from '@/lib/projects/actions';

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export function ProjectLocation({
  projectId,
  city: initialCity,
  cep: initialCep,
  editable,
}: {
  projectId: string;
  city: string | null;
  cep: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [cep, setCep] = useState(initialCep ?? '');
  const [city, setCity] = useState(initialCity ?? '');
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const onCepChange = (raw: string) => {
    setCep(raw);
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return setCepStatus('idle');
    setCepStatus('loading');
    fetch(`/api/cep?cep=${digits}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          if (d.city) setCity(d.city);
          if (typeof d.lat === 'number' && typeof d.lng === 'number') setLoc({ lat: d.lat, lng: d.lng });
          setCepStatus('idle');
        } else setCepStatus('error');
      })
      .catch(() => setCepStatus('error'));
  };

  const save = () =>
    start(async () => {
      setError(null);
      const r = await updateProjectLocation(projectId, {
        city: city.trim(),
        cep: cep.trim() || undefined,
        lat: loc?.lat,
        lng: loc?.lng,
      });
      if (!r.ok) return setError(r.error);
      setOpen(false);
      router.refresh();
    });

  return (
    <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-charcoal">Local da obra</h2>
        {editable && !open && (
          <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-brand-primary hover:underline">
            Editar
          </button>
        )}
      </div>

      {!open ? (
        <p className="mt-2 text-base text-charcoal">
          {initialCity ? (
            <>
              📍 {initialCity}
              {initialCep ? <span className="text-muted"> · {initialCep}</span> : null}
            </>
          ) : (
            <span className="text-ochre">Sem cidade — os marceneiros não veem este pedido. Adicione o CEP.</span>
          )}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-charcoal">CEP da obra</span>
            <input className={fld} inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => onCepChange(e.target.value)} />
          </label>
          {cepStatus === 'loading' && <p className="text-sm text-muted">Buscando endereço…</p>}
          {cepStatus === 'error' && <p className="text-sm text-ochre">CEP não encontrado.</p>}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-charcoal">Cidade</span>
            <input className={fld} placeholder="Preenche pelo CEP" value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={pending || city.trim().length < 2} className="flex-1 rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-50">
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-subtle px-4 py-3 text-base text-charcoal hover:bg-deep">
              Cancelar
            </button>
          </div>
          {error && <p className="rounded-lg bg-ochre/20 px-3 py-2 text-sm text-charcoal">{error}</p>}
        </div>
      )}
    </section>
  );
}
