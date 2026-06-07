import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, lookupCep } from '@/lib/api';
import { Button } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function NovoPedido() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [cep, setCep] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

  const onCep = async (raw: string) => {
    setCep(raw);
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return setCepStatus('idle');
    setCepStatus('loading');
    const r = await lookupCep(digits);
    if (r?.city) {
      setCity(r.city);
      setCoords({ lat: r.lat, lng: r.lng });
      setCepStatus('found');
    } else {
      setCepStatus('error');
    }
  };

  const submit = async () => {
    if (title.trim().length < 2) return Alert.alert('Pedido', 'Dê um nome ao pedido.');
    if (city.trim().length < 2) return Alert.alert('Pedido', 'Informe a cidade da obra.');
    setLoading(true);
    try {
      const r = await api.createProject({
        title: title.trim(),
        city: city.trim(),
        cep: cep.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
      });
      setTitle('');
      setCep('');
      setCity('');
      setCoords({});
      setCepStatus('idle');
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
      <Text style={styles.help}>Um pedido pode ter vários móveis. Dê um nome e informe onde é a obra; os móveis você adiciona em seguida.</Text>

      <Text style={styles.label}>Nome do pedido</Text>
      <TextInput style={styles.input} placeholder="Ex.: Reforma do apê" placeholderTextColor={color.text.subtle} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>CEP da obra</Text>
      <TextInput style={styles.input} keyboardType="numeric" placeholder="00000-000" placeholderTextColor={color.text.subtle} value={cep} onChangeText={onCep} />
      {cepStatus === 'loading' && <Text style={styles.cepMuted}>Buscando endereço…</Text>}
      {cepStatus === 'error' && <Text style={styles.cepErr}>CEP não encontrado — preencha a cidade manualmente.</Text>}

      <Text style={styles.label}>Cidade da obra</Text>
      <TextInput style={styles.input} placeholder="Preenche pelo CEP" placeholderTextColor={color.text.subtle} value={city} onChangeText={setCity} />
      <Text style={styles.help}>Usamos a cidade para mostrar seu pedido aos marceneiros da região.</Text>

      <Button title="Criar pedido" onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.sm, backgroundColor: color.bg.base },
  heading: { fontSize: 24, fontWeight: '700', color: color.text.primary },
  help: { fontSize: 13, color: color.text.muted, marginBottom: space.sm },
  label: { fontSize: 15, fontWeight: '600', color: color.text.primary, marginTop: space.md },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  cepMuted: { color: color.text.muted, fontSize: 13 },
  cepErr: { color: color.accent.ochre, fontSize: 13 },
});
