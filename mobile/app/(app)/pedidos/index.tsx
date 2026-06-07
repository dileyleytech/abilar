import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { listClientProjects, listOpenProjects, type ProjectRow } from '@/lib/data';
import { PROJECT_STATUS_LABEL } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Badge, EmptyState, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function PedidosScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const isCarpenter = profile?.role === 'CARPENTER';
  const [items, setItems] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const data = isCarpenter ? await listOpenProjects() : await listClientProjects(profile.id);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
      setItems([]);
    }
  }, [profile, isCarpenter]);

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

  if (items === null) return <Loading label="Carregando pedidos…" />;

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand.primary} />}
      ListHeaderComponent={
        <Text style={styles.heading}>{isCarpenter ? 'Pedidos na região' : 'Meus pedidos'}</Text>
      }
      ListEmptyComponent={
        <EmptyState
          emoji={isCarpenter ? '🔍' : '🪵'}
          title={error ?? (isCarpenter ? 'Nenhum pedido aberto agora' : 'Você ainda não tem pedidos')}
          subtitle={isCarpenter ? 'Volte mais tarde para novos pedidos.' : 'Crie um pedido no site para começar.'}
        />
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/(app)/pedidos/${item.id}`)}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Badge label={PROJECT_STATUS_LABEL[item.status] ?? item.status} tone="primary" />
          </View>
          <Text style={styles.cardMeta}>
            {item.city ? `${item.city} · ` : ''}
            {formatDate(item.created_at)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md },
  empty: { flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: '700', color: color.text.primary, marginBottom: space.sm },
  card: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: space.lg,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: color.text.primary },
  cardMeta: { fontSize: 13, color: color.text.muted },
});
