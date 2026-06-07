import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { color, space } from '@/theme';

const PRIVACY_URL = 'https://abilar.com.br/privacidade';

const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Cliente',
  CARPENTER: 'Marceneiro',
  ARCHITECT: 'Arquiteto',
  ADMIN: 'Administrador',
};

export default function ContaScreen() {
  const { profile, session, signOut } = useAuth();
  const user = session?.user;

  const confirmDelete = () => {
    Alert.alert(
      'Excluir conta',
      'Isso apaga sua conta e seus dados permanentemente. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await signOut();
            } catch (e) {
              Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível excluir.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={{ backgroundColor: color.bg.base }} contentContainerStyle={styles.container}>
      <Card style={{ gap: space.sm }}>
        <Text style={styles.name}>{profile?.name || 'Sem nome'}</Text>
        <Text style={styles.role}>{ROLE_LABEL[profile?.role ?? ''] ?? profile?.role}</Text>
        <View style={styles.divider} />
        {user?.email ? <Row label="E-mail" value={user.email} /> : null}
        {user?.phone ? <Row label="Telefone" value={`+${user.phone}`} /> : null}
      </Card>

      <Button title="Sair" variant="outline" onPress={signOut} />

      <View style={{ gap: space.sm }}>
        <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
          Política de privacidade
        </Text>
        <Text style={styles.danger} onPress={confirmDelete}>
          Excluir minha conta
        </Text>
      </View>

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
  link: { textAlign: 'center', color: color.text.muted, textDecorationLine: 'underline' },
  danger: { textAlign: 'center', color: color.state.danger, textDecorationLine: 'underline', paddingVertical: space.sm },
  version: { textAlign: 'center', color: color.text.subtle, fontSize: 12, marginTop: space.xl },
});
