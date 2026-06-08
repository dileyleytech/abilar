import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api, type Pipeline } from '@/lib/api';
import { listJobs, saveJob, setJobDone, deleteJob, type JobRow } from '@/lib/data';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

const fmtDate = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null);

export default function AgendaScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [pipe, setPipe] = useState<Pipeline | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [editing, setEditing] = useState<JobRow | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, j] = await Promise.all([api.getPipeline(), listJobs()]);
      setPipe(p);
      setJobs(j);
    } catch {
      setPipe({ maxParallel: 0, activeCount: 0, overloaded: false, obras: [] });
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const act = async (fn: () => Promise<void>) => {
    try { await fn(); await load(); } catch (e) { Alert.alert('Ops', e instanceof Error ? e.message : 'Falha.'); }
  };

  if (!pipe) return <Loading label="Carregando agenda…" />;

  return (
    <>
      <Stack.Screen options={{ title: 'Agenda' }} />
      <ScrollView style={{ backgroundColor: color.bg.base }} contentContainerStyle={styles.container}>
        <Card style={pipe.overloaded ? styles.over : undefined}>
          <Text style={styles.capacity}>{pipe.activeCount} obra(s) ativa(s) · capacidade {pipe.maxParallel}</Text>
          {pipe.overloaded && <Text style={styles.warn}>⚠️ Acima da capacidade — atenção aos prazos antes de aceitar novas obras.</Text>}
          <Text style={styles.hint}>Ajuste a capacidade no seu Perfil profissional.</Text>
        </Card>

        <Text style={styles.section}>Obras da plataforma</Text>
        {pipe.obras.length === 0 ? (
          <Card><Text style={styles.muted}>Nenhuma obra contratada agora.</Text></Card>
        ) : (
          pipe.obras.map((o) => (
            <Pressable key={o.projectId} onPress={() => router.push(`/(app)/pedidos/${o.projectId}`)}>
              <Card style={styles.rowCard}>
                <Text style={styles.obraTitle}>{o.title}</Text>
                <Text style={styles.pct}>{o.approvedPct}%</Text>
              </Card>
            </Pressable>
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Obras externas</Text>
          <Text style={styles.add} onPress={() => setEditing('new')}>+ Adicionar</Text>
        </View>
        {jobs.length === 0 ? (
          <Card><Text style={styles.muted}>Cadastre obras fora da plataforma para vê-las na agenda.</Text></Card>
        ) : (
          jobs.map((j) => (
            <Card key={j.id} style={{ gap: 4 }}>
              <Text style={styles.obraTitle}>{j.title}</Text>
              {j.client_name ? <Text style={styles.muted}>{j.client_name}</Text> : null}
              {(j.start_date || j.end_date) && <Text style={styles.muted}>📅 {fmtDate(j.start_date) ?? '—'} → {fmtDate(j.end_date) ?? '—'}</Text>}
              <View style={styles.actions}>
                <Text style={styles.editLink} onPress={() => setEditing(j)}>Editar</Text>
                <Text style={styles.link} onPress={() => act(() => setJobDone(j.id))}>Concluir</Text>
                <Text style={styles.danger} onPress={() => Alert.alert('Excluir', 'Excluir esta obra?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => act(() => deleteJob(j.id)) }])}>Excluir</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {editing && profile && (
        <JobForm job={editing === 'new' ? null : editing} carpenterId={profile.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />
      )}
    </>
  );
}

function JobForm({ job, carpenterId, onClose, onSaved }: { job: JobRow | null; carpenterId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(job?.title ?? '');
  const [clientName, setClientName] = useState(job?.client_name ?? '');
  const [startDate, setStartDate] = useState(job?.start_date ?? '');
  const [endDate, setEndDate] = useState(job?.end_date ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (title.trim().length < 1) return Alert.alert('Obra', 'Dê um título.');
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return Alert.alert('Data', 'Use o formato AAAA-MM-DD.');
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return Alert.alert('Data', 'Use o formato AAAA-MM-DD.');
    setSaving(true);
    try {
      await saveJob(carpenterId, { title: title.trim(), clientName: clientName.trim() || undefined, startDate: startDate || undefined, endDate: endDate || undefined }, job?.id);
      onSaved();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.hTitle}>{job ? 'Editar obra' : 'Nova obra externa'}</Text>
          <Pressable onPress={onClose}><Text style={styles.close}>✕</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.fLabel}>Título</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex.: Cozinha do João" placeholderTextColor={color.text.subtle} />
          <Text style={styles.fLabel}>Cliente (opcional)</Text>
          <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholderTextColor={color.text.subtle} />
          <Text style={styles.fLabel}>Início (AAAA-MM-DD)</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-07-01" placeholderTextColor={color.text.subtle} />
          <Text style={styles.fLabel}>Término (AAAA-MM-DD)</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-07-20" placeholderTextColor={color.text.subtle} />
          <Button title="Salvar" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  over: { borderColor: color.accent.ochre, borderWidth: 2 },
  capacity: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  warn: { color: color.text.primary, marginTop: 4 },
  hint: { color: color.text.subtle, fontSize: 12, marginTop: 4 },
  section: { fontSize: 18, fontWeight: '700', color: color.text.primary, marginTop: space.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  add: { color: color.brand.primary, fontWeight: '700' },
  muted: { color: color.text.muted, fontSize: 13 },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  obraTitle: { fontSize: 16, fontWeight: '600', color: color.text.primary, flex: 1 },
  pct: { fontSize: 16, fontWeight: '700', color: color.brand.primary },
  actions: { flexDirection: 'row', gap: space.lg, marginTop: 4 },
  editLink: { color: color.brand.secondary, fontWeight: '600' },
  link: { color: color.brand.primary, fontWeight: '600' },
  danger: { color: color.state.danger, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: color.bg.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, borderBottomWidth: 1, borderBottomColor: color.border.subtle },
  hTitle: { fontSize: 18, fontWeight: '700', color: color.text.primary },
  close: { fontSize: 22, color: color.text.muted },
  body: { padding: space.lg, gap: space.sm },
  fLabel: { fontSize: 14, fontWeight: '600', color: color.text.primary, marginTop: space.sm },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
});
