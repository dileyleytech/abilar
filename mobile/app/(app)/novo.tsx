import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/types';
import { Button } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function NovoPedido() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTitle('');
    setCity('');
    setCategory(null);
    setW('');
    setH('');
    setD('');
  };

  const submit = async () => {
    if (title.trim().length < 2) return Alert.alert('Pedido', 'Dê um nome ao pedido.');
    if (!category) return Alert.alert('Pedido', 'Escolha o tipo do móvel.');
    const widthCm = Number(w.replace(',', '.'));
    const heightCm = Number(h.replace(',', '.'));
    const depthCm = Number(d.replace(',', '.'));
    if (!(widthCm > 0 && heightCm > 0 && depthCm > 0)) return Alert.alert('Medidas', 'Informe largura, altura e profundidade (cm).');

    setLoading(true);
    try {
      const r = await api.createProject({ title: title.trim(), city: city.trim() || undefined, category, widthCm, heightCm, depthCm });
      reset();
      setLoading(false);
      router.replace(`/(app)/pedidos/${r.projectId}`);
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível criar o pedido.');
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + space.lg }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Novo pedido</Text>

      <Text style={styles.label}>Nome do pedido</Text>
      <TextInput style={styles.input} placeholder="Ex.: Cozinha do apê" placeholderTextColor={color.text.subtle} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Cidade (onde é a obra)</Text>
      <TextInput style={styles.input} placeholder="Ex.: São Paulo" placeholderTextColor={color.text.subtle} value={city} onChangeText={setCity} />

      <Text style={styles.label}>Tipo do móvel</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
            <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{CATEGORY_LABEL[c]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Medidas do vão (cm)</Text>
      <View style={styles.measures}>
        <Measure label="Largura" value={w} onChange={setW} />
        <Measure label="Altura" value={h} onChange={setH} />
        <Measure label="Profund." value={d} onChange={setD} />
      </View>

      <Button title="Publicar pedido" onPress={submit} loading={loading} />
      <Text style={styles.hint}>Seu pedido fica visível aos marceneiros da região para enviarem orçamento.</Text>
    </ScrollView>
  );
}

function Measure({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.mLabel}>{label}</Text>
      <TextInput style={styles.input} keyboardType="numeric" placeholder="0" placeholderTextColor={color.text.subtle} value={value} onChangeText={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.sm, backgroundColor: color.bg.base },
  heading: { fontSize: 24, fontWeight: '700', color: color.text.primary, marginBottom: space.sm },
  label: { fontSize: 15, fontWeight: '600', color: color.text.primary, marginTop: space.md },
  mLabel: { fontSize: 13, color: color.text.muted, marginBottom: 4 },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: color.bg.surface },
  chipOn: { backgroundColor: color.brand.primary, borderColor: color.brand.primary },
  chipText: { color: color.text.primary, fontSize: 14 },
  chipTextOn: { color: color.text.onDark, fontWeight: '600' },
  measures: { flexDirection: 'row', gap: space.sm },
  hint: { fontSize: 12, color: color.text.subtle, textAlign: 'center', marginTop: space.sm },
});
