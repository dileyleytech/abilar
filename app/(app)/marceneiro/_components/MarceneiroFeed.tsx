'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Category, ProjectStatus, QuoteStatus } from '@abilar/shared';
import {
  CATEGORY_LABELS,
  PROJECT_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_BADGE_SOLID,
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

function Thumb({ urls, badge }: { urls: string[]; badge?: React.ReactNode }) {
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-deep">
      {urls[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls[0]} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-3xl" aria-hidden>🛋️</span>
      )}
      {badge}
    </div>
  );
}

function Meta({ city, moduleCount, cats }: { city: string | null; moduleCount: number; cats: string[] }) {
  return (
    <>
      <p className="text-sm text-muted">
        📍 {city ?? '—'} · {moduleCount} {moduleCount === 1 ? 'móvel' : 'móveis'}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {cats.slice(0, 3).map((cat) => (
          <span key={cat} className="rounded-pill bg-deep px-2 py-0.5 text-xs font-medium text-charcoal">
            {CATEGORY_LABELS[cat as Category] ?? cat}
          </span>
        ))}
      </div>
    </>
  );
}

const cardCls =
  'flex gap-3 rounded-2xl border border-subtle bg-surface p-3 shadow-sm transition hover:border-brand-primary/40 hover:shadow-md';

export function MarceneiroFeed({ open, quoted }: { open: OpenCard[]; quoted: QuotedCard[] }) {
  const [search, setSearch] = useState('');
  const [qStatus, setQStatus] = useState<QuoteStatus | 'ALL'>('ALL');

  const availableStatuses = useMemo(() => [...new Set(quoted.map((q) => q.quoteStatus))], [quoted]);

  const openFiltered = useMemo(
    () => open.filter((o) => matches(search, o.title, o.city)),
    [open, search],
  );
  const quotedFiltered = useMemo(
    () =>
      quoted.filter(
        (q) => matches(search, q.title, q.city) && (qStatus === 'ALL' || q.quoteStatus === qStatus),
      ),
    [quoted, search, qStatus],
  );

  const chip = (active: boolean) =>
    `rounded-pill px-3 py-1 text-sm font-medium transition ${
      active ? 'bg-brand-primary text-white' : 'bg-deep text-charcoal hover:bg-sand-deep'
    }`;

  return (
    <div className="flex flex-col gap-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por título ou cidade…"
        className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Meus orçamentos */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-charcoal">
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
          {quoted.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-subtle bg-surface p-6 text-center text-muted">
              Você ainda não enviou orçamentos.
            </p>
          ) : quotedFiltered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-subtle bg-surface p-6 text-center text-muted">
              Nenhum orçamento com esses filtros.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {quotedFiltered.map((q) => {
                // Em negociação → abre a tela do orçamento (editar + conversar).
                // Pedido encerrado → cai no chat, se houver.
                const href =
                  q.projectStatus === 'OPEN_FOR_QUOTES' || q.projectStatus === 'IN_NEGOTIATION'
                    ? `/marceneiro/pedidos/${q.projectId}`
                    : q.conversationId
                      ? `/conversas/${q.conversationId}`
                      : null;
                const inner = (
                  <>
                    <Thumb
                      urls={q.photoUrls}
                      badge={
                        <span
                          className={`absolute left-1 top-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold shadow-sm ${QUOTE_STATUS_BADGE_SOLID[q.quoteStatus]}`}
                        >
                          {QUOTE_STATUS_LABEL[q.quoteStatus]}
                        </span>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-charcoal">{q.title}</h3>
                      <Meta city={q.city} moduleCount={q.moduleCount} cats={q.categories} />
                      <p className="mt-1 text-xs text-muted">Pedido: {PROJECT_STATUS_LABEL[q.projectStatus]}</p>
                      {q.conversationId && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-secondary">
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

        {/* Pedidos da região (abertos, sem orçamento meu ainda) */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-charcoal">
            Pedidos da sua região <span className="text-muted">({openFiltered.length})</span>
          </h2>
          {open.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-subtle bg-surface p-8 text-center text-muted">
              <span className="text-3xl" aria-hidden>📭</span>
              <p className="mt-2 font-medium text-charcoal">Nenhum pedido aberto agora</p>
              <p className="text-sm">Ajuste seu raio/categorias ao lado ou aguarde novos pedidos.</p>
            </div>
          ) : openFiltered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-subtle bg-surface p-6 text-center text-muted">
              Nenhum pedido com esses filtros.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {openFiltered.map((c) => (
                <li key={c.id}>
                  <Link href={`/marceneiro/pedidos/${c.id}`} className={cardCls}>
                    <Thumb
                      urls={c.photoUrls}
                      badge={
                        c.photoUrls.length > 1 ? (
                          <span className="absolute bottom-1 right-1 rounded-pill bg-charcoal/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                            📷 {c.photoUrls.length}
                          </span>
                        ) : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-charcoal">{c.title}</h3>
                      <Meta city={c.city} moduleCount={c.moduleCount} cats={c.categories} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
