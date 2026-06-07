import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { getConversation, listMessages, type ConversationRow, type MessageRow } from '@/lib/data';
import { subscribeMessages } from '@/lib/realtime';
import { api, type Photo } from '@/lib/api';
import { chooseAndPick } from '@/lib/pickImages';
import { Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

type Msg = { id: string; senderId: string; text: string; images: string[] };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [conv, setConv] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const meId = profile?.id;
  const active = conv?.status === 'ACTIVE';

  const signPaths = useCallback(
    async (paths: string[]): Promise<string[]> => {
      if (!id || paths.length === 0) return [];
      try {
        const r = await api.signedUrls(paths, { conversationId: id });
        return r.urls;
      } catch {
        return [];
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id || !meId) return;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const [c, ms] = await Promise.all([getConversation(id, meId), listMessages(id)]);
      setConv(c);
      const allPaths = ms.flatMap((m) => m.attachments ?? []);
      const urls = await signPaths(allPaths);
      const map = new Map<string, string>();
      allPaths.forEach((p, i) => { if (urls[i]) map.set(p, urls[i]); });
      setMessages(
        ms.map((m) => ({
          id: m.id,
          senderId: m.sender_id,
          text: m.redacted_body ?? m.body,
          images: (m.attachments ?? []).map((p) => map.get(p)).filter((u): u is string => !!u),
        })),
      );
      cleanup = await subscribeMessages(id, (raw: MessageRow) => {
        void (async () => {
          const imgs = await signPaths(raw.attachments ?? []);
          const real: Msg = { id: raw.id, senderId: raw.sender_id, text: raw.redacted_body ?? raw.body, images: imgs };
          setMessages((prev) => {
            if (!prev) return [real];
            if (prev.some((x) => x.id === real.id)) return prev;
            const cleaned = prev.filter((x) => !(x.id.startsWith('temp-') && x.senderId === real.senderId));
            return [...cleaned, real];
          });
        })();
      });
    })();
    return () => cleanup?.();
  }, [id, meId, signPaths]);

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const addPhotos = async () => {
    const picked = await chooseAndPick(4 - photos.length);
    if (picked.length) setPhotos((p) => [...p, ...picked].slice(0, 4));
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && photos.length === 0) || !id || !meId) return;
    const sent = photos;
    setText('');
    setPhotos([]);
    const temp: Msg = { id: `temp-${Date.now()}`, senderId: meId, text: body, images: sent.map((p) => p.uri) };
    setMessages((prev) => [...(prev ?? []), temp]);
    setSending(true);
    try {
      await api.sendMessage(id, body, sent);
    } catch (e) {
      setMessages((prev) => (prev ?? []).filter((x) => x.id !== temp.id));
      setText(body);
      setPhotos(sent);
      Alert.alert('Ops', e instanceof Error ? e.message : 'Falha ao enviar.');
    } finally {
      setSending(false);
    }
  };

  const report = () => {
    if (!id) return;
    const send = (reason: string) =>
      api.report(id, reason, '').then(
        () => Alert.alert('Obrigado', 'Sua denúncia foi registrada e será revisada.'),
        (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Falha ao denunciar.'),
      );
    Alert.alert('Denunciar conversa', 'Qual o motivo?', [
      { text: 'Tentou negociar/pagar por fora', onPress: () => send('CONTACT_OUTSIDE') },
      { text: 'Golpe ou fraude', onPress: () => send('SCAM') },
      { text: 'Ofensa ou assédio', onPress: () => send('HARASSMENT') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (!messages) return <Loading label="Abrindo conversa…" />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 44}>
      <Stack.Screen
        options={{
          title: conv?.otherName ?? 'Conversa',
          headerRight: () => (
            <Pressable onPress={report} hitSlop={10}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollEnd}
        ListEmptyComponent={<Text style={styles.empty}>Comece a conversa. Combine detalhes e prazos por aqui.</Text>}
        renderItem={({ item }) => {
          const mine = item.senderId === meId;
          return (
            <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                {item.images.map((u, i) => (
                  <Image key={i} source={{ uri: u }} style={styles.img} />
                ))}
                {item.text ? <Text style={[styles.text, mine && styles.textMine]}>{item.text}</Text> : null}
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
        {active ? (
          <>
            {photos.length > 0 && (
              <View style={styles.previews}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.previewWrap}>
                    <Image source={{ uri: p.uri }} style={styles.preview} />
                    <Pressable style={styles.removeP} onPress={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}>
                      <Text style={styles.removePText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.inputRow}>
              <Pressable style={styles.attachBtn} onPress={addPhotos}>
                <Text style={{ fontSize: 20 }}>📎</Text>
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="Mensagem…"
                placeholderTextColor={color.text.subtle}
                value={text}
                onChangeText={setText}
                multiline
              />
              <Pressable
                style={[styles.sendBtn, (!text.trim() && photos.length === 0) || sending ? { opacity: 0.5 } : null]}
                onPress={send}
                disabled={(!text.trim() && photos.length === 0) || sending}
              >
                <Text style={styles.sendText}>Enviar</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.closed}>Esta conversa está fechada.</Text>
        )}
        <Text style={styles.hint}>🔒 Telefone, e-mail e links são ocultados. Feche o negócio pela plataforma.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg.base },
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  empty: { textAlign: 'center', color: color.text.muted, marginTop: space.xxl },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  mine: { backgroundColor: color.brand.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: color.bg.deep, borderBottomLeftRadius: 4 },
  text: { fontSize: 16, color: color.text.primary },
  textMine: { color: color.text.onDark },
  img: { width: 180, height: 180, borderRadius: radius.md },
  composer: { borderTopWidth: 1, borderTopColor: color.border.subtle, backgroundColor: color.bg.surface, padding: space.sm, gap: 6 },
  previews: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  previewWrap: { position: 'relative' },
  preview: { width: 56, height: 56, borderRadius: radius.sm },
  removeP: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: color.text.primary, alignItems: 'center', justifyContent: 'center' },
  removePText: { color: '#fff', fontSize: 11 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  attachBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: color.bg.base,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 16,
    color: color.text.primary,
  },
  sendBtn: { backgroundColor: color.brand.primary, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 12 },
  sendText: { color: color.text.onDark, fontWeight: '600', fontSize: 15 },
  closed: { textAlign: 'center', color: color.text.muted, paddingVertical: space.sm },
  hint: { fontSize: 11, color: color.text.subtle, textAlign: 'center' },
});
