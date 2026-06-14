import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconVoltar, IconAvancar } from '@/components/icons';
import { color, radius, space } from '@/theme';

export type CalEvent = {
  id: string;
  title: string;
  kind: 'platform' | 'external';
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  projectId?: string;
};

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const NUM_H = 22;
const LANE_H = 18;
const LANE_GAP = 2;

const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

type Seg = CalEvent & { colStart: number; span: number; lane: number };

/**
 * Calendário mensal (espelha o web) — barras que atravessam os dias.
 * Mostra sobreposição de obras (cheio) e folgas (pode pegar projeto novo).
 */
export function AgendaCalendar({ events, onEventPress }: { events: CalEvent[]; onEventPress?: (e: CalEvent) => void }) {
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
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)));
  }, [view]);

  const goMonth = (delta: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  const goToday = () => setView(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{MONTHS[view.getMonth()]} {view.getFullYear()}</Text>
        <View style={styles.nav}>
          <Pressable onPress={() => goMonth(-1)} hitSlop={8} style={styles.navBtn}><IconVoltar size={18} color={color.text.muted} strokeWidth={2} /></Pressable>
          <Pressable onPress={goToday} hitSlop={8} style={styles.todayBtn}><Text style={styles.todayText}>Hoje</Text></Pressable>
          <Pressable onPress={() => goMonth(1)} hitSlop={8} style={styles.navBtn}><IconAvancar size={18} color={color.text.muted} strokeWidth={2} /></Pressable>
        </View>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((days, wi) => {
          const weekStart = days[0]!;
          const weekEnd = days[6]!;

          const segs: Seg[] = evs
            .flatMap((e) => {
              const segS = e.s < weekStart ? weekStart : e.s;
              const segE = e.en > weekEnd ? weekEnd : e.en;
              if (segE < weekStart || segS > weekEnd) return [];
              return [{ ...e, colStart: dayDiff(weekStart, segS) + 1, span: dayDiff(segS, segE) + 1, lane: 0 }];
            })
            .sort((a, b) => a.colStart - b.colStart || b.span - a.span);

          const laneEnd: number[] = [];
          for (const seg of segs) {
            let lane = 0;
            while (laneEnd[lane] != null && laneEnd[lane]! >= seg.colStart) lane++;
            laneEnd[lane] = seg.colStart + seg.span - 1;
            seg.lane = lane;
          }
          const laneCount = Math.max(laneEnd.length, 1);
          const weekHeight = NUM_H + laneCount * (LANE_H + LANE_GAP) + 4;

          return (
            <View key={wi} style={[styles.week, { height: weekHeight }]}>
              {/* Grade de fundo (colunas dos dias) */}
              <View style={styles.bgRow} pointerEvents="none">
                {days.map((d, di) => (
                  <View key={di} style={[styles.bgCell, d.getMonth() !== view.getMonth() && styles.bgCellOut]} />
                ))}
              </View>

              {/* Números dos dias */}
              <View style={styles.numRow}>
                {days.map((d, di) => {
                  const inMonth = d.getMonth() === view.getMonth();
                  const isToday = sameDay(d, today);
                  return (
                    <View key={di} style={styles.numCell}>
                      <View style={[styles.numChip, isToday && styles.numChipToday]}>
                        <Text style={[styles.numText, isToday ? styles.numTextToday : !inMonth && styles.numTextOut]}>{d.getDate()}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Barras dos eventos (uma linha por lane) */}
              {Array.from({ length: laneCount }, (_, lane) => {
                const laneSegs = segs.filter((s) => s.lane === lane).sort((a, b) => a.colStart - b.colStart);
                let cursor = 0; // colunas já consumidas (0-based)
                const parts: React.ReactNode[] = [];
                laneSegs.forEach((s) => {
                  const gap = s.colStart - 1 - cursor;
                  if (gap > 0) parts.push(<View key={`g${s.id}`} style={{ flex: gap }} />);
                  parts.push(
                    <Pressable
                      key={s.id}
                      style={{ flex: s.span }}
                      onPress={onEventPress ? () => onEventPress(s) : undefined}
                    >
                      <View style={[styles.bar, s.kind === 'platform' ? styles.barPlatform : styles.barExternal]}>
                        <Text numberOfLines={1} style={styles.barText}>{s.title}</Text>
                      </View>
                    </Pressable>,
                  );
                  cursor = s.colStart - 1 + s.span;
                });
                if (cursor < 7) parts.push(<View key="tail" style={{ flex: 7 - cursor }} />);
                return (
                  <View key={lane} style={[styles.laneRow, { top: NUM_H + lane * (LANE_H + LANE_GAP) }]}>
                    {parts}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color.brand.primary }]} /><Text style={styles.legendText}>Obra da plataforma</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color.brand.secondary }]} /><Text style={styles.legendText}>Obra externa</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  monthLabel: { fontSize: 17, fontWeight: '600', color: color.text.primary },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navBtn: { padding: 6, borderRadius: radius.md },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md },
  todayText: { fontSize: 13, fontWeight: '600', color: color.text.primary },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: color.text.subtle, paddingBottom: 4 },
  grid: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, overflow: 'hidden' },
  week: { position: 'relative' },
  bgRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  bgCell: { flex: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: color.border.subtle },
  bgCellOut: { backgroundColor: 'rgba(31,36,33,0.03)' },
  numRow: { flexDirection: 'row', height: NUM_H },
  numCell: { flex: 1, alignItems: 'center', paddingTop: 2 },
  numChip: { height: 18, minWidth: 18, paddingHorizontal: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  numChipToday: { backgroundColor: color.brand.primary },
  numText: { fontSize: 11, color: color.text.primary },
  numTextToday: { color: '#fff', fontWeight: '700' },
  numTextOut: { color: color.text.subtle },
  laneRow: { position: 'absolute', left: 0, right: 0, height: LANE_H, flexDirection: 'row', paddingHorizontal: 1 },
  bar: { flex: 1, height: LANE_H, borderRadius: 4, justifyContent: 'center', paddingHorizontal: 5, marginHorizontal: 1 },
  barPlatform: { backgroundColor: color.brand.primary },
  barExternal: { backgroundColor: color.brand.secondary },
  barText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  legend: { flexDirection: 'row', gap: space.lg, marginTop: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, color: color.text.muted },
});
