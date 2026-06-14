import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { api, lookupCep, type ArchitectOption, type Photo } from '@/lib/api';
import { Button } from '@/components/ui';
import { IconConversas, IconArquitetos, IconAvulsos } from '@/components/icons';
import { color, radius, space } from '@/theme';

export default function NovoPedido() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<'AI_GENERATED' | 'ARCHITECT_PROJECT'>('AI_GENERATED');
  const [pdf, setPdf] = useState<Photo | null>(null);
  const [cep, setCep] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [architect, setArchitect] = useState<{ id: string; name: string } | null>(null);
  const [archQuery, setArchQuery] = useState('');
  const [archResults, setArchResults] = useState<ArchitectOption[]>([]);
  const archTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (architect) return;
    const term = archQuery.trim();
    if (archTimer.current) clearTimeout(archTimer.current);
    if (term.length < 2) {
      setArchResults([]);
      return;
    }
    archTimer.current = setTimeout(() => {
      api.searchArchitects(term).then((r) => setArchResults(r.architects)).catch(() => setArchResults([]));
    }, 300);
    return () => {
      if (archTimer.current) clearTimeout(archTimer.current);
    };
  }, [archQuery, architect]);

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

  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    if (a) setPdf({ uri: a.uri, name: a.name ?? 'projeto.pdf', type: 'application/pdf' });
  };

  const submit = async () => {
    if (title.trim().length < 2) return Alert.alert('Pedido', 'Dê um nome ao pedido.');
    if (city.trim().length < 2) return Alert.alert('Pedido', 'Informe a cidade da obra.');
    if (source === 'ARCHITECT_PROJECT' && !pdf) return Alert.alert('Projeto', 'Anexe o PDF do projeto de arquiteto.');
    setLoading(true);
    try {
      const r = await api.createProject({
        title: title.trim(),
        sourceType: source,
        city: city.trim(),
        cep: cep.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
        architectId: architect?.id,
      });
      if (source === 'ARCHITECT_PROJECT' && pdf) {
        await api.uploadProjectPdf(r.projectId, pdf);
      }
      setTitle('');
      setCep('');
      setCity('');
      setCoords({});
      setPdf(null);
      setSource('AI_GENERATED');
      setArchitect(null);
      setArchQuery('');
      setArchResults([]);
      setCepStatus('idle');
      setLoading(false);
      // Projeto de arquiteto: o PDF já tem tudo, não auto-abre o form de móvel.
      router.replace(source === 'ARCHITECT_PROJECT' ? `/(app)/pedidos/${r.projectId}` : `/(app)/pedidos/${r.projectId}?novo=1`);
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível criar o pedido.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.help}>Um pedido pode ter vários móveis. Dê um nome e informe onde é a obra; os móveis você adiciona em seguida.</Text>

      <Text style={styles.label}>Como você quer começar?</Text>
      <View style={styles.srcRow}>
        <Pressable onPress={() => setSource('AI_GENERATED')} style={[styles.src, source === 'AI_GENERATED' && styles.srcOn]}>
          <IconConversas size={24} color={source === 'AI_GENERATED' ? color.brand.primary : color.text.muted} strokeWidth={2} />
          <Text style={[styles.srcText, source === 'AI_GENERATED' && styles.srcTextOn]}>Montar com a ABI</Text>
        </Pressable>
        <Pressable onPress={() => setSource('ARCHITECT_PROJECT')} style={[styles.src, source === 'ARCHITECT_PROJECT' && styles.srcOn]}>
          <IconArquitetos size={24} color={source === 'ARCHITECT_PROJECT' ? color.brand.primary : color.text.muted} strokeWidth={2} />
          <Text style={[styles.srcText, source === 'ARCHITECT_PROJECT' && styles.srcTextOn]}>Tenho projeto de arquiteto</Text>
        </Pressable>
      </View>

      {source === 'ARCHITECT_PROJECT' && (
        <>
          {pdf ? (
            <View style={styles.pdfRow}>
              <IconAvulsos size={18} color={color.text.muted} strokeWidth={2} />
              <Text style={styles.pdfName} numberOfLines={1}>{pdf.name}</Text>
              <Text style={styles.pdfRemove} onPress={() => setPdf(null)}>Remover</Text>
            </View>
          ) : (
            <Button title="Selecionar PDF do projeto" variant="outline" onPress={pickPdf} />
          )}
        </>
      )}

      <Text style={styles.label}>Nome do pedido</Text>
      <TextInput style={styles.input} placeholder="Ex.: Reforma do apê" placeholderTextColor={color.text.subtle} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>CEP da obra</Text>
      <TextInput style={styles.input} keyboardType="numeric" placeholder="00000-000" placeholderTextColor={color.text.subtle} value={cep} onChangeText={onCep} />
      {cepStatus === 'loading' && <Text style={styles.cepMuted}>Buscando endereço…</Text>}
      {cepStatus === 'error' && <Text style={styles.cepErr}>CEP não encontrado — preencha a cidade manualmente.</Text>}

      <Text style={styles.label}>Cidade da obra</Text>
      <TextInput style={styles.input} placeholder="Preenche pelo CEP" placeholderTextColor={color.text.subtle} value={city} onChangeText={setCity} />
      <Text style={styles.help}>Usamos a cidade para mostrar seu pedido aos marceneiros da região.</Text>

      <Text style={styles.label}>Indicado por um arquiteto? (opcional)</Text>
      {architect ? (
        <View style={styles.pdfRow}>
          <IconArquitetos size={18} color={color.text.muted} strokeWidth={2} />
          <Text style={styles.pdfName} numberOfLines={1}>{architect.name}</Text>
          <Text style={styles.pdfRemove} onPress={() => { setArchitect(null); setArchQuery(''); }}>Trocar</Text>
        </View>
      ) : (
        <>
          <TextInput style={styles.input} placeholder="Digite o nome do arquiteto" placeholderTextColor={color.text.subtle} value={archQuery} onChangeText={setArchQuery} />
          {archResults.map((a) => (
            <Pressable key={a.userId} onPress={() => { setArchitect({ id: a.userId, name: a.name }); setArchResults([]); }} style={styles.archItem}>
              <View style={styles.archRow}>
                <IconArquitetos size={16} color={color.text.muted} strokeWidth={2} />
                <Text style={styles.archName}>{a.name}{a.cau ? `  ·  CAU ${a.cau}` : ''}</Text>
              </View>
            </Pressable>
          ))}
        </>
      )}

      <Button title="Criar pedido" onPress={submit} loading={loading} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg.base },
  container: { padding: space.lg, gap: space.sm, backgroundColor: color.bg.base },
  help: { fontSize: 13, color: color.text.muted, marginBottom: space.sm },
  label: { fontSize: 15, fontWeight: '600', color: color.text.primary, marginTop: space.md },
  srcRow: { flexDirection: 'row', gap: space.sm },
  src: { flex: 1, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, padding: space.md, gap: 4, alignItems: 'center', backgroundColor: color.bg.surface },
  srcOn: { borderColor: color.brand.primary, backgroundColor: 'rgba(197,106,51,0.08)' },
  srcText: { fontSize: 13, color: color.text.muted, textAlign: 'center' },
  srcTextOn: { color: color.text.primary, fontWeight: '600' },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, padding: space.md },
  pdfName: { flex: 1, color: color.text.primary },
  pdfRemove: { color: color.state.danger, fontWeight: '600' },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  cepMuted: { color: color.text.muted, fontSize: 13 },
  cepErr: { color: color.accent.ochre, fontSize: 13 },
  archItem: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12 },
  archRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  archName: { color: color.text.primary, fontSize: 15 },
});
