import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { getProject, listMilestones, type MilestoneRow, type ProjectRow } from '@/lib/data';
import { api } from '@/lib/api';
import { MILESTONE_STATUS_LABEL, PROJECT_STATUS_LABEL } from '@/lib/types';
import { formatCents } from '@/lib/format';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

function badgeTone(status: MilestoneRow['status']) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'DONE') return 'primary' as const;
  if (status === 'IN_PROGRESS') return 'warn' as const;
  return 'neutral' as const;
}

export default function PedidoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isClient = profile && project ? profile.role === 'CLIENT' : false;
  const isCarpenter = profile?.role === 'CARPENTER';

  const load = useCallback(async () => {
    if (!id) return;
    const [p, ms] = await Promise.all([getProject(id), listMilestones(id)]);
    setProject(p);
    setMilestones(ms);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const act = async (fn: () => Promise<unknown>, mid: string) => {
    setBusyId(mid);
    try {
      await fn();
      await load();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusyId(null);
    }
  };

  if (!project || milestones === null) return <Loading label="Carregando pedido…" />;

  const approvedPct = milestones.filter((m) => m.status === 'APPROVED').reduce((a, m) => a + m.pct, 0);

  return (
    <>
      <Stack.Screen options={{ title: project.title }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.title}>{project.title}</Text>
          <View style={{ marginTop: 6, flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge label={PROJECT_STATUS_LABEL[project.status] ?? project.status} tone="primary" />
            {project.city ? <Text style={styles.meta}>{project.city}</Text> : null}
          </View>
        </Card>

        {milestones.length > 0 ? (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.section}>Andamento da obra</Text>
              <Text style={styles.pct}>{approvedPct}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${approvedPct}%` }]} />
            </View>

            {milestones.map((m) => {
              const busy = busyId === m.id;
              return (
                <Card key={m.id} style={{ gap: 6 }}>
                  <View style={styles.cardTop}>
                    <Text style={styles.mLabel}>
                      {m.ord + 1}. {m.label}
                    </Text>
                    <Badge label={MILESTONE_STATUS_LABEL[m.status]} tone={badgeTone(m.status)} />
                  </View>
                  <Text style={styles.meta}>{m.event}</Text>
                  <Text style={styles.amount}>
                    {m.pct}% · {formatCents(m.amount_cents)}
                  </Text>

                  {isCarpenter && m.status === 'PENDING' && (
                    <Button title="Iniciar etapa" onPress={() => act(() => api.advanceMilestone(m.id), m.id)} loading={busy} />
                  )}
                  {isCarpenter && m.status === 'IN_PROGRESS' && (
                    <Button title="Marcar como concluída" onPress={() => act(() => api.advanceMilestone(m.id), m.id)} loading={busy} />
                  )}
                  {isClient && m.status === 'DONE' && (
                    <Button title="Aprovar etapa ✓" variant="secondary" onPress={() => act(() => api.approveMilestone(m.id), m.id)} loading={busy} />
                  )}
                </Card>
              );
            })}
          </>
        ) : (
          <Card>
            <Text style={styles.meta}>
              A obra aparece aqui quando o orçamento for aprovado e o contrato assinado.
            </Text>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  title: { fontSize: 20, fontWeight: '700', color: color.text.primary },
  section: { fontSize: 18, fontWeight: '700', color: color.text.primary },
  meta: { fontSize: 14, color: color.text.muted },
  amount: { fontSize: 14, fontWeight: '600', color: color.text.primary },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: space.sm },
  pct: { fontSize: 18, fontWeight: '700', color: color.brand.secondary },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: color.bg.deep, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radius.pill, backgroundColor: color.brand.secondary },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  mLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: color.text.primary },
});
