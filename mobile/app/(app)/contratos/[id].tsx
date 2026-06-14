import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { getContract, type ContractView } from '@/lib/data';
import { api } from '@/lib/api';
import { CONTRACT_CLAUSES, CONTRACT_LEGAL_NOTE } from '@/lib/contract';
import { shareContractPdf } from '@/lib/pdf';
import { formatCents } from '@/lib/format';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { IconConcluido, IconAguardando } from '@/components/icons';
import { color, space } from '@/theme';

export default function ContratoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [c, setC] = useState<ContractView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [signing, setSigning] = useState(false);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setC(await getContract(id, profile.id));
    setLoaded(true);
  }, [id, profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sign = async () => {
    if (!id) return;
    setSigning(true);
    try {
      await api.signContract(id);
      await load();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível assinar.');
    } finally {
      setSigning(false);
    }
  };

  if (!loaded) return <Loading label="Carregando contrato…" />;
  if (!c) return <Text style={styles.muted}>Contrato não encontrado.</Text>;

  const mySigned = c.meIsClient ? !!c.accepted_by_client_at : !!c.accepted_by_carpenter_at;
  const signed = c.status === 'SIGNED';
  const t = c.terms ?? {};

  return (
    <>
      <Stack.Screen options={{ title: 'Contrato' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ gap: 6 }}>
          <View style={styles.row}>
            <Text style={styles.title}>{c.projectTitle}</Text>
            <Badge label={signed ? 'Assinado ✓' : 'Aguardando assinatura'} tone={signed ? 'success' : 'warn'} />
          </View>
          <Text style={styles.muted}>Entre você e {c.otherName}</Text>
          <Text style={styles.value}>Valor à vista: {formatCents(t.avistaCents ?? c.value_cents)}</Text>
          {t.parceladoCents != null && t.installmentValueCents != null && (
            <Text style={styles.muted}>
              ou {t.clientInstallments}x de {formatCents(t.installmentValueCents)}
            </Text>
          )}
        </Card>

        {Array.isArray(t.milestones) && t.milestones.length > 0 && (
          <Card style={{ gap: 8 }}>
            <Text style={styles.section}>Cronograma e liberação (escrow)</Text>
            {t.milestones.map((m, i) => (
              <View key={m.key} style={styles.ms}>
                <Text style={styles.msTitle}>
                  {i + 1}. {m.label} · {m.pct}%
                </Text>
                <Text style={styles.muted}>{m.event}</Text>
              </View>
            ))}
          </Card>
        )}

        <Card style={{ gap: 10 }}>
          <Text style={styles.section}>Cláusulas</Text>
          {CONTRACT_CLAUSES.map((cl) => (
            <View key={cl.title} style={{ gap: 2 }}>
              <Text style={styles.clTitle}>{cl.title}</Text>
              <Text style={styles.clBody}>{cl.body}</Text>
            </View>
          ))}
          <Text style={styles.legal}>{CONTRACT_LEGAL_NOTE}</Text>
        </Card>

        <Card style={{ gap: 6 }}>
          <View style={styles.sigRow}>
            {c.accepted_by_client_at
              ? <IconConcluido size={16} color={color.brand.secondary} strokeWidth={2} />
              : <IconAguardando size={16} color={color.text.subtle} strokeWidth={2} />}
            <Text style={styles.sigLine}>Cliente {c.accepted_by_client_at ? 'assinou' : 'pendente'}</Text>
          </View>
          <View style={styles.sigRow}>
            {c.accepted_by_carpenter_at
              ? <IconConcluido size={16} color={color.brand.secondary} strokeWidth={2} />
              : <IconAguardando size={16} color={color.text.subtle} strokeWidth={2} />}
            <Text style={styles.sigLine}>Marceneiro {c.accepted_by_carpenter_at ? 'assinou' : 'pendente'}</Text>
          </View>
        </Card>

        <Button title="Compartilhar em PDF" variant="outline" onPress={() => shareContractPdf(c).catch(() => {})} />

        {signed ? (
          <Button title="Ver a obra" variant="secondary" onPress={() => router.replace(`/(app)/pedidos/${c.project_id}`)} />
        ) : mySigned ? (
          <View style={styles.waitingRow}>
            <IconConcluido size={16} color={color.text.muted} strokeWidth={2} />
            <Text style={styles.waiting}>Você já assinou. Aguardando a outra parte.</Text>
          </View>
        ) : (
          <Button title="Li e aceito — assinar contrato" onPress={sign} loading={signing} />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: color.text.primary },
  value: { fontSize: 16, fontWeight: '600', color: color.text.primary, marginTop: 2 },
  muted: { color: color.text.muted, fontSize: 14 },
  section: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  ms: { gap: 2 },
  msTitle: { fontWeight: '600', color: color.text.primary },
  clTitle: { fontWeight: '700', color: color.text.primary },
  clBody: { color: color.text.muted, fontSize: 14, lineHeight: 20 },
  legal: { color: color.text.subtle, fontSize: 12, fontStyle: 'italic', marginTop: space.sm },
  sigLine: { color: color.text.primary },
  sigRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waiting: { color: color.text.muted },
  waitingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
