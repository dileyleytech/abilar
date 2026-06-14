import { useCallback, useState } from 'react';
import { DeviceEventEmitter, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { listNotifications, type NotificationRow } from '@/lib/data';
import { api } from '@/lib/api';
import { EmptyState, Loading } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { NOTIF_READ_EVENT } from '@/lib/events';
import { color, radius, space } from '@/theme';

// Converte o link da notificação (rota web) para a rota do app.
function toMobileRoute(link: string | null): string | null {
  if (!link) return null;
  const m = link.match(/\/(pedidos|conversas|contratos)\/([0-9a-f-]+)/i);
  if (m) return `/(app)/${m[1]}/${m[2]}`;
  if (link.includes('/marceneiro/pedidos/')) {
    const id = link.split('/marceneiro/pedidos/')[1]?.split(/[/?#]/)[0];
    if (id) return `/(app)/pedidos/${id}`;
  }
  return null;
}

export default function AvisosScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setItems(await listNotifications(profile.id));
    } catch {
      setItems([]);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await api.markNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => (prev ?? []).map((n) => (n.read_at ? n : { ...n, read_at: now })));
      DeviceEventEmitter.emit(NOTIF_READ_EVENT); // zera o badge
    } catch {
      // silencioso
    } finally {
      setMarking(false);
    }
  };

  if (items === null) return <Loading label="Carregando avisos…" />;

  const hasUnread = items.some((n) => !n.read_at);

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand.primary} />}
      ListHeaderComponent={
        hasUnread ? (
          <Pressable onPress={markAll} disabled={marking} style={styles.markBtn}>
            <Text style={styles.markText}>{marking ? 'Marcando…' : 'Marcar todas como lidas'}</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={<EmptyState emoji="🔔" title="Sem avisos" subtitle="Mudanças nos seus pedidos e obras aparecem aqui." />}
      renderItem={({ item }) => {
        const route = toMobileRoute(item.link);
        return (
          <Pressable
            style={[styles.card, !item.read_at && styles.unread]}
            disabled={!route}
            onPress={() => route && router.push(route)}
          >
            <Text style={styles.title}>{item.title}</Text>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
            <Text style={styles.date}>{formatDateTime(item.created_at)}{route ? '  ›' : ''}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  empty: { flexGrow: 1 },
  header: { marginBottom: space.sm, gap: space.sm },
  heading: { fontSize: 24, fontWeight: '700', color: color.text.primary },
  markBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8 },
  markText: { color: color.text.primary, fontWeight: '600', fontSize: 13 },
  card: { backgroundColor: color.bg.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.border.subtle, padding: space.lg, gap: 4 },
  unread: { borderColor: color.brand.primary, backgroundColor: 'rgba(197,106,51,0.06)' },
  title: { fontSize: 16, fontWeight: '600', color: color.text.primary },
  body: { fontSize: 14, color: color.text.muted },
  date: { fontSize: 12, color: color.text.subtle },
});
