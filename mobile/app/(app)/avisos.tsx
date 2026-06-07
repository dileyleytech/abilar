import { useCallback, useState } from 'react';
import { DeviceEventEmitter, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { listNotifications, type NotificationRow } from '@/lib/data';
import { api } from '@/lib/api';
import { EmptyState, Loading } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { color, radius, space } from '@/theme';

export const NOTIF_READ_EVENT = 'abilar:notif-read';

export default function AvisosScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await listNotifications(profile.id);
      setItems(data);
      // Marca como lidas e zera o badge.
      if (data.some((n) => !n.read_at)) {
        await api.markNotificationsRead().catch(() => {});
        DeviceEventEmitter.emit(NOTIF_READ_EVENT);
      }
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

  if (items === null) return <Loading label="Carregando avisos…" />;

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand.primary} />}
      ListHeaderComponent={<Text style={styles.heading}>Avisos</Text>}
      ListEmptyComponent={<EmptyState emoji="🔔" title="Sem avisos" subtitle="Mudanças nos seus pedidos e obras aparecem aqui." />}
      renderItem={({ item }) => (
        <View style={[styles.card, !item.read_at && styles.unread]}>
          <Text style={styles.title}>{item.title}</Text>
          {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
          <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  empty: { flexGrow: 1 },
  heading: { fontSize: 24, fontWeight: '700', color: color.text.primary, marginBottom: space.sm },
  card: { backgroundColor: color.bg.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.border.subtle, padding: space.lg, gap: 4 },
  unread: { borderColor: color.brand.primary, backgroundColor: 'rgba(197,106,51,0.06)' },
  title: { fontSize: 16, fontWeight: '600', color: color.text.primary },
  body: { fontSize: 14, color: color.text.muted },
  date: { fontSize: 12, color: color.text.subtle },
});
