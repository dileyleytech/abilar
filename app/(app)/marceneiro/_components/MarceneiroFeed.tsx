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

function Cover({ urls, children }: { urls: string[]; children?: React.ReactNode }) {
  return (
    <div className="relative flex aspect-[4/3] items-center justify-center bg-deep">
      {urls[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urls[0]} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-5xl" aria-hidden>🛋️</span>
      )}
      {children}
    </div>
  );
}

function CatTags({ cats }: { cats: string[] }) {
  return (
    <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
      {cats.slice(0, 3).map((cat) => (
        <span key={cat} className="rounded-pill bg-deep px-2.5 py-0.5 text-xs font-medium text-charcoal">
          {CATEGORY_LABELS[cat as Category] ?? cat}
        </span>
      ))}
    </div>
  );
}

const card = 'flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md';
const gridCls = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';
const searchCls = 'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export function MarceneiroFeed({ open, quoted }: { open: OpenCard[]; quoted: QuotedCard[] }) {
  const [tab, setTab] = useState<'open' | 'quoted'>('open');
  const [search, setSearch] = useState('');
  const [qStatus, setQStatus] = useState<QuoteStatus | 'ALL'>('ALL');

  const availableStatuses = useMemo(() => [...new Set(quoted.map((q) => q.quoteStatus))], [quoted]);
  const openFiltered = useMemo(() => open.filter((o) => matches(search, o.title, o.city)), [open, search]);
  const quotedFiltered = useMemo(
    () =>
      quoted.filter(
        (q) => matches(search, q.title, q.city) && (qStatus === 'ALL' || q.quoteStatus === qStatus),
      ),
    [quoted, search, qStatus],
  );

  const tabBtn = (active: boolean) =>
    `flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition sm:text-base ${
      active ? 'bg-brand-primary text-white shadow-sm' : 'bg-surface text-charcoal hover:bg-deep'
    }`;
  const chip = (active: boolean) =>
    `rounded-pill px-3 py-1 text-sm font-medium transition ${
      active ? 'bg-brand-primary text-white' : 'bg-deep text-charcoal hover:bg-sand-deep'
    }`;

  return (
    <div className="flex flex-col gap-4">
      {/* Abas grandes */}
      <div className="flex gap-2 rounded-2xl border border-subtle bg-base p-1.5">
        <button type="button" onClick={() => setTab('open')} className={tabBtn(tab === 'open')}>
          🛎️ Novos pedidos <span className={tab === 'open' ? 'text-white/80' : 'text-muted'}>({open.length})</span>
        </button>
        <button type="button" onClick={() => setTab('quoted')} className={tabBtn(tab === 'quoted')}>
          📋 Meus orçamentos <span className={tab === 'quoted' ? 'text-white/80' : 'text-muted'}>({quoted.length})</span>
        </button>
      </div>

      {/* Busca (só quando há itens na aba) */}
      {((tab === 'open' && open.length > 0) || (tab === 'quoted' && quoted.length > 0)) && (
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título ou cidade…" className={searchCls} />
      )}

      {/* NOVOS PEDIDOS */}
      {tab === 'open' &&
        (open.length === 0 ? (
          <Empty
            icon="📭"
            title="Nenhum pedido novo agora"
            hint="Aumente seu raio ou adicione categorias em “Ajustar” acima — assim mais pedidos aparecem aqui."
          />
        ) : openFiltered.length === 0 ? (
          <Empty icon="🔎" title="Nada com essa busca" hint="Tente outro termo." />
        ) : (
          <ul className={gridCls}>
            {openFiltered.map((c) => (
              <li key={c.id}>
                <Link href={`/marceneiro/pedidos/${c.id}`} className={card}>
                  <Cover urls={c.photoUrls}>
                    {c.photoUrls.length > 1 && (
                      <span className="absolute bottom-2 right-2 rounded-pill bg-charcoal/70 px-2 py-0.5 text-xs font-medium text-white">
                        📷 {c.photoUrls.length}
                      </span>
                    )}
                  </Cover>
                  <div className="flex flex-1 flex-col gap-1 p-4">
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
        ))}

      {/* MEUS ORÇAMENTOS */}
      {tab === 'quoted' &&
        (quoted.length === 0 ? (
          <Empty
            icon="📋"
            title="Você ainda não enviou orçamentos"
            hint="Quando você orçar um pedido, ele aparece aqui — com o status e o chat com o cliente."
            action={
              <button type="button" onClick={() => setTab('open')} className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white">
                Ver novos pedidos
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {availableStatuses.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setQStatus('ALL')} className={chip(qStatus === 'ALL')}>Todos</button>
                {availableStatuses.map((s) => (
                  <button key={s} type="button" onClick={() => setQStatus(s)} className={chip(qStatus === s)}>{QUOTE_STATUS_LABEL[s]}</button>
                ))}
              </div>
            )}
            {quotedFiltered.length === 0 ? (
              <Empty icon="🔎" title="Nada com esses filtros" hint="Tente outro termo ou status." />
            ) : (
              <ul className={gridCls}>
                {quotedFiltered.map((q) => {
                  // Abre a tela do pedido (orçamento se em negociação; obra se contratado).
                  const href = `/marceneiro/pedidos/${q.projectId}`;
                  const inner = (
                    <>
                      <Cover urls={q.photoUrls}>
                        <span className={`absolute left-2 top-2 rounded-pill px-2.5 py-0.5 text-xs font-semibold shadow-sm ${QUOTE_STATUS_BADGE_SOLID[q.quoteStatus]}`}>
                          {QUOTE_STATUS_LABEL[q.quoteStatus]}
                        </span>
                        {q.conversationId && (
                          <span className="absolute bottom-2 right-2 rounded-pill bg-brand-secondary px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                            💬 Chat
                          </span>
                        )}
                      </Cover>
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <h3 className="text-lg font-semibold text-charcoal">{q.title}</h3>
                        <p className="text-sm text-muted">
                          📍 {q.city ?? '—'} · {q.moduleCount} {q.moduleCount === 1 ? 'móvel' : 'móveis'}
                        </p>
                        <p className="text-xs text-muted">Pedido: {PROJECT_STATUS_LABEL[q.projectStatus]}</p>
                        <CatTags cats={q.categories} />
                      </div>
                    </>
                  );
                  return (
                    <li key={q.projectId}>
                      {href ? (
                        <Link href={href} className={card}>{inner}</Link>
                      ) : (
                        <div className={`${card} opacity-80`}>{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}

function Empty({ icon, title, hint, action }: { icon: string; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-subtle bg-surface p-12 text-center">
      <span className="text-4xl" aria-hidden>{icon}</span>
      <p className="text-lg font-semibold text-charcoal">{title}</p>
      <p className="max-w-md text-muted">{hint}</p>
      {action}
    </div>
  );
}
