import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type QuoteLineItem, type QuotePreview } from '@/lib/api';
import { listMaterials, type MaterialRow } from '@/lib/data';
import { MATERIAL_CATEGORY_LABEL } from '@/lib/types';
import { formatCents } from '@/lib/format';
import { Button } from '@/components/ui';
import { color, radius, space } from '@/theme';

type Line = QuoteLineItem & { id: string };

export function QuoteForm({ visible, projectId, onClose, onDone }: { visible: boolean; projectId: string; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'fixed' | 'items'>('fixed');
  const [value, setValue] = useState('');
  const [items, setItems] = useState<Line[]>([]);
  const [margin, setMargin] = useState('30');
  const [catalog, setCatalog] = useState<MaterialRow[]>([]);
  const [subsidy, setSubsidy] = useState(false);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<QuotePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === 'items' && catalog.length === 0) listMaterials().then((m) => setCatalog(m.filter((x) => x.active))).catch(() => {});
  }, [mode, catalog.length]);

  const marginPct = Math.max(0, Number(margin.replace(',', '.')) || 0);
  const subtotalCents = items.reduce((a, i) => a + Math.round(i.qty * i.unitCostCents), 0);
  const fixedCents = Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const baseCents = mode === 'items' ? Math.round(subtotalCents * (1 + marginPct / 100)) : fixedCents;
  const maxInstallments = subsidy ? 12 : 1;
  const dilutionSharePct = subsidy ? 100 : 0;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (baseCents <= 0) {
      setPreview(null);
      return;
    }
    timer.current = setTimeout(() => {
      api.previewQuote({ baseValueCents: baseCents, maxInstallments, dilutionSharePct }).then((r) => setPreview(r.preview)).catch(() => setPreview(null));
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [baseCents, maxInstallments, dilutionSharePct]);

  const addItem = (m: MaterialRow) =>
    setItems((arr) => [...arr, { id: `${m.id}-${arr.length}`, materialId: m.id, name: m.name, category: m.category, unit: m.unit, qty: 1, unitCostCents: m.unit_cost_cents }]);
  const setQty = (id: string, qty: number) => setItems((arr) => arr.map((i) => (i.id === id ? { ...i, qty } : i)));
  const removeItem = (id: string) => setItems((arr) => arr.filter((i) => i.id !== id));

  const submit = async () => {
    if (baseCents <= 0) return Alert.alert('Orçamento', mode === 'items' ? 'Adicione itens com custo.' : 'Informe o valor.');
    setLoading(true);
    try {
      await api.sendQuote({
        projectId,
        baseValueCents: baseCents,
        maxInstallments,
        dilutionSharePct,
        note: note.trim() || undefined,
        ...(mode === 'items' ? { lineItems: items.map(({ id: _id, ...rest }) => rest), marginPct } : {}),
      });
      onDone();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível enviar.');
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Enviar orçamento</Text>
          <Pressable onPress={onClose}><Text style={styles.close}>✕</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={styles.tabs}>
            <Pressable onPress={() => setMode('fixed')} style={[styles.tab, mode === 'fixed' && styles.tabOn]}>
              <Text style={[styles.tabText, mode === 'fixed' && styles.tabTextOn]}>Valor fechado</Text>
            </Pressable>
            <Pressable onPress={() => setMode('items')} style={[styles.tab, mode === 'items' && styles.tabOn]}>
              <Text style={[styles.tabText, mode === 'items' && styles.tabTextOn]}>Por itens</Text>
            </Pressable>
          </View>

          {mode === 'fixed' ? (
            <>
              <Text style={styles.label}>Valor do serviço (R$)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="Ex.: 4500" placeholderTextColor={color.text.subtle} value={value} onChangeText={setValue} />
            </>
          ) : (
            <>
              <Text style={styles.label}>Itens do orçamento</Text>
              {items.length === 0 && <Text style={styles.muted}>Toque num item do catálogo abaixo para adicionar.</Text>}
              {items.map((i) => (
                <View key={i.id} style={styles.lineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName}>{i.name}</Text>
                    <Text style={styles.muted}>{formatCents(i.unitCostCents)} /{i.unit}</Text>
                  </View>
                  <TextInput
                    style={styles.qty}
                    keyboardType="numeric"
                    value={String(i.qty)}
                    onChangeText={(t) => setQty(i.id, Math.max(0, Number(t.replace(',', '.')) || 0))}
                  />
                  <Text style={styles.removeX} onPress={() => removeItem(i.id)}>✕</Text>
                </View>
              ))}

              <Text style={styles.label}>Margem (%)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={margin} onChangeText={setMargin} />
              <Text style={styles.muted}>Custo {formatCents(subtotalCents)} + {marginPct}% = {formatCents(baseCents)}</Text>

              <Text style={styles.label}>Catálogo</Text>
              {catalog.length === 0 ? (
                <Text style={styles.muted}>Cadastre itens na aba Catálogo para usar aqui.</Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {catalog.map((m) => (
                    <Pressable key={m.id} style={styles.catItem} onPress={() => addItem(m)}>
                      <Text style={styles.catName}>{m.name}</Text>
                      <Text style={styles.muted}>{MATERIAL_CATEGORY_LABEL[m.category] ?? m.category} · {formatCents(m.unit_cost_cents)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          <Pressable onPress={() => setSubsidy((s) => !s)} style={styles.subsidy}>
            <Text style={styles.subsidyBox}>{subsidy ? '☑' : '☐'}</Text>
            <Text style={styles.subsidyText}>Absorver as taxas do parcelamento (cliente paga menos parcelado)</Text>
          </Pressable>

          {preview && (
            <View style={styles.preview}>
              <Text style={styles.pTitle}>Como o cliente vê</Text>
              <Row label="À vista (Pix)" value={formatCents(preview.avista.clientPaysCents)} />
              {preview.parcelado && <Row label={`Parcelado ${preview.parcelado.n}x`} value={`${preview.parcelado.n}x de ${formatCents(preview.parcelado.installmentCents)}`} />}
              <View style={styles.divider} />
              <Row label="Você recebe (à vista)" value={formatCents(preview.avista.youGetCents)} strong />
              {!preview.valid && preview.warning ? <Text style={styles.warn}>{preview.warning}</Text> : null}
            </View>
          )}

          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Prazo, material, condições…" placeholderTextColor={color.text.subtle} value={note} onChangeText={setNote} multiline />

          <Button title="Enviar orçamento" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { color: color.brand.secondary, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, borderBottomWidth: 1, borderBottomColor: color.border.subtle },
  title: { fontSize: 18, fontWeight: '700', color: color.text.primary },
  close: { fontSize: 22, color: color.text.muted },
  body: { padding: space.lg, gap: space.sm },
  tabs: { flexDirection: 'row', backgroundColor: color.bg.deep, borderRadius: radius.pill, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: color.bg.surface },
  tabText: { color: color.text.muted, fontWeight: '500' },
  tabTextOn: { color: color.text.primary, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '600', color: color.text.primary, marginTop: space.sm },
  muted: { color: color.text.muted, fontSize: 13 },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, padding: space.sm },
  lineName: { color: color.text.primary, fontWeight: '600' },
  qty: { width: 56, textAlign: 'center', backgroundColor: color.bg.base, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.sm, paddingVertical: 6, color: color.text.primary },
  removeX: { color: color.state.danger, fontWeight: '700', paddingHorizontal: 4 },
  catItem: { backgroundColor: color.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, padding: space.sm },
  catName: { color: color.text.primary, fontWeight: '600' },
  subsidy: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  subsidyBox: { fontSize: 18, color: color.brand.primary },
  subsidyText: { flex: 1, color: color.text.muted, fontSize: 13 },
  preview: { backgroundColor: color.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, padding: space.md, gap: 6, marginTop: space.sm },
  pTitle: { fontSize: 13, fontWeight: '700', color: color.text.muted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: color.text.muted },
  rowValue: { color: color.text.primary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: color.border.subtle, marginVertical: 2 },
  warn: { color: color.state.danger, fontSize: 13 },
});
