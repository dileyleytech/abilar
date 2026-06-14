import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { listConversations, type ConversationRow } from '@/lib/data';
import { EmptyState, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function ConversasScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ConversationRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setItems(await listConversations(profile.id));
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

  if (items === null) return <Loading label="Carregando conversas…" />;

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand.primary} />}
      ListEmptyComponent={
        <EmptyState emoji="💬" title="Nenhuma conversa ainda" subtitle="As conversas aparecem após a pré-aprovação de um orçamento." />
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/(app)/conversas/${item.id}`)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.otherName[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.otherName}
            </Text>
            <Text style={styles.project} numberOfLines={1}>
              {item.projects?.title ?? 'Projeto'}
            </Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  empty: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: space.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.bg.deep, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: color.brand.secondary },
  name: { fontSize: 16, fontWeight: '600', color: color.text.primary },
  project: { fontSize: 13, color: color.text.muted },
  chev: { fontSize: 24, color: color.text.subtle },
});
