import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api, type DesignStateView, type DesignModuleView } from '@/lib/api';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { IconEnviar, IconAbi } from '@/components/icons';
import { color, radius, space } from '@/theme';

type Msg = { role: 'USER' | 'ABI'; text: string };
const TYPE_LABEL: Record<string, string> = {
  GUARDA_ROUPA: 'Guarda-roupa', COZINHA: 'Cozinha', PAINEL_TV: 'Painel de TV', ESTANTE: 'Estante',
  HOME_OFFICE: 'Home office', BANHEIRO: 'Banheiro', LAVANDERIA: 'Lavanderia', OUTRO: 'Móvel',
};
const cm = (mm: number) => mm / 10;

export default function SugerirScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const [state, setState] = useState<DesignStateView | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ABI', text: 'Edite uma cópia do projeto. Ao terminar, envie como sugestão (o cliente aprova) ou aplique como edição da sua proposta.' },
  ]);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    try { const r = await api.getDesignState(projectId); setState(r.state); } catch { setState({ modules: [] }); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { scroller.current?.scrollToEnd({ animated: true }); }, [messages]);

  const say = (m: Msg) => setMessages((p) => [...p, m]);

  const send = async (raw: string) => {
    const u = raw.trim();
    if (!u || busy || !projectId || !state) return;
    setText('');
    say({ role: 'USER', text: u });
    setBusy(true);
    try {
      const r = await api.proposalTurn(projectId, state, u);
      if (r.command.intent !== 'ASK_HELP' && r.command.intent !== 'UNDO') setState(r.state);
      say({ role: 'ABI', text: r.message });
    } catch (e) {
      say({ role: 'ABI', text: e instanceof Error ? e.message : 'Não consegui entender agora.' });
    } finally { setBusy(false); }
  };

  const submit = async (type: 'SUGGESTION' | 'EDIT') => {
    if (busy || !projectId || !state) return;
    setBusy(true);
    try {
      await api.createProposal(projectId, type, note.trim() || undefined, state);
      Alert.alert(type === 'SUGGESTION' ? 'Sugestão enviada' : 'Edição registrada', type === 'SUGGESTION' ? 'O cliente vai aprovar a sua sugestão.' : 'Registrada na sua proposta.');
      router.back();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível enviar.');
      setBusy(false);
    }
  };

  if (!state) return <Loading label="Carregando…" />;

  return (
    <>
      <Stack.Screen options={{ title: 'Sugerir mudança' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: 6 }}>
            <Text style={styles.summaryTitle}>Projeto proposto</Text>
            {state.modules.map((m: DesignModuleView) => (
              <View key={m.id} style={styles.modRow}>
                <Text style={styles.modTitle}>{m.label?.trim() || TYPE_LABEL[m.type] || 'Móvel'}</Text>
                <Text style={styles.modDims}>{`${cm(m.widthMm)}×${cm(m.heightMm)}×${cm(m.depthMm)} cm`}</Text>
                <View style={styles.badges}>
                  {m.finish ? <Badge label={m.finish} tone="primary" /> : null}
                  {m.material ? <Badge label={m.material} tone="neutral" /> : null}
                  {m.lighting ? <Badge label="LED" tone="success" /> : null}
                </View>
              </View>
            ))}
          </Card>

          {messages.map((m, i) => (
            <View key={i} style={m.role === 'USER' ? styles.userRow : styles.abiRow}>
              {m.role === 'ABI' && <View style={styles.avatar}><IconAbi size={15} color={color.brand.secondary} /></View>}
              <View style={[styles.bubble, m.role === 'USER' ? styles.userBubble : styles.abiBubble]}>
                <Text style={m.role === 'USER' ? styles.userText : styles.abiText}>{m.text}</Text>
              </View>
            </View>
          ))}
          {busy && <Text style={styles.thinking}>processando…</Text>}

          <TextInput style={styles.noteInput} placeholder="Mensagem ao cliente (opcional)…" placeholderTextColor={color.text.subtle} value={note} onChangeText={setNote} multiline />
          <Button title="Enviar sugestão ao cliente" variant="secondary" onPress={() => submit('SUGGESTION')} loading={busy} />
          <Button title="Aplicar como edição da proposta" variant="outline" onPress={() => submit('EDIT')} loading={busy} />
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Ex.: gaveteiro de 4 no lugar das portas…" placeholderTextColor={color.text.subtle} value={text} onChangeText={setText} editable={!busy} onSubmitEditing={() => send(text)} returnKeyType="send" />
          <Pressable onPress={() => send(text)} disabled={busy || !text.trim()} style={[styles.sendBtn, (busy || !text.trim()) && styles.sendDisabled]} accessibilityLabel="Enviar"><IconEnviar size={20} color={color.text.onDark} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg.base },
  body: { padding: space.lg, gap: space.md },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: color.text.muted },
  modRow: { gap: 4 },
  modTitle: { fontSize: 15, fontWeight: '600', color: color.text.primary },
  modDims: { fontSize: 13, color: color.text.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  userRow: { alignItems: 'flex-end' },
  abiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  avatar: { width: 28, height: 28, borderRadius: 999, backgroundColor: 'rgba(47,107,94,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bubble: { maxWidth: '82%', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  userBubble: { backgroundColor: color.brand.primary, borderTopRightRadius: 4 },
  abiBubble: { backgroundColor: color.bg.surface, borderTopLeftRadius: 4, borderWidth: 1, borderColor: color.border.subtle },
  userText: { color: color.text.onDark, fontSize: 14 },
  abiText: { color: color.text.primary, fontSize: 14 },
  thinking: { color: color.text.subtle, fontSize: 13, paddingLeft: 34 },
  noteInput: { backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: color.text.primary, minHeight: 60 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.md, borderTopWidth: 1, borderTopColor: color.border.subtle, backgroundColor: color.bg.surface },
  input: { flex: 1, backgroundColor: color.bg.base, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: color.text.primary },
  sendBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: color.brand.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
