import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import {
  listClientProjects,
  listOpenProjects,
  listProjectsByStatus,
  type ProjectRow,
} from '@/lib/data';
import { PROJECT_STATUS_LABEL, type ProjectStatus } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Badge, EmptyState, Loading } from '@/components/ui';
import { color, radius, space } from '@/theme';

type Section = { title: string; data: ProjectRow[] };
const isObra = (s: ProjectStatus) => s === 'HIRED' || s === 'EXECUTED';

export default function PedidosScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const isCarpenter = profile?.role === 'CARPENTER';
  const [sections, setSections] = useState<Section[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    let next: Section[] = [];
    try {
      if (isCarpenter) {
        const [obras, open] = await Promise.all([
          listProjectsByStatus(['HIRED', 'EXECUTED']),
          listOpenProjects(),
        ]);
        next = [
          { title: '🏗️ Em obra', data: obras },
          { title: 'Pedidos na região', data: open },
        ];
      } else {
        const all = await listClientProjects(profile.id);
        next = [
          { title: '🏗️ Em obra', data: all.filter((p) => isObra(p.status)) },
          { title: 'Meus pedidos', data: all.filter((p) => !isObra(p.status)) },
        ];
      }
    } catch {
      next = [];
    }
    setSections(next.filter((s) => s.data.length > 0));
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

  if (sections === null) return <Loading label="Carregando pedidos…" />;

  if (sections.length === 0) {
    return (
      <View style={styles.flex}>
        <EmptyState
          emoji={isCarpenter ? '🔍' : '🪵'}
          title={isCarpenter ? 'Nada por aqui ainda' : 'Você ainda não tem pedidos'}
          subtitle={isCarpenter ? 'Novos pedidos da região aparecem aqui.' : 'Crie um pedido no site para começar.'}
        />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand.primary} />}
      renderSectionHeader={({ section }) => <Text style={styles.heading}>{section.title}</Text>}
      renderItem={({ item }) => {
        const obra = isObra(item.status);
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/(app)/pedidos/${item.id}`)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Badge label={PROJECT_STATUS_LABEL[item.status] ?? item.status} tone={obra ? 'success' : 'primary'} />
            </View>
            <Text style={styles.cardMeta}>
              {item.city ? `${item.city} · ` : ''}
              {formatDate(item.created_at)}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg.base },
  list: { padding: space.lg, gap: space.md },
  heading: { fontSize: 18, fontWeight: '700', color: color.text.primary, marginTop: space.sm, marginBottom: 2 },
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
