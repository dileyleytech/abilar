import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
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
import { api } from '@/lib/api';
import { Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

type Msg = { id: string; senderId: string; text: string; hasPhoto: boolean };

function toMsg(m: MessageRow): Msg {
  return {
    id: m.id,
    senderId: m.sender_id,
    text: m.redacted_body ?? m.body,
    hasPhoto: (m.attachments?.length ?? 0) > 0,
  };
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [conv, setConv] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const meId = profile?.id;
  const active = conv?.status === 'ACTIVE';

  useEffect(() => {
    if (!id || !meId) return;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const [c, ms] = await Promise.all([getConversation(id, meId), listMessages(id)]);
      setConv(c);
      setMessages(ms.map(toMsg));
      cleanup = await subscribeMessages(id, (raw) => {
        setMessages((prev) => {
          const real = toMsg(raw);
          if (!prev) return [real];
          if (prev.some((x) => x.id === real.id)) return prev;
          const cleaned = prev.filter((x) => !(x.id.startsWith('temp-') && x.senderId === real.senderId));
          return [...cleaned, real];
        });
      });
    })();
    return () => cleanup?.();
  }, [id, meId]);

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || !id || !meId) return;
    setText('');
    const temp: Msg = { id: `temp-${Date.now()}`, senderId: meId, text: body, hasPhoto: false };
    setMessages((prev) => [...(prev ?? []), temp]);
    setSending(true);
    try {
      await api.sendMessage(id, body);
    } catch (e) {
      setMessages((prev) => (prev ?? []).filter((x) => x.id !== temp.id));
      setText(body);
      alert(e instanceof Error ? e.message : 'Falha ao enviar.');
    } finally {
      setSending(false);
    }
  };

  if (!messages) return <Loading label="Abrindo conversa…" />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen options={{ title: conv?.otherName ?? 'Conversa' }} />
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
                {item.hasPhoto ? <Text style={[styles.photo, mine && styles.photoMine]}>📷 Foto (veja no site)</Text> : null}
                {item.text ? <Text style={[styles.text, mine && styles.textMine]}>{item.text}</Text> : null}
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
        {active ? (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Mensagem…"
              placeholderTextColor={color.text.subtle}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]} onPress={send} disabled={!text.trim() || sending}>
              <Text style={styles.sendText}>Enviar</Text>
            </Pressable>
          </View>
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
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: color.brand.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: color.bg.deep, borderBottomLeftRadius: 4 },
  text: { fontSize: 16, color: color.text.primary },
  textMine: { color: color.text.onDark },
  photo: { fontSize: 14, color: color.text.muted, marginBottom: 2 },
  photoMine: { color: color.text.onDark },
  composer: { borderTopWidth: 1, borderTopColor: color.border.subtle, backgroundColor: color.bg.surface, padding: space.sm, gap: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
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
