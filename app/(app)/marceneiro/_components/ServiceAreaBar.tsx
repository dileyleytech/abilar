'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES, type Category } from '@abilar/shared';
import { CATEGORY_LABELS } from '@/lib/labels';
import { updateCarpenterServiceArea } from '@/lib/carpenter/actions';

/** Faixa fina de "atendimento": resumo em linguagem simples + "Ajustar" que abre
 *  a edição inline (raio + categorias). Ao salvar, o feed é recalculado. */
export function ServiceAreaBar({
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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(radiusKm);
  const [cats, setCats] = useState<string[]>(categories);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  const save = (nextRadius: number, nextCats: string[]) =>
    start(async () => {
      setError(null);
      const r = await updateCarpenterServiceArea({ serviceRadiusKm: nextRadius, categories: nextCats });
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  const onRadius = (v: number) => {
    setRadius(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => save(v, cats), 500);
  };
  const toggleCat = (c: string) => {
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    if (next.length === 0) return setError('Mantenha ao menos uma categoria.');
    setCats(next);
    save(radius, next);
  };

  const catNames = cats.map((c) => CATEGORY_LABELS[c as Category] ?? c).join(', ');

  return (
    <section className="rounded-2xl border border-subtle bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-charcoal sm:text-base">
          <span className="text-muted">Você atende: </span>
          <span className="font-semibold">{city}</span> e até <span className="font-semibold">{radius} km</span>
          <span className="text-muted"> · {catNames || 'nenhuma categoria'}</span>
        </p>
        <div className="flex items-center gap-2">
          {pending && <span className="text-xs text-muted">salvando…</span>}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-subtle px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-deep"
          >
            {open ? 'Pronto' : 'Ajustar'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-subtle pt-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-charcoal">Até onde você vai (raio)</span>
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
            <p className="text-xs text-muted">A partir de {city}. Quanto maior, mais pedidos aparecem.</p>
          </div>

          <div>
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

          {error && <p className="text-sm text-ochre">{error}</p>}
          <Link href="/marceneiro/perfil" className="text-sm font-medium text-brand-primary hover:underline">
            Mudar cidade/endereço →
          </Link>
        </div>
      )}
    </section>
  );
}
