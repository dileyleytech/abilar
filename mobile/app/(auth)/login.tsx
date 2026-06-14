import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { IconTelefone, IconEmail, IconBloqueado } from '@/components/icons';
import { color, radius, space } from '@/theme';

type Method = 'phone' | 'email' | 'password';

const METHOD_META: Record<Method, { icon: typeof IconTelefone; label: string }> = {
  phone: { icon: IconTelefone, label: 'Celular' },
  email: { icon: IconEmail, label: 'E-mail' },
  password: { icon: IconBloqueado, label: 'Senha' },
};

// Normaliza telefone BR para E.164 (+55...). Aceita já com +.
function toE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed.replace(/[^\d+]/g, '');
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 12 ? `+${digits}` : `+55${digits}`;
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<Method>('phone');
  const [step, setStep] = useState<'enter' | 'otp'>('enter');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const switchMethod = (m: Method) => {
    setMethod(m);
    setStep('enter');
    setError(null);
    setToken('');
  };

  const sendPhone = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
      if (error) throw new Error(error.message);
      setStep('otp');
    });

  const sendEmail = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      if (error) throw new Error(error.message);
      setStep('otp');
    });

  const verify = () =>
    run(async () => {
      const args =
        method === 'phone'
          ? ({ phone: toE164(phone), token: token.trim(), type: 'sms' } as const)
          : ({ email: email.trim(), token: token.trim(), type: 'email' } as const);
      const { error } = await supabase.auth.verifyOtp(args);
      if (error) throw new Error(error.message);
      // onAuthStateChange faz a navegação.
    });

  const loginPassword = () =>
    run(async () => {
      const id = identifier.trim();
      const creds = id.includes('@') ? { email: id, password } : { phone: toE164(id), password };
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw new Error(error.message);
    });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.brand}>abilar</Text>
        <Text style={styles.subtitle}>Marcenaria sob medida, do orçamento à entrega.</Text>

        <View style={styles.tabs}>
          {(['phone', 'email', 'password'] as Method[]).map((m) => {
            const Icon = METHOD_META[m].icon;
            const activeTab = method === m;
            return (
              <Pressable
                key={m}
                onPress={() => switchMethod(m)}
                style={[styles.tab, activeTab && styles.tabActive]}
              >
                <Icon size={16} color={activeTab ? color.text.primary : color.text.muted} strokeWidth={2} />
                <Text style={[styles.tabText, activeTab && styles.tabTextActive]}>
                  {METHOD_META[m].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {method === 'phone' && step === 'enter' && (
          <>
            <Text style={styles.label}>Seu número de celular</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="(11) 98765-4321"
              placeholderTextColor={color.text.subtle}
              value={phone}
              onChangeText={setPhone}
            />
            <Button title="Enviar código por SMS" onPress={sendPhone} loading={loading} />
          </>
        )}

        {method === 'email' && step === 'enter' && (
          <>
            <Text style={styles.label}>Seu e-mail</Text>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="voce@exemplo.com"
              placeholderTextColor={color.text.subtle}
              value={email}
              onChangeText={setEmail}
            />
            <Button title="Enviar código por e-mail" onPress={sendEmail} loading={loading} />
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.label}>Digite o código que chegou</Text>
            <TextInput
              style={[styles.input, styles.code]}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="______"
              placeholderTextColor={color.text.subtle}
              value={token}
              onChangeText={(t) => setToken(t.replace(/\D/g, ''))}
            />
            <Button title="Entrar" onPress={verify} loading={loading} />
            <Pressable onPress={() => setStep('enter')}>
              <Text style={styles.link}>Voltar</Text>
            </Pressable>
          </>
        )}

        {method === 'password' && (
          <>
            <Text style={styles.label}>Telefone ou e-mail</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              placeholder="voce@exemplo.com"
              placeholderTextColor={color.text.subtle}
              value={identifier}
              onChangeText={setIdentifier}
            />
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Sua senha"
              placeholderTextColor={color.text.subtle}
              value={password}
              onChangeText={setPassword}
            />
            <Button title="Entrar" onPress={loginPassword} loading={loading} />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.hintRow}>
          <IconBloqueado size={12} color={color.text.subtle} strokeWidth={2} />
          <Text style={styles.hint}>
            Telefone, e-mail e links são protegidos. Negocie e pague pela plataforma (garantia do escrow).
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg.base },
  container: { padding: space.xl, gap: space.md, flexGrow: 1 },
  brand: { fontSize: 40, fontWeight: '700', color: color.brand.primary, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: color.text.muted, marginBottom: space.lg },
  tabs: { flexDirection: 'row', backgroundColor: color.bg.deep, borderRadius: radius.pill, padding: 4, marginBottom: space.md },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabActive: { backgroundColor: color.bg.surface },
  tabText: { fontSize: 13, fontWeight: '500', color: color.text.muted },
  tabTextActive: { color: color.text.primary },
  label: { fontSize: 15, color: color.text.primary, marginTop: space.sm },
  input: {
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: color.text.primary,
  },
  code: { textAlign: 'center', letterSpacing: 8, fontSize: 22 },
  link: { color: color.text.muted, textAlign: 'center', paddingVertical: space.sm, textDecorationLine: 'underline' },
  error: { backgroundColor: 'rgba(179,66,46,0.12)', color: color.state.danger, padding: space.md, borderRadius: radius.md },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginTop: space.xl },
  hint: { fontSize: 12, color: color.text.subtle, textAlign: 'center', flexShrink: 1 },
});
