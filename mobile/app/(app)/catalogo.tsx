import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { listMaterials, type MaterialRow } from '@/lib/data';
import { api } from '@/lib/api';
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABEL, MATERIAL_UNITS, MATERIAL_UNIT_LABEL } from '@/lib/types';
import { formatCents } from '@/lib/format';
import { Badge, Button, Card, EmptyState, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function CatalogoScreen() {
  const [items, setItems] = useState<MaterialRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<MaterialRow | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listMaterials());
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleActive = async (m: MaterialRow) => {
    try {
      await api.setMaterialActive(m.id, !m.active);
      await load();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Falha.');
    }
  };

  if (items === null) return <Loading label="Carregando catálogo…" />;

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.sm }}>
            <Text style={styles.help}>Seu custo de materiais e serviços. Use no orçamento por itens. Preços mudam por compra — atualize quando precisar.</Text>
            <Button title="+ Novo item" onPress={() => setEditing('new')} />
          </View>
        }
        ListEmptyComponent={<EmptyState emoji="📦" title="Catálogo vazio" subtitle="Cadastre seus materiais e serviços para orçar por itens." />}
        renderItem={({ item }) => (
          <Card style={{ gap: 4, opacity: item.active ? 1 : 0.55 }}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.cost}>{formatCents(item.unit_cost_cents)}</Text>
            </View>
            <View style={styles.row}>
              <Badge label={`${MATERIAL_CATEGORY_LABEL[item.category] ?? item.category} · ${MATERIAL_UNIT_LABEL[item.unit] ?? item.unit}`} tone="neutral" />
              <View style={styles.actions}>
                <Text style={styles.editLink} onPress={() => setEditing(item)}>✏️ Editar</Text>
                <Text style={styles.toggle} onPress={() => toggleActive(item)}>{item.active ? 'Inativar' : 'Ativar'}</Text>
              </View>
            </View>
          </Card>
        )}
      />
      {editing && <MaterialForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </>
  );
}

function MaterialForm({ initial, onClose, onSaved }: { initial: MaterialRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<string>(initial?.category ?? 'CHAPA');
  const [unit, setUnit] = useState<string>(initial?.unit ?? 'UN');
  const [cost, setCost] = useState(initial ? String(initial.unit_cost_cents / 100) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (name.trim().length < 2) return Alert.alert('Item', 'Dê um nome ao item.');
    const cents = Math.round(Number(cost.replace(/\./g, '').replace(',', '.')) * 100);
    if (!(cents >= 0) || Number.isNaN(cents)) return Alert.alert('Preço', 'Informe o custo.');
    const input = { name: name.trim(), category, unit, unitCostCents: cents };
    setSaving(true);
    try {
      if (initial) await api.updateMaterial(initial.id, input);
      else await api.createMaterial(input);
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
          <Text style={styles.title}>{initial ? 'Editar item' : 'Novo item'}</Text>
          <Pressable onPress={onClose}><Text style={styles.close}>✕</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.fLabel}>Nome</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex.: MDF Branco 18mm" placeholderTextColor={color.text.subtle} />

          <Text style={styles.fLabel}>Categoria</Text>
          <View style={styles.chips}>
            {MATERIAL_CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
                <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{MATERIAL_CATEGORY_LABEL[c]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fLabel}>Unidade</Text>
          <View style={styles.chips}>
            {MATERIAL_UNITS.map((u) => (
              <Pressable key={u} onPress={() => setUnit(u)} style={[styles.chip, unit === u && styles.chipOn]}>
                <Text style={[styles.chipText, unit === u && styles.chipTextOn]}>{MATERIAL_UNIT_LABEL[u]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fLabel}>Custo por unidade (R$)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={cost} onChangeText={setCost} placeholder="Ex.: 180" placeholderTextColor={color.text.subtle} />

          <Button title="Salvar" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  empty: { flexGrow: 1 },
  help: { color: color.text.muted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: color.text.primary },
  cost: { fontSize: 16, fontWeight: '700', color: color.brand.secondary },
  actions: { flexDirection: 'row', gap: space.md },
  editLink: { color: color.brand.secondary, fontWeight: '600' },
  toggle: { color: color.text.muted, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: color.bg.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, borderBottomWidth: 1, borderBottomColor: color.border.subtle },
  title: { fontSize: 18, fontWeight: '700', color: color.text.primary },
  close: { fontSize: 22, color: color.text.muted },
  body: { padding: space.lg, gap: space.sm },
  fLabel: { fontSize: 14, fontWeight: '600', color: color.text.primary, marginTop: space.sm },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: color.bg.surface },
  chipOn: { backgroundColor: color.brand.primary, borderColor: color.brand.primary },
  chipText: { color: color.text.primary, fontSize: 13 },
  chipTextOn: { color: color.text.onDark, fontWeight: '600' },
});
