import { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { api, type ArchitectDashboard } from '@/lib/api';
import { config } from '@/lib/config';
import { formatCents } from '@/lib/format';
import { PROJECT_STATUS_LABEL, type ProjectStatus } from '@/lib/types';
import { Badge, Card, EmptyState, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function ArquitetoScreen() {
  const [d, setD] = useState<ArchitectDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.getArchitectDashboard();
      setD(r.dashboard);
    } catch {
      setD(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Loading label="Carregando seu painel…" />;
  if (!d) return <EmptyState emoji="📐" title="Não foi possível carregar" subtitle="Tente novamente em instantes." />;

  const link = d.referralCode ? `${config.API_URL}/cadastro?ref=${d.referralCode}` : null;
  const share = () => {
    if (!link) return;
    void Share.share({ message: `Faça seu projeto comigo na Abilar: ${link}` });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Início' }} />
      <ScrollView style={{ backgroundColor: color.bg.base }} contentContainerStyle={styles.container}>
        <View style={styles.kpis}>
          <Kpi label="Comissão" value={formatCents(d.earnedCents)} strong />
          <Kpi label="Projetos" value={String(d.projects.length)} />
          <Kpi label="Aguardando" value={String(d.pendingCount)} />
        </View>

        {link ? (
          <Card style={{ backgroundColor: color.brand.secondary, gap: space.sm }}>
            <Text style={styles.shareTitle}>Seu link de indicação</Text>
            <Text style={styles.shareSub}>Quem criar o pedido por esse link fica vinculado a você.</Text>
            <Text style={styles.code}>{d.referralCode}</Text>
            <TouchableOpacity onPress={share} style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>Compartilhar link</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        <Text style={styles.section}>Meus projetos</Text>
        {d.projects.length === 0 ? (
          <EmptyState emoji="📐" title="Nenhum projeto ainda" subtitle="Compartilhe seu link de indicação com seus clientes." />
        ) : (
          d.projects.map((p) => (
            <Card key={p.id} style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.title} numberOfLines={1}>{p.title}</Text>
                <Text style={styles.meta}>{p.clientName ?? 'Cliente'}</Text>
                <View style={{ marginTop: space.xs, alignSelf: 'flex-start' }}>
                  <Badge label={PROJECT_STATUS_LABEL[p.status as ProjectStatus] ?? p.status} tone={p.commissionCents != null ? 'success' : 'primary'} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {p.commissionCents != null ? (
                  <>
                    <Text style={styles.comm}>{formatCents(p.commissionCents)}</Text>
                    <Text style={styles.meta}>comissão</Text>
                  </>
                ) : (
                  <Text style={styles.meta}>em andamento</Text>
                )}
              </View>
            </Card>
          ))
        )}

        <Text style={styles.note}>A comissão ({d.commissionPercent}% por obra) sai da fatia da plataforma — o cliente não paga a mais.</Text>
      </ScrollView>
    </>
  );
}

function Kpi({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, strong && { color: color.brand.secondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  kpis: { flexDirection: 'row', gap: space.sm },
  kpi: { flex: 1, backgroundColor: color.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, padding: space.sm },
  kpiLabel: { fontSize: 11, color: color.text.muted, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: color.text.primary },
  shareTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  shareSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  code: { fontSize: 14, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  shareBtn: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: space.sm, alignItems: 'center' },
  shareBtnText: { color: color.brand.secondary, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '700', color: color.text.primary, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex1: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: color.text.primary },
  meta: { fontSize: 12, color: color.text.muted },
  comm: { fontSize: 16, fontWeight: '800', color: color.brand.secondary },
  note: { fontSize: 12, color: color.text.subtle, marginTop: space.sm },
});
