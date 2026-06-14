import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import {
  listExternalQuotes,
  saveExternalQuote,
  setExternalQuoteStatus,
  deleteExternalQuote,
  listMaterials,
  type ExternalQuoteRow,
  type ExtLineItem,
  type MaterialRow,
} from '@/lib/data';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { shareExternalQuotePdf } from '@/lib/pdf';
import { Badge, Button, Card, EmptyState, Loading } from '@/components/ui';
import { IconCompartilhar, IconFechar } from '@/components/icons';
import { color, radius, space } from '@/theme';

const STATUS_LABEL: Record<string, string> = { SENT: 'Enviado', ACCEPTED: 'Aceito', REJECTED: 'Recusado' };

export default function AvulsosScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ExternalQuoteRow[] | null>(null);
  const [catalog, setCatalog] = useState<MaterialRow[]>([]);
  const [editing, setEditing] = useState<ExternalQuoteRow | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      const [qs, mats] = await Promise.all([listExternalQuotes(), listMaterials()]);
      setItems(qs);
      setCatalog(mats.filter((m) => m.active));
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Falha.');
    }
  };

  if (items === null) return <Loading label="Carregando…" />;

  return (
    <>
      <Stack.Screen options={{ title: 'Orçamentos avulsos' }} />
      <ScrollView style={{ backgroundColor: color.bg.base }} contentContainerStyle={styles.container}>
        <Text style={styles.help}>Para clientes fora da plataforma. Monte pelo catálogo; o valor é custo + sua margem.</Text>
        <Button title="+ Novo orçamento avulso" onPress={() => setEditing('new')} />

        {items.length === 0 ? (
          <EmptyState emoji="📄" title="Nenhum avulso ainda" />
        ) : (
          items.map((q) => (
            <Card key={q.id} style={{ gap: 6 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{q.title}</Text>
                  <Text style={styles.muted}>{q.client_name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.value}>{formatCents(q.value_cents)}</Text>
                  <Badge label={STATUS_LABEL[q.status] ?? q.status} tone={q.status === 'ACCEPTED' ? 'success' : 'neutral'} />
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={styles.linkRow}
                  onPress={() => shareExternalQuotePdf({
                    clientName: q.client_name,
                    title: q.title,
                    items: (q.line_items ?? []).map((i) => ({ name: i.name, qty: i.qty, unit: i.unit })),
                    valueCents: q.value_cents,
                    note: q.note,
                    carpenterName: profile?.name ?? undefined,
                  }).catch((e) => Alert.alert('PDF', e instanceof Error ? e.message : 'Falha ao gerar.'))}
                >
                  <IconCompartilhar size={16} color={color.brand.primary} strokeWidth={2} />
                  <Text style={styles.link}>PDF</Text>
                </Pressable>
                <Text style={styles.editLink} onPress={() => setEditing(q)}>Editar</Text>
                {q.status !== 'ACCEPTED' && <Text style={styles.link} onPress={() => act(async () => { await api.acceptExternalQuote(q.id); })}>Marcar aceito</Text>}
                {q.status !== 'REJECTED' && <Text style={styles.muted2} onPress={() => act(() => setExternalQuoteStatus(q.id, 'REJECTED'))}>Recusado</Text>}
                <Text style={styles.danger} onPress={() => Alert.alert('Excluir', 'Excluir este orçamento?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => act(() => deleteExternalQuote(q.id)) }])}>Excluir</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {editing && profile && (
        <Form
          quote={editing === 'new' ? null : editing}
          carpenterId={profile.id}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </>
  );
}

function Form({ quote, carpenterId, catalog, onClose, onSaved }: { quote: ExternalQuoteRow | null; carpenterId: string; catalog: MaterialRow[]; onClose: () => void; onSaved: () => void }) {
  const [clientName, setClientName] = useState(quote?.client_name ?? '');
  const [title, setTitle] = useState(quote?.title ?? '');
  const [lineItems, setLineItems] = useState<ExtLineItem[]>(quote?.line_items ?? []);
  const [margin, setMargin] = useState(String(quote?.margin_pct ?? 30));
  const [note, setNote] = useState(quote?.note ?? '');
  const [saving, setSaving] = useState(false);

  const marginPct = Math.max(0, Number(margin) || 0);
  const subtotal = lineItems.reduce((a, i) => a + Math.round(i.qty * i.unitCostCents), 0);
  const value = Math.round(subtotal * (1 + marginPct / 100));

  const addItem = (m: MaterialRow) =>
    setLineItems((arr) => [...arr, { materialId: m.id, name: m.name, category: m.category, unit: m.unit, qty: 1, unitCostCents: m.unit_cost_cents }]);

  const save = async () => {
    if (clientName.trim().length < 1) return Alert.alert('Cliente', 'Informe o nome do cliente.');
    if (title.trim().length < 1) return Alert.alert('Título', 'Dê um título.');
    if (lineItems.length === 0) return Alert.alert('Itens', 'Adicione ao menos um item.');
    setSaving(true);
    try {
      await saveExternalQuote(carpenterId, { clientName: clientName.trim(), title: title.trim(), lineItems, marginPct, note: note.trim() || undefined }, quote?.id);
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
          <Text style={styles.hTitle}>{quote ? 'Editar avulso' : 'Novo avulso'}</Text>
          <Pressable onPress={onClose}><IconFechar size={22} color={color.text.muted} strokeWidth={2} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.fLabel}>Cliente</Text>
          <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="Nome do cliente" placeholderTextColor={color.text.subtle} />
          <Text style={styles.fLabel}>Título</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex.: Cozinha planejada" placeholderTextColor={color.text.subtle} />

          <Text style={styles.fLabel}>Itens</Text>
          {lineItems.length === 0 && <Text style={styles.muted}>Toque num item do catálogo abaixo.</Text>}
          {lineItems.map((it, idx) => (
            <View key={idx} style={styles.lineRow}>
              <Text style={{ flex: 1, color: color.text.primary }}>{it.name} <Text style={styles.muted}>({formatCents(it.unitCostCents)}/{it.unit})</Text></Text>
              <TextInput style={styles.qty} keyboardType="numeric" value={String(it.qty)} onChangeText={(t) => setLineItems((arr) => arr.map((x, i) => (i === idx ? { ...x, qty: Math.max(0, Number(t.replace(',', '.')) || 0) } : x)))} />
              <Pressable hitSlop={6} onPress={() => setLineItems((arr) => arr.filter((_, i) => i !== idx))}>
                <IconFechar size={18} color={color.state.danger} strokeWidth={2} />
              </Pressable>
            </View>
          ))}

          <Text style={styles.fLabel}>Margem (%)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={margin} onChangeText={setMargin} />
          <Text style={styles.muted}>Custo {formatCents(subtotal)} + {marginPct}% = {formatCents(value)}</Text>

          {catalog.length > 0 && (
            <>
              <Text style={styles.fLabel}>Catálogo</Text>
              {catalog.map((m) => (
                <Pressable key={m.id} style={styles.catItem} onPress={() => addItem(m)}>
                  <Text style={{ color: color.text.primary, fontWeight: '600' }}>{m.name}</Text>
                  <Text style={styles.muted}>{formatCents(m.unit_cost_cents)}/{m.unit}</Text>
                </Pressable>
              ))}
            </>
          )}

          <Text style={styles.fLabel}>Observação (opcional)</Text>
          <TextInput style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} multiline />

          <Button title="Salvar" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  help: { color: color.text.muted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  value: { fontSize: 17, fontWeight: '800', color: color.text.primary },
  muted: { color: color.text.muted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: space.lg, marginTop: 4, flexWrap: 'wrap' },
  editLink: { color: color.brand.secondary, fontWeight: '600' },
  link: { color: color.brand.primary, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muted2: { color: color.text.muted, fontWeight: '600' },
  danger: { color: color.state.danger, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: color.bg.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, borderBottomWidth: 1, borderBottomColor: color.border.subtle },
  hTitle: { fontSize: 18, fontWeight: '700', color: color.text.primary },
  close: { fontSize: 22, color: color.text.muted },
  body: { padding: space.lg, gap: space.sm },
  fLabel: { fontSize: 14, fontWeight: '600', color: color.text.primary, marginTop: space.sm },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, padding: space.sm },
  qty: { width: 56, textAlign: 'center', backgroundColor: color.bg.base, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.sm, paddingVertical: 6, color: color.text.primary },
  catItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, padding: space.sm },
});
