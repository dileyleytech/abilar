import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, type DesignStateView, type DesignModuleView } from '@/lib/api';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { IconAbi, IconEnviar, IconVoltar, IconFoto } from '@/components/icons';
import { color, radius, space } from '@/theme';

type Msg = { role: 'USER' | 'ABI'; text: string };

const TYPE_LABEL: Record<string, string> = {
  GUARDA_ROUPA: 'Guarda-roupa', COZINHA: 'Cozinha', PAINEL_TV: 'Painel de TV', ESTANTE: 'Estante',
  HOME_OFFICE: 'Home office', BANHEIRO: 'Banheiro', LAVANDERIA: 'Lavanderia', OUTRO: 'Móvel',
};
const HARDWARE_LABEL: Record<string, string> = { PUSH: 'Toque', PUXADOR_CAVA: 'Puxador cava', SOFT_CLOSE: 'Soft-close' };
const EXAMPLES = ['Muda a cor para verde', 'Aumenta a altura em 10 cm', 'Adiciona uma gaveta embaixo', 'Coloca soft-close'];
const cm = (mm: number) => mm / 10;

export default function DesignScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [state, setState] = useState<DesignStateView | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<DesignStateView[]>([]);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ABI', text: 'Oi, eu sou a ABI 👋 Me diga o que quer mudar no seu móvel — a cor, o tamanho, ou adicionar gavetas.' },
  ]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    try { const r = await api.getDesignState(projectId); setState(r.state); setPreviewUrl(r.previewUrl); } catch { setState({ modules: [] }); }
  }, [projectId]);

  const generate = async () => {
    if (generating || !projectId) return;
    setGenerating(true);
    say({ role: 'ABI', text: 'Beleza! Vou gerar uma prévia do seu móvel — leva alguns segundos.' });
    try {
      const r = await api.designPreview(projectId);
      if (r.queued) { say({ role: 'ABI', text: 'Estou gerando sua prévia — ela aparece aqui em instantes.' }); }
      else { if (r.url) setPreviewUrl(r.url); say({ role: 'ABI', text: 'Prontinho! Sua prévia está aí em cima. 🎨' }); }
    } catch (e) {
      say({ role: 'ABI', text: e instanceof Error ? e.message : 'Não consegui gerar a prévia agora.' });
    } finally { setGenerating(false); }
  };
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { scroller.current?.scrollToEnd({ animated: true }); }, [messages]);

  const say = (m: Msg) => setMessages((prev) => [...prev, m]);

  const doUndo = async () => {
    if (history.length === 0) { say({ role: 'ABI', text: 'Não há nada para desfazer.' }); return; }
    const prev = history[history.length - 1]!;
    setBusy(true);
    try {
      await api.designRestore(projectId!, prev);
      setState(prev);
      setHistory((h) => h.slice(0, -1));
      say({ role: 'ABI', text: 'Pronto, desfiz a última alteração.' });
    } catch (e) {
      say({ role: 'ABI', text: e instanceof Error ? e.message : 'Não consegui desfazer.' });
    } finally { setBusy(false); }
  };

  const send = async (raw: string) => {
    const utterance = raw.trim();
    if (!utterance || busy || !projectId) return;
    setText('');
    say({ role: 'USER', text: utterance });
    const before = state;
    setBusy(true);
    try {
      const r = await api.designTurn(projectId, utterance);
      if (r.command.intent === 'UNDO') { setBusy(false); await doUndo(); return; }
      if (r.command.intent !== 'ASK_HELP' && before) setHistory((h) => [...h, before]);
      setState(r.state);
      say({ role: 'ABI', text: r.message });
    } catch (e) {
      say({ role: 'ABI', text: e instanceof Error ? e.message : 'Não consegui entender agora.' });
    } finally { setBusy(false); }
  };

  if (!state) return <Loading label="Carregando…" />;

  return (
    <>
      <Stack.Screen options={{ title: 'Conversar com a ABI' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: 8 }}>
            <View style={styles.previewHead}>
              <Text style={styles.summaryTitle}>Prévia da ABI</Text>
              <Button title={previewUrl ? 'Atualizar' : 'Gerar prévia'} variant="outline" icon={(p) => <IconFoto {...p} />} onPress={generate} loading={generating} />
            </View>
            {generating ? (
              <View style={styles.previewPlaceholder}><Text style={styles.muted}>Gerando sua prévia…</Text></View>
            ) : previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.previewImg} contentFit="cover" />
            ) : (
              <Text style={styles.muted}>Gere uma imagem ilustrativa do seu móvel. A imagem é só ilustrativa — as medidas reais ficam no pedido.</Text>
            )}
          </Card>

          <Card style={{ gap: 6 }}>
            <Text style={styles.summaryTitle}>Como está o projeto</Text>
            {state.modules.map((m) => <ModuleRow key={m.id} m={m} />)}
          </Card>

          {messages.map((m, i) => (
            <View key={i} style={m.role === 'USER' ? styles.userRow : styles.abiRow}>
              {m.role === 'ABI' && (
                <View style={styles.avatar}><IconAbi size={15} color={color.brand.secondary} /></View>
              )}
              <View style={[styles.bubble, m.role === 'USER' ? styles.userBubble : styles.abiBubble]}>
                <Text style={m.role === 'USER' ? styles.userText : styles.abiText}>{m.text}</Text>
              </View>
            </View>
          ))}
          {busy && <Text style={styles.thinking}>a ABI está pensando…</Text>}
        </ScrollView>

        <View style={styles.chips}>
          {EXAMPLES.map((ex) => (
            <Pressable key={ex} disabled={busy} onPress={() => send(ex)} style={styles.chip}>
              <Text style={styles.chipText}>{ex}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          {history.length > 0 && (
            <Pressable onPress={doUndo} disabled={busy} style={styles.undo} accessibilityLabel="Desfazer">
              <IconVoltar size={20} color={color.text.muted} />
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            placeholder="Ex.: deixa as portas em carvalho…"
            placeholderTextColor={color.text.subtle}
            value={text}
            onChangeText={setText}
            editable={!busy}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
          />
          <Pressable onPress={() => send(text)} disabled={busy || !text.trim()} style={[styles.sendBtn, (busy || !text.trim()) && styles.sendDisabled]} accessibilityLabel="Enviar">
            <IconEnviar size={20} color={color.text.onDark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function ModuleRow({ m }: { m: DesignModuleView }) {
  return (
    <View style={styles.modRow}>
      <Text style={styles.modTitle}>{TYPE_LABEL[m.type] ?? m.type}</Text>
      <Text style={styles.modDims}>{`${cm(m.widthMm)}×${cm(m.heightMm)}×${cm(m.depthMm)} cm`}</Text>
      <View style={styles.badges}>
        {m.finish ? <Badge label={m.finish} tone="primary" /> : null}
        {m.material ? <Badge label={m.material} tone="neutral" /> : null}
        {m.hardware ? <Badge label={HARDWARE_LABEL[m.hardware] ?? m.hardware} tone="neutral" /> : null}
        {m.lighting ? <Badge label="LED" tone="success" /> : null}
        {m.items?.map((it, k) => <Badge key={k} label={`${it.qty}× ${it.type.toLowerCase()}`} tone="neutral" />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg.base },
  body: { padding: space.lg, gap: space.md },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: color.text.muted },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  previewImg: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: color.bg.deep },
  previewPlaceholder: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: color.bg.deep, alignItems: 'center', justifyContent: 'center' },
  muted: { color: color.text.muted, fontSize: 13 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: space.lg, paddingBottom: 6 },
  chip: { borderWidth: 1, borderColor: color.border.subtle, backgroundColor: color.bg.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, color: color.text.muted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.md, borderTopWidth: 1, borderTopColor: color.border.subtle, backgroundColor: color.bg.surface },
  undo: { padding: 8 },
  input: { flex: 1, backgroundColor: color.bg.base, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: color.text.primary },
  sendBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: color.brand.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
