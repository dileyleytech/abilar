'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { type ProjectStatus } from '@abilar/shared';
import { StatusBadge } from '@/components/StatusBadge';
import { IconPedidos, IconConstrucao, IconConversas } from '@/components/ui/icons';
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
  const comOrcamento = useMemo(() => pedidos.filter((p) => p.quoteCount > 0), [pedidos]);
  const aguardando = useMemo(() => pedidos.filter((p) => p.quoteCount === 0), [pedidos]);

  const tabBtn = (active: boolean) =>
    `flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition sm:text-base ${
      active ? 'bg-brand-primary text-white shadow-sm' : 'bg-surface text-charcoal hover:bg-deep'
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-2xl border border-subtle bg-base p-1.5 sm:max-w-md">
        <button type="button" onClick={() => setTab('pedidos')} className={`${tabBtn(tab === 'pedidos')} inline-flex items-center justify-center gap-1.5`}>
          <IconPedidos size={18} aria-hidden /> Pedidos <span className={tab === 'pedidos' ? 'text-white/80' : 'text-muted'}>({pedidos.length})</span>
        </button>
        <button type="button" onClick={() => setTab('obras')} className={`${tabBtn(tab === 'obras')} inline-flex items-center justify-center gap-1.5`}>
          <IconConstrucao size={18} aria-hidden /> Obras <span className={tab === 'obras' ? 'text-white/80' : 'text-muted'}>({obras.length})</span>
        </button>
      </div>

      {tab === 'obras' ? (
        obras.length === 0 ? (
          <Empty>Nenhuma obra em andamento ainda.</Empty>
        ) : (
          <Grid projects={obras} />
        )
      ) : pedidos.length === 0 ? (
        <Empty>Nenhum pedido aqui.</Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {comOrcamento.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-charcoal">
                <IconConversas size={20} aria-hidden /> Com orçamentos
                <span className="rounded-pill bg-brand-secondary/15 px-2 py-0.5 text-sm font-semibold text-brand-secondary">
                  {comOrcamento.length}
                </span>
              </h2>
              <Grid projects={comOrcamento} />
            </section>
          )}
          {aguardando.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-charcoal">
                Aguardando orçamentos <span className="text-muted">({aguardando.length})</span>
              </h2>
              <Grid projects={aguardando} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-surface p-10 text-center text-muted shadow-sm">{children}</p>
  );
}

function Grid({ projects }: { projects: ProjectCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((p) => (
        <li key={p.id} className="group relative">
          <Link
            href={`/pedidos/${p.id}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-transparent bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md"
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
              <h3 className="text-lg font-semibold text-charcoal">{p.title}</h3>
              <p className="text-sm text-muted">
                {p.moduleCount} {p.moduleCount === 1 ? 'móvel' : 'móveis'}
              </p>
              {p.obraPct != null ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-brand-primary">
                    <span className="inline-flex items-center gap-1"><IconConstrucao size={16} aria-hidden /> {p.obraPct === 100 ? 'Obra concluída' : 'Em obra'}</span>
                    <span>{p.obraPct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-deep">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: `${p.obraPct}%` }} />
                  </div>
                </div>
              ) : (
                p.quoteCount > 0 && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-pill bg-brand-secondary/15 px-2.5 py-1 text-xs font-semibold text-brand-secondary">
                    <IconConversas size={14} aria-hidden /> {p.quoteCount} {p.quoteCount === 1 ? 'orçamento' : 'orçamentos'}
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
  );
}
