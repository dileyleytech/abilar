'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { IconVoltar, IconAvancar } from '@/components/ui/icons';

export type CalEvent = {
  id: string;
  title: string;
  kind: 'platform' | 'external';
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  href?: string;
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

type Segment = CalEvent & { colStart: number; span: number; lane: number };

/**
 * Calendário mensal (estilo Google Calendar) com barras que atravessam os dias.
 * Ajuda o marceneiro a ver sobreposição de obras (está cheio) e folgas (pode
 * pegar projeto novo). Eventos sem prazo não aparecem aqui (ficam na lista).
 */
export function AgendaCalendar({ events }: { events: CalEvent[] }) {
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const evs = useMemo(
    () =>
      events.map((e) => {
        const s = parseYMD(e.start);
        let en = parseYMD(e.end);
        if (en < s) en = s;
        return { ...e, s, en };
      }),
    [events],
  );

  const weeks = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const gridStart = addDays(first, -first.getDay());
    return Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)),
    );
  }, [view]);

  const goMonth = (delta: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  const goToday = () => setView(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-h3 font-semibold capitalize text-charcoal">
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goMonth(-1)} aria-label="Mês anterior" className="rounded-md p-2 text-muted transition hover:bg-deep hover:text-charcoal">
            <IconVoltar size={18} />
          </button>
          <button type="button" onClick={goToday} className="rounded-md px-3 py-1.5 text-small font-semibold text-charcoal transition hover:bg-deep">
            Hoje
          </button>
          <button type="button" onClick={() => goMonth(1)} aria-label="Próximo mês" className="rounded-md p-2 text-muted transition hover:bg-deep hover:text-charcoal">
            <IconAvancar size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-caption font-semibold uppercase text-subtle">{d}</div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border-l border-t border-subtle">
        {weeks.map((days, wi) => {
          const weekStart = days[0]!;
          const weekEnd = days[6]!;

          const segs: Segment[] = evs
            .flatMap((e) => {
              const segS = e.s < weekStart ? weekStart : e.s;
              const segE = e.en > weekEnd ? weekEnd : e.en;
              if (segE < weekStart || segS > weekEnd) return [];
              return [{
                ...e,
                colStart: dayDiff(weekStart, segS) + 1,
                span: dayDiff(segS, segE) + 1,
                lane: 0,
              }];
            })
            .sort((a, b) => a.colStart - b.colStart || b.span - a.span);

          // Empacota em "faixas" (lanes) para barras que coexistem não se sobreporem.
          const laneEnd: number[] = [];
          for (const seg of segs) {
            let lane = 0;
            while (laneEnd[lane] != null && laneEnd[lane]! >= seg.colStart) lane++;
            laneEnd[lane] = seg.colStart + seg.span - 1;
            seg.lane = lane;
          }
          const laneCount = Math.max(laneEnd.length, 1);

          return (
            <div
              key={wi}
              className="relative grid grid-cols-7"
              style={{ gridAutoRows: '22px', minHeight: 30 + laneCount * 24 }}
            >
              {days.map((d, di) => {
                const inMonth = d.getMonth() === view.getMonth();
                const isToday = sameDay(d, today);
                return (
                  <div
                    key={di}
                    className={`border-b border-r border-subtle p-1 ${inMonth ? '' : 'bg-base/50'}`}
                    style={{ gridColumn: di + 1, gridRow: '1 / -1' }}
                  >
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-caption ${
                        isToday ? 'bg-brand-primary font-bold text-white' : inMonth ? 'text-charcoal' : 'text-subtle'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}

              {segs.map((seg) => {
                const bar = (
                  <span
                    className={`block h-[20px] truncate rounded px-1.5 text-caption font-medium leading-[20px] text-white ${
                      seg.kind === 'platform' ? 'bg-brand-primary' : 'bg-brand-secondary'
                    }`}
                    title={seg.title}
                  >
                    {seg.title}
                  </span>
                );
                return (
                  <div
                    key={`${seg.id}-${wi}`}
                    className="z-10 px-0.5"
                    style={{ gridColumn: `${seg.colStart} / span ${seg.span}`, gridRow: seg.lane + 2 }}
                  >
                    {seg.href ? <Link href={seg.href}>{bar}</Link> : bar}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-caption text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-primary" /> Obra da plataforma</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-secondary" /> Obra externa</span>
      </div>
    </div>
  );
}
