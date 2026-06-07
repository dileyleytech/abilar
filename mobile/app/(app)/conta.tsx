import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { Button, Card } from '@/components/ui';
import { color, space } from '@/theme';

const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Cliente',
  CARPENTER: 'Marceneiro',
  ARCHITECT: 'Arquiteto',
  ADMIN: 'Administrador',
};

export default function ContaScreen() {
  const { profile, session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const user = session?.user;

  return (
    <ScrollView style={{ backgroundColor: color.bg.base }} contentContainerStyle={[styles.container, { paddingTop: insets.top + space.xl }]}>
      <Text style={styles.heading}>Minha conta</Text>

      <Card style={{ gap: space.sm }}>
        <Text style={styles.name}>{profile?.name || 'Sem nome'}</Text>
        <Text style={styles.role}>{ROLE_LABEL[profile?.role ?? ''] ?? profile?.role}</Text>
        <View style={styles.divider} />
        {user?.email ? <Row label="E-mail" value={user.email} /> : null}
        {user?.phone ? <Row label="Telefone" value={`+${user.phone}`} /> : null}
      </Card>

      <Button title="Sair" variant="outline" onPress={signOut} />

      <Text style={styles.version}>Abilar · app de teste (Expo Go)</Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg },
  heading: { fontSize: 24, fontWeight: '700', color: color.text.primary },
  name: { fontSize: 20, fontWeight: '700', color: color.text.primary },
  role: { fontSize: 15, color: color.brand.secondary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: color.border.subtle, marginVertical: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  rowLabel: { color: color.text.muted },
  rowValue: { color: color.text.primary, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  version: { textAlign: 'center', color: color.text.subtle, fontSize: 12, marginTop: space.xl },
});
