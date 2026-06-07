'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { type ProjectStatus } from '@abilar/shared';
import { StatusBadge } from '@/components/StatusBadge';
import { CancelButton } from './CancelButton';

export type ProjectCard = {
  id: string;
  title: string;
  status: ProjectStatus;
  moduleCount: number;
  quoteCount: number;
  obraPct: number | null;
  coverUrl: string | null;
};

const isObra = (s: ProjectStatus) => s === 'HIRED' || s === 'EXECUTED';
// Só dá para cancelar antes de contratar.
const canCancel = (s: ProjectStatus) => s === 'DRAFT' || s === 'OPEN_FOR_QUOTES' || s === 'IN_NEGOTIATION';

export function PedidosList({ projects }: { projects: ProjectCard[] }) {
  const [tab, setTab] = useState<'pedidos' | 'obras'>('pedidos');
  const pedidos = useMemo(() => projects.filter((p) => !isObra(p.status)), [projects]);
  const obras = useMemo(() => projects.filter((p) => isObra(p.status)), [projects]);
  const list = tab === 'obras' ? obras : pedidos;

  const tabBtn = (active: boolean) =>
    `flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition sm:text-base ${
      active ? 'bg-brand-primary text-white shadow-sm' : 'bg-surface text-charcoal hover:bg-deep'
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-2xl border border-subtle bg-base p-1.5 sm:max-w-md">
        <button type="button" onClick={() => setTab('pedidos')} className={tabBtn(tab === 'pedidos')}>
          📋 Pedidos <span className={tab === 'pedidos' ? 'text-white/80' : 'text-muted'}>({pedidos.length})</span>
        </button>
        <button type="button" onClick={() => setTab('obras')} className={tabBtn(tab === 'obras')}>
          🏗️ Obras <span className={tab === 'obras' ? 'text-white/80' : 'text-muted'}>({obras.length})</span>
        </button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center text-muted">
          {tab === 'obras' ? 'Nenhuma obra em andamento ainda.' : 'Nenhum pedido aqui.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <li key={p.id} className="group relative">
              <Link
                href={`/pedidos/${p.id}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-deep">
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-5xl" aria-hidden>🛋️</span>
                  )}
                  <span className="absolute right-2 top-2">
                    <StatusBadge status={p.status} />
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-charcoal">{p.title}</h2>
                  <p className="text-sm text-muted">
                    {p.moduleCount} {p.moduleCount === 1 ? 'móvel' : 'móveis'}
                  </p>
                  {p.obraPct != null ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-brand-primary">
                        <span>🏗️ {p.obraPct === 100 ? 'Obra concluída' : 'Em obra'}</span>
                        <span>{p.obraPct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-deep">
                        <div className="h-full rounded-full bg-brand-primary" style={{ width: `${p.obraPct}%` }} />
                      </div>
                    </div>
                  ) : (
                    p.quoteCount > 0 && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-pill bg-brand-secondary/15 px-2.5 py-1 text-xs font-semibold text-brand-secondary">
                        💬 {p.quoteCount} {p.quoteCount === 1 ? 'orçamento recebido' : 'orçamentos recebidos'}
                      </span>
                    )
                  )}
                </div>
              </Link>
              {canCancel(p.status) && (
                <div className="absolute bottom-3 right-3">
                  <CancelButton projectId={p.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
