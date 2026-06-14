import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button, Card } from '@/components/ui';
import { IconEditar } from '@/components/icons';
import { color, radius, space } from '@/theme';

const PRIVACY_URL = 'https://abilar.com.br/privacidade';

const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Cliente',
  CARPENTER: 'Marceneiro',
  ARCHITECT: 'Arquiteto',
  ADMIN: 'Administrador',
};

export default function ContaScreen() {
  const { profile, session, signOut, reloadProfile } = useAuth();
  const router = useRouter();
  const user = session?.user;

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [pwd, setPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const saveName = async () => {
    if (name.trim().length < 2) return Alert.alert('Nome', 'Informe um nome válido.');
    setSavingName(true);
    try {
      await api.updateName(name.trim());
      await reloadProfile();
      setEditingName(false);
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    if (pwd.length < 8) return Alert.alert('Senha', 'A senha precisa de ao menos 8 caracteres.');
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw new Error(error.message);
      setPwd('');
      Alert.alert('Pronto', 'Senha salva. Você já pode entrar com e-mail/telefone + senha.');
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível salvar a senha.');
    } finally {
      setSavingPwd(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Excluir conta', 'Isso apaga sua conta e seus dados permanentemente. Esta ação não pode ser desfeita.', [
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
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Card style={{ gap: space.sm }}>
          {editingName ? (
            <View style={{ gap: space.sm }}>
              <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus placeholder="Seu nome" placeholderTextColor={color.text.subtle} />
              <View style={styles.rowGap}>
                <View style={styles.flex1}><Button title="Salvar" onPress={saveName} loading={savingName} /></View>
                <View style={styles.flex1}><Button title="Cancelar" variant="outline" onPress={() => setEditingName(false)} /></View>
              </View>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile?.name || 'Sem nome'}</Text>
              <Pressable onPress={() => { setName(profile?.name ?? ''); setEditingName(true); }} hitSlop={8}>
                <IconEditar size={20} color={color.text.muted} strokeWidth={2} />
              </Pressable>
            </View>
          )}
          <Text style={styles.role}>{ROLE_LABEL[profile?.role ?? ''] ?? profile?.role}</Text>
          <View style={styles.divider} />
          {user?.email ? <Row label="E-mail" value={user.email} /> : null}
          {user?.phone ? <Row label="Telefone" value={`+${user.phone}`} /> : null}
        </Card>

        <Card style={{ gap: space.sm }}>
          <Text style={styles.section}>Senha</Text>
          <Text style={styles.muted}>Defina uma senha para entrar sem código (e-mail/telefone + senha).</Text>
          <TextInput style={styles.input} value={pwd} onChangeText={setPwd} secureTextEntry placeholder="Nova senha (mín. 8)" placeholderTextColor={color.text.subtle} />
          <Button title="Salvar senha" onPress={savePassword} loading={savingPwd} />
        </Card>

        {profile?.role === 'CARPENTER' && (
          <Button title="Perfil profissional" variant="outline" onPress={() => router.push('/(app)/marceneiro-perfil')} />
        )}

        <Button title="Sair" variant="outline" onPress={signOut} />

        <View style={{ gap: space.sm }}>
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Política de privacidade</Text>
          <Text style={styles.danger} onPress={confirmDelete}>Excluir minha conta</Text>
        </View>

        <Text style={styles.version}>Abilar · app de teste (Expo Go)</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  flex: { flex: 1, backgroundColor: color.bg.base },
  container: { padding: space.lg, gap: space.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1, fontSize: 20, fontWeight: '700', color: color.text.primary },
  role: { fontSize: 15, color: color.brand.secondary, fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  muted: { color: color.text.muted, fontSize: 13 },
  divider: { height: 1, backgroundColor: color.border.subtle, marginVertical: space.sm },
  input: { backgroundColor: color.bg.base, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: color.text.primary },
  rowGap: { flexDirection: 'row', gap: space.sm },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  rowLabel: { color: color.text.muted },
  rowValue: { color: color.text.primary, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  link: { textAlign: 'center', color: color.text.muted, textDecorationLine: 'underline' },
  danger: { textAlign: 'center', color: color.state.danger, textDecorationLine: 'underline', paddingVertical: space.sm },
  version: { textAlign: 'center', color: color.text.subtle, fontSize: 12, marginTop: space.xl },
});
