import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type QuoteLineItem, type QuotePreview } from '@/lib/api';
import { listMaterials, type MaterialRow } from '@/lib/data';
import { MATERIAL_CATEGORY_LABEL } from '@/lib/types';
import { formatCents } from '@/lib/format';
import { Button } from '@/components/ui';
import { IconFechar } from '@/components/icons';
import { color, radius, space } from '@/theme';

type Line = QuoteLineItem & { id: string };

export function QuoteForm({ visible, projectId, onClose, onDone }: { visible: boolean; projectId: string; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'fixed' | 'items'>('fixed');
  const [value, setValue] = useState('');
  const [items, setItems] = useState<Line[]>([]);
  const [margin, setMargin] = useState('30');
  const [catalog, setCatalog] = useState<MaterialRow[]>([]);
  const [subsidy, setSubsidy] = useState(false);
  const [subN, setSubN] = useState('10');
  const [subShare, setSubShare] = useState('50');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<QuotePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<MaterialRow | null>(null); // item aguardando quantidade
  const [qty, setQty] = useState('1');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === 'items' && catalog.length === 0) listMaterials().then((m) => setCatalog(m.filter((x) => x.active))).catch(() => {});
  }, [mode, catalog.length]);

  const marginPct = Math.max(0, Number(margin.replace(',', '.')) || 0);
  const subtotalCents = items.reduce((a, i) => a + Math.round(i.qty * i.unitCostCents), 0);
  const fixedCents = Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const baseCents = mode === 'items' ? Math.round(subtotalCents * (1 + marginPct / 100)) : fixedCents;
  const maxInstallments = subsidy ? Math.max(1, Math.round(Number(subN) || 1)) : 1;
  const dilutionSharePct = subsidy ? Math.min(100, Math.max(0, Number(subShare.replace(',', '.')) || 0)) : 0;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (baseCents <= 0) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    timer.current = setTimeout(() => {
      api
        .previewQuote({ baseValueCents: baseCents, maxInstallments, dilutionSharePct })
        .then((r) => setPreview(r.preview))
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 450);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [baseCents, maxInstallments, dilutionSharePct]);

  const confirmAddItem = () => {
    if (!pending) return;
    const q = Math.max(0, Number(qty.replace(',', '.')) || 0);
    if (q <= 0) return Alert.alert('Quantidade', 'Informe uma quantidade maior que zero.');
    setItems((arr) => [...arr, { id: `${pending.id}-${arr.length}-${q}`, materialId: pending.id, name: pending.name, category: pending.category, unit: pending.unit, qty: q, unitCostCents: pending.unit_cost_cents }]);
    setPending(null);
    setQty('1');
  };
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

  const PreviewBlock = (
    <View style={styles.preview}>
      <Text style={styles.pTitle}>Como o cliente vê</Text>
      {baseCents <= 0 ? (
        <Text style={styles.muted}>Informe o valor para ver os números.</Text>
      ) : preview ? (
        <>
          <Row label="À vista (Pix)" value={formatCents(preview.avista.clientPaysCents)} />
          {preview.parcelado && <Row label={`Parcelado ${preview.parcelado.n}x`} value={`${preview.parcelado.n}x de ${formatCents(preview.parcelado.installmentCents)}`} />}
          <View style={styles.divider} />
          <Row label="Você recebe (à vista)" value={formatCents(preview.avista.youGetCents)} strong />
          {preview.parcelado && <Row label="Você recebe (parcelado)" value={formatCents(preview.parcelado.youGetCents)} />}
          {!preview.valid && preview.warning ? <Text style={styles.warn}>{preview.warning}</Text> : null}
        </>
      ) : (
        <Text style={styles.muted}>{previewLoading ? 'Calculando…' : 'Não foi possível calcular agora.'}</Text>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Enviar orçamento</Text>
          <Pressable onPress={onClose}><IconFechar size={22} color={color.text.muted} strokeWidth={2} /></Pressable>
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
                    <Text style={styles.muted}>{i.qty} {i.unit} × {formatCents(i.unitCostCents)} = {formatCents(Math.round(i.qty * i.unitCostCents))}</Text>
                  </View>
                  <Pressable hitSlop={6} onPress={() => removeItem(i.id)} style={styles.removeX}>
                    <IconFechar size={18} color={color.state.danger} strokeWidth={2} />
                  </Pressable>
                </View>
              ))}
              <Text style={styles.label}>Margem (%)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={margin} onChangeText={setMargin} />
              <Text style={styles.muted}>Custo {formatCents(subtotalCents)} + {marginPct}% = {formatCents(baseCents)}</Text>
            </>
          )}

          {PreviewBlock}

          {/* Subsídio de parcelamento */}
          <Pressable onPress={() => setSubsidy((s) => !s)} style={styles.subsidy}>
            <Text style={styles.subsidyBox}>{subsidy ? '☑' : '☐'}</Text>
            <Text style={styles.subsidyText}>Subsidiar o parcelamento do cliente (você absorve parte das taxas)</Text>
          </Pressable>
          {subsidy && (
            <View style={styles.subRow}>
              <View style={styles.flex1}>
                <Text style={styles.subLabel}>Parcelar em até</Text>
                <View style={styles.suffixRow}>
                  <TextInput style={[styles.input, styles.flex1]} keyboardType="numeric" value={subN} onChangeText={setSubN} />
                  <Text style={styles.suffix}>x</Text>
                </View>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.subLabel}>Você absorve</Text>
                <View style={styles.suffixRow}>
                  <TextInput style={[styles.input, styles.flex1]} keyboardType="numeric" value={subShare} onChangeText={setSubShare} />
                  <Text style={styles.suffix}>%</Text>
                </View>
              </View>
            </View>
          )}

          {mode === 'items' && (
            <>
              <Text style={styles.label}>Catálogo</Text>
              {catalog.length === 0 ? (
                <Text style={styles.muted}>Cadastre itens na aba Catálogo para usar aqui.</Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {catalog.map((m) => (
                    <Pressable key={m.id} style={styles.catItem} onPress={() => { setPending(m); setQty('1'); }}>
                      <Text style={styles.catName}>{m.name}</Text>
                      <Text style={styles.muted}>{MATERIAL_CATEGORY_LABEL[m.category] ?? m.category} · {formatCents(m.unit_cost_cents)} /{m.unit}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Prazo, material, condições…" placeholderTextColor={color.text.subtle} value={note} onChangeText={setNote} multiline />

          <Button title="Enviar orçamento" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de quantidade ao adicionar item */}
      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.qtyBackdrop}>
          <View style={styles.qtyCard}>
            <Text style={styles.qtyTitle}>{pending?.name}</Text>
            <Text style={styles.muted}>{pending ? `${formatCents(pending.unit_cost_cents)} por ${pending.unit}` : ''}</Text>
            <Text style={styles.subLabel}>Quantidade</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={qty} onChangeText={setQty} autoFocus />
            <View style={styles.qtyActions}>
              <View style={styles.flex1}><Button title="Adicionar" onPress={confirmAddItem} /></View>
              <View style={styles.flex1}><Button title="Cancelar" variant="outline" onPress={() => setPending(null)} /></View>
            </View>
          </View>
        </View>
      </Modal>
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
  removeX: { color: color.state.danger, fontWeight: '700', paddingHorizontal: 4 },
  catItem: { backgroundColor: color.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, padding: space.sm },
  catName: { color: color.text.primary, fontWeight: '600' },
  subsidy: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  subsidyBox: { fontSize: 18, color: color.brand.primary },
  subsidyText: { flex: 1, color: color.text.muted, fontSize: 13 },
  subRow: { flexDirection: 'row', gap: space.sm },
  subLabel: { fontSize: 13, color: color.text.muted, marginTop: 4, marginBottom: 2 },
  suffixRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  suffix: { fontSize: 16, color: color.text.muted },
  flex1: { flex: 1 },
  preview: { backgroundColor: color.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, padding: space.md, gap: 6, marginTop: space.sm },
  pTitle: { fontSize: 13, fontWeight: '700', color: color.text.muted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: color.text.muted },
  rowValue: { color: color.text.primary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: color.border.subtle, marginVertical: 2 },
  warn: { color: color.state.danger, fontSize: 13 },
  qtyBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: space.xl },
  qtyCard: { backgroundColor: color.bg.base, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  qtyTitle: { fontSize: 17, fontWeight: '700', color: color.text.primary },
  qtyActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
