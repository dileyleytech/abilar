import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type QuotePreview } from '@/lib/api';
import { formatCents } from '@/lib/format';
import { Button } from '@/components/ui';
import { color, radius, space } from '@/theme';

// Marceneiro envia orçamento (valor fechado). O servidor recalcula o preço face
// ao cliente; o construtor por itens (catálogo) segue na web por enquanto.
export function QuoteForm({
  visible,
  projectId,
  onClose,
  onDone,
}: {
  visible: boolean;
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<QuotePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cents = Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (cents <= 0) {
      setPreview(null);
      return;
    }
    timer.current = setTimeout(() => {
      api
        .previewQuote({ baseValueCents: cents, maxInstallments: 1, dilutionSharePct: 0 })
        .then((r) => setPreview(r.preview))
        .catch(() => setPreview(null));
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [cents]);

  const submit = async () => {
    if (cents <= 0) return Alert.alert('Orçamento', 'Informe o valor do serviço.');
    setLoading(true);
    try {
      await api.sendQuote({ projectId, baseValueCents: cents, maxInstallments: 1, dilutionSharePct: 0, note: note.trim() || undefined });
      setValue('');
      setNote('');
      onDone();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível enviar.');
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Enviar orçamento</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Valor do serviço (R$)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ex.: 4500"
            placeholderTextColor={color.text.subtle}
            value={value}
            onChangeText={setValue}
          />

          {preview && (
            <View style={styles.preview}>
              <Text style={styles.pTitle}>Como o cliente vê</Text>
              <Row label="À vista (Pix)" value={formatCents(preview.avista.clientPaysCents)} />
              {preview.parcelado && (
                <Row
                  label={`Parcelado ${preview.parcelado.n}x`}
                  value={`${preview.parcelado.n}x de ${formatCents(preview.parcelado.installmentCents)}`}
                />
              )}
              <View style={styles.divider} />
              <Row label="Você recebe (à vista)" value={formatCents(preview.avista.youGetCents)} strong />
              {!preview.valid && preview.warning ? <Text style={styles.warn}>{preview.warning}</Text> : null}
            </View>
          )}

          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            placeholder="Prazo, material, condições…"
            placeholderTextColor={color.text.subtle}
            value={note}
            onChangeText={setNote}
            multiline
          />

          <Button title="Enviar orçamento" onPress={submit} loading={loading} />
          <Text style={styles.hint}>O cliente sempre vê parcelamento nas taxas do sistema. Subsídio de parcela é configurável na web.</Text>
        </ScrollView>
      </View>
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
  label: { fontSize: 15, fontWeight: '600', color: color.text.primary, marginTop: space.sm },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  preview: { backgroundColor: color.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, padding: space.md, gap: 6, marginTop: space.sm },
  pTitle: { fontSize: 13, fontWeight: '700', color: color.text.muted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: color.text.muted },
  rowValue: { color: color.text.primary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: color.border.subtle, marginVertical: 2 },
  warn: { color: color.state.danger, fontSize: 13 },
  hint: { fontSize: 12, color: color.text.subtle, textAlign: 'center', marginTop: space.sm },
});
