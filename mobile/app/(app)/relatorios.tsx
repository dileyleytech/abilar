import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { api, type CarpenterReport } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { Card, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function RelatoriosScreen() {
  const [r, setR] = useState<CarpenterReport | null>(null);

  const load = useCallback(async () => {
    try {
      setR(await api.getReport());
    } catch {
      setR(null);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!r) return <Loading label="Carregando relatórios…" />;

  const Stat = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, strong && { color: color.brand.secondary }]}>{value}</Text>
    </View>
  );

  const Part = ({ title, d }: { title: string; d: CarpenterReport['platform'] }) => (
    <Card style={{ gap: space.sm }}>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.grid}>
        <Stat label="Enviados" value={String(d.sent)} />
        <Stat label="Aceitos" value={String(d.accepted)} />
        <Stat label="Conversão" value={d.sent ? `${Math.round((d.accepted / d.sent) * 100)}%` : '—'} />
        <Stat label="Faturado" value={formatCents(d.valueCents)} />
        <Stat label="Custo" value={formatCents(d.costCents)} />
        <Stat label="Lucro" value={formatCents(d.profitCents)} strong />
      </View>
    </Card>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Relatórios' }} />
      <ScrollView style={{ backgroundColor: color.bg.base }} contentContainerStyle={styles.container}>
        <Card style={styles.total}>
          <Text style={styles.section}>Total geral</Text>
          <View style={styles.grid}>
            <Stat label="Faturado" value={formatCents(r.total.valueCents)} />
            <Stat label="Custo" value={formatCents(r.total.costCents)} />
            <Stat label="Lucro" value={formatCents(r.total.profitCents)} strong />
          </View>
        </Card>
        <Part title="Plataforma" d={r.platform} />
        <Part title="Avulsos" d={r.external} />
        <Text style={styles.note}>Lucro estimado = valor − custo dos materiais. Não inclui impostos nem comissões da plataforma.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  section: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  total: { borderColor: color.brand.secondary, borderWidth: 2, gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { width: '30%', minWidth: 90, backgroundColor: color.bg.base, borderRadius: radius.md, padding: space.sm, flexGrow: 1 },
  statLabel: { fontSize: 11, color: color.text.muted, textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '800', color: color.text.primary },
  note: { fontSize: 12, color: color.text.subtle },
});
