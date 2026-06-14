import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { IconAvancar, IconAvulsos, IconCustos, IconRelatorios, type LucideIcon } from '@/components/icons';
import { color, radius, space } from '@/theme';

// Aba "Gestão" — menu do módulo de gestão do marceneiro.
const ITEMS: { Icon: LucideIcon; title: string; desc: string; href: string }[] = [
  { Icon: IconCustos, title: 'Catálogo de custos', desc: 'Materiais e serviços com seu custo', href: '/(app)/catalogo-custos' },
  { Icon: IconAvulsos, title: 'Orçamentos avulsos', desc: 'Propostas para clientes fora da plataforma', href: '/(app)/avulsos' },
  { Icon: IconRelatorios, title: 'Relatórios', desc: 'Ganhos, custos e conversão', href: '/(app)/relatorios' },
];

export default function GestaoScreen() {
  const router = useRouter();
  return (
    <ScrollView style={{ backgroundColor: color.bg.base }} contentContainerStyle={styles.container}>
      <Text style={styles.help}>Sua gestão financeira gratuita.</Text>
      {ITEMS.map(({ Icon, ...it }) => (
        <Pressable key={it.href} style={styles.card} onPress={() => router.push(it.href)}>
          <Icon size={28} color={color.brand.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{it.title}</Text>
            <Text style={styles.desc}>{it.desc}</Text>
          </View>
          <IconAvancar size={22} color={color.text.subtle} strokeWidth={2} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  help: { color: color.text.muted, fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  title: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  desc: { fontSize: 13, color: color.text.muted },
});
