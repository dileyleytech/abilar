'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES, type Category } from '@abilar/shared';
import { CATEGORY_LABELS } from '@/lib/labels';
import { updateCarpenterServiceArea } from '@/lib/carpenter/actions';

/** Painel lateral: o marceneiro muda raio e categorias que atende; ao salvar, o
 *  feed é recalculado (router.refresh). O raio é debounced; categoria salva no toque. */
export function ServiceAreaPanel({
  city,
  radiusKm,
  categories,
}: {
  city: string;
  radiusKm: number;
  categories: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(radiusKm);
  const [cats, setCats] = useState<string[]>(categories);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (nextRadius: number, nextCats: string[]) =>
    start(async () => {
      setError(null);
      const r = await updateCarpenterServiceArea({ serviceRadiusKm: nextRadius, categories: nextCats });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });

  // Salva o raio com debounce enquanto arrasta.
  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  const onRadius = (v: number) => {
    setRadius(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => save(v, cats), 500);
  };

  const toggleCat = (c: string) => {
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    if (next.length === 0) {
      setError('Mantenha ao menos uma categoria.');
      return;
    }
    setCats(next);
    save(radius, next);
  };

  return (
    <section className="rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Seu atendimento</h2>
        {pending && <span className="text-xs text-muted">salvando…</span>}
      </div>

      <p className="mt-2 flex items-center gap-2 text-sm text-charcoal">
        📍 {city}
        <Link href="/marceneiro/perfil" className="text-xs font-medium text-brand-primary hover:underline">
          mudar endereço
        </Link>
      </p>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-charcoal">Raio de atendimento</span>
          <span className="font-mono text-base text-brand-primary">{radius} km</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={radius}
          onChange={(e) => onRadius(Number(e.target.value))}
          className="mt-2 w-full accent-brand-primary"
        />
      </div>

      <div className="mt-4">
        <span className="text-sm font-medium text-charcoal">O que você faz</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = cats.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCat(c)}
                aria-pressed={active}
                className={`rounded-pill px-3 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-brand-primary text-white' : 'bg-deep text-charcoal hover:bg-sand-deep'
                }`}
              >
                {CATEGORY_LABELS[c as Category]}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-ochre">{error}</p>}
      <p className="mt-3 text-xs text-muted">Os pedidos abaixo seguem sua cidade, raio e categorias.</p>
    </section>
  );
}
