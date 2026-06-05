'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Category, ProjectStatus, QuoteStatus } from '@abilar/shared';
import {
  CATEGORY_LABELS,
  PROJECT_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_BADGE,
} from '@/lib/labels';

export type OpenCard = {
  id: string;
  title: string;
  city: string | null;
  moduleCount: number;
  categories: string[];
  photoUrls: string[];
};

export type QuotedCard = {
  projectId: string;
  title: string;
  city: string | null;
  moduleCount: number;
  categories: string[];
  photoUrls: string[];
  quoteStatus: QuoteStatus;
  projectStatus: ProjectStatus;
  conversationId: string | null;
};

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const matches = (q: string, ...fields: (string | null)[]) =>
  !q || fields.some((f) => f && norm(f).includes(norm(q)));
const catMatch = (sel: Set<string>, cats: string[]) => sel.size === 0 || cats.some((c) => sel.has(c));

function Thumb({ urls }: { urls: string[] }) {
  return (
    <div className="relative flex aspect-[4/3] items-center justify-center bg-deep">
      {urls[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls[0]} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-5xl" aria-hidden>🛋️</span>
      )}
      {urls.length > 1 && (
        <span className="absolute bottom-2 right-2 rounded-pill bg-charcoal/70 px-2 py-0.5 text-xs font-medium text-white">
          📷 {urls.length}
        </span>
      )}
    </div>
  );
}

function CatTags({ cats }: { cats: string[] }) {
  return (
    <div className="mt-auto flex flex-wrap gap-1.5">
      {cats.map((cat) => (
        <span key={cat} className="rounded-pill bg-deep px-2.5 py-0.5 text-xs font-medium text-charcoal">
          {CATEGORY_LABELS[cat as Category] ?? cat}
        </span>
      ))}
    </div>
  );
}

const cardCls =
  'flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md';

export function MarceneiroFeed({
  open,
  quoted,
  serviceCategories,
}: {
  open: OpenCard[];
  quoted: QuotedCard[];
  serviceCategories: string[];
}) {
  const [search, setSearch] = useState('');
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [qStatus, setQStatus] = useState<QuoteStatus | 'ALL'>('ALL');

  // Categorias disponíveis para filtrar: as que o marceneiro atende.
  const availableCats = serviceCategories;
  // Status presentes nos orçamentos enviados (para os chips de status).
  const availableStatuses = useMemo(
    () => [...new Set(quoted.map((q) => q.quoteStatus))],
    [quoted],
  );

  const openFiltered = useMemo(
    () => open.filter((o) => matches(search, o.title, o.city) && catMatch(cats, o.categories)),
    [open, search, cats],
  );
  const quotedFiltered = useMemo(
    () =>
      quoted.filter(
        (q) =>
          matches(search, q.title, q.city) &&
          catMatch(cats, q.categories) &&
          (qStatus === 'ALL' || q.quoteStatus === qStatus),
      ),
    [quoted, search, cats, qStatus],
  );

  const toggleCat = (c: string) =>
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const chip = (active: boolean) =>
    `rounded-pill px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-brand-primary text-white' : 'bg-deep text-charcoal hover:bg-sand-deep'
    }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-subtle bg-surface p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou cidade…"
          className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {availableCats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableCats.map((c) => (
              <button key={c} type="button" onClick={() => toggleCat(c)} className={chip(cats.has(c))}>
                {CATEGORY_LABELS[c as Category] ?? c}
              </button>
            ))}
            {cats.size > 0 && (
              <button type="button" onClick={() => setCats(new Set())} className="px-2 py-1.5 text-sm text-muted hover:text-charcoal">
                limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meus orçamentos */}
      {quoted.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-charcoal">
            Meus orçamentos <span className="text-muted">({quotedFiltered.length})</span>
          </h2>
          {availableStatuses.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setQStatus('ALL')} className={chip(qStatus === 'ALL')}>
                Todos
              </button>
              {availableStatuses.map((s) => (
                <button key={s} type="button" onClick={() => setQStatus(s)} className={chip(qStatus === s)}>
                  {QUOTE_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
          {quotedFiltered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-subtle bg-surface p-6 text-center text-muted">
              Nenhum orçamento com esses filtros.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quotedFiltered.map((q) => {
                const href = q.conversationId
                  ? `/conversas/${q.conversationId}`
                  : q.projectStatus === 'OPEN_FOR_QUOTES'
                    ? `/marceneiro/pedidos/${q.projectId}`
                    : null;
                const inner = (
                  <>
                    <div className="relative">
                      <Thumb urls={q.photoUrls} />
                      <span
                        className={`absolute left-2 top-2 rounded-pill px-2.5 py-0.5 text-xs font-semibold shadow-sm ${QUOTE_STATUS_BADGE[q.quoteStatus]}`}
                      >
                        {QUOTE_STATUS_LABEL[q.quoteStatus]}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <h3 className="text-lg font-semibold text-charcoal">{q.title}</h3>
                      <p className="text-sm text-muted">
                        📍 {q.city ?? '—'} · {q.moduleCount} {q.moduleCount === 1 ? 'móvel' : 'móveis'}
                      </p>
                      <p className="text-xs text-muted">Pedido: {PROJECT_STATUS_LABEL[q.projectStatus]}</p>
                      <CatTags cats={q.categories} />
                      {q.conversationId && (
                        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-pill bg-brand-secondary/15 px-2.5 py-1 text-xs font-semibold text-brand-secondary">
                          💬 Chat liberado
                        </span>
                      )}
                    </div>
                  </>
                );
                return (
                  <li key={q.projectId}>
                    {href ? (
                      <Link href={href} className={cardCls}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={`${cardCls} opacity-80`}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Pedidos da região (abertos, sem orçamento meu ainda) */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-charcoal">
          Pedidos da sua região <span className="text-muted">({openFiltered.length})</span>
        </h2>
        {open.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
            <span className="text-3xl" aria-hidden>📭</span>
            <p className="mt-2 font-medium text-charcoal">Nenhum pedido aberto agora</p>
            <p>Assim que aparecer um pedido na sua cidade/raio e categoria, ele surge aqui.</p>
          </div>
        ) : openFiltered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-subtle bg-surface p-6 text-center text-muted">
            Nenhum pedido com esses filtros.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openFiltered.map((c) => (
              <li key={c.id}>
                <Link href={`/marceneiro/pedidos/${c.id}`} className={cardCls}>
                  <Thumb urls={c.photoUrls} />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-lg font-semibold text-charcoal">{c.title}</h3>
                    <p className="text-sm text-muted">
                      📍 {c.city ?? '—'} · {c.moduleCount} {c.moduleCount === 1 ? 'móvel' : 'móveis'}
                    </p>
                    <CatTags cats={c.categories} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
