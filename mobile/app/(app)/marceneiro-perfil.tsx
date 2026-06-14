import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api, lookupCep } from '@/lib/api';
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/types';
import { Button } from '@/components/ui';
import { color, radius, space } from '@/theme';

const PERSON_TYPES: { v: string; t: string }[] = [
  { v: 'MEI', t: 'MEI' },
  { v: 'PJ', t: 'Empresa (PJ)' },
  { v: 'PF', t: 'Pessoa física' },
];

export default function MarceneiroPerfil() {
  const router = useRouter();
  const [personType, setPersonType] = useState('MEI');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [doc, setDoc] = useState('');
  const [cep, setCep] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [radiusKm, setRadiusKm] = useState('30');
  const [maxParallel, setMaxParallel] = useState('3');
  const [cats, setCats] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCarpenterProfile().then(({ profile }) => {
      if (!profile) return;
      setPersonType(profile.personType);
      setName(profile.name ?? '');
      setCompanyName(profile.companyName ?? '');
      setDoc(profile.cnpjOrCpf ?? '');
      setCep(profile.serviceCep ?? '');
      setCity(profile.serviceCity ?? '');
      setRadiusKm(String(profile.serviceRadiusKm ?? 30));
      setMaxParallel(String(profile.maxParallelProjects ?? 3));
      setCats(profile.categories ?? []);
      setBio(profile.bio ?? '');
    }).catch(() => {});
  }, []);

  const onCep = async (raw: string) => {
    setCep(raw);
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    const r = await lookupCep(digits);
    if (r?.city) { setCity(r.city); setCoords({ lat: r.lat, lng: r.lng }); }
  };

  const toggleCat = (c: string) => setCats((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]));

  const save = async () => {
    if (name.trim().length < 2) return Alert.alert('Perfil', 'Informe seu nome.');
    if (!doc.trim()) return Alert.alert('Perfil', 'Informe seu CPF/CNPJ.');
    if (city.trim().length < 2) return Alert.alert('Perfil', 'Informe a cidade de atuação.');
    if (cats.length === 0) return Alert.alert('Perfil', 'Escolha ao menos uma categoria que você atende.');
    setLoading(true);
    try {
      await api.saveCarpenterProfile({
        personType,
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        cnpjOrCpf: doc.trim(),
        serviceCity: city.trim(),
        serviceCep: cep.trim(),
        serviceRadiusKm: Math.round(Number(radiusKm) || 0),
        maxParallelProjects: Math.max(1, Math.round(Number(maxParallel) || 1)),
        serviceLat: coords.lat,
        serviceLng: coords.lng,
        categories: cats,
        bio: bio.trim() || undefined,
      });
      Alert.alert('Pronto', 'Perfil salvo. Você já pode receber pedidos e orçar.');
      router.back();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Perfil profissional' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.help}>Complete seu perfil para aparecer aos clientes da sua região e poder enviar orçamentos.</Text>

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.row}>
          {PERSON_TYPES.map((p) => (
            <Pressable key={p.v} onPress={() => setPersonType(p.v)} style={[styles.seg, personType === p.v && styles.segOn]}>
              <Text style={[styles.segText, personType === p.v && styles.segTextOn]}>{p.t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Nome</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={color.text.subtle} />

        {personType !== 'PF' && (
          <>
            <Text style={styles.label}>Nome da empresa (opcional)</Text>
            <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholderTextColor={color.text.subtle} />
          </>
        )}

        <Text style={styles.label}>{personType === 'PF' ? 'CPF' : 'CNPJ'}</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={doc} onChangeText={setDoc} placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} placeholderTextColor={color.text.subtle} />

        <Text style={styles.label}>CEP de atuação</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={cep} onChangeText={onCep} placeholder="00000-000" placeholderTextColor={color.text.subtle} />
        <Text style={styles.label}>Cidade</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Preenche pelo CEP" placeholderTextColor={color.text.subtle} />

        <Text style={styles.label}>Raio de atuação (km)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={radiusKm} onChangeText={setRadiusKm} />

        <Text style={styles.label}>Capacidade (obras em paralelo)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={maxParallel} onChangeText={setMaxParallel} />

        <Text style={styles.label}>O que você faz</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => toggleCat(c)} style={[styles.chip, cats.includes(c) && styles.chipOn]}>
              <Text style={[styles.chipText, cats.includes(c) && styles.chipTextOn]}>{CATEGORY_LABEL[c]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Sobre você (opcional)</Text>
        <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} multiline placeholder="Experiência, especialidades…" placeholderTextColor={color.text.subtle} />

        <Button title="Salvar perfil" onPress={save} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg.base },
  container: { padding: space.lg, gap: space.sm },
  help: { color: color.text.muted, fontSize: 13, marginBottom: space.sm },
  label: { fontSize: 15, fontWeight: '600', color: color.text.primary, marginTop: space.sm },
  input: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  row: { flexDirection: 'row', gap: space.sm },
  seg: { flex: 1, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', backgroundColor: color.bg.surface },
  segOn: { borderColor: color.brand.primary, backgroundColor: 'rgba(197,106,51,0.1)' },
  segText: { color: color.text.muted, fontSize: 13 },
  segTextOn: { color: color.text.primary, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: color.bg.surface },
  chipOn: { backgroundColor: color.brand.primary, borderColor: color.brand.primary },
  chipText: { color: color.text.primary, fontSize: 13 },
  chipTextOn: { color: color.text.onDark, fontWeight: '600' },
});
