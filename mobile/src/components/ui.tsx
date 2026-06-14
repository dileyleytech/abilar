import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { color, radius, space, shadow } from '@/theme';

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon: Ico,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  /** Ícone lucide opcional, renderizado antes do título. */
  icon?: (props: { size: number; color: string; strokeWidth: number }) => ReactNode;
}) {
  // Espelha os variants do web (app/components/ui/Button.tsx).
  const V = {
    primary: { bg: color.brand.primary, fg: color.text.onDark, border: false },
    secondary: { bg: color.brand.secondary, fg: color.text.onDark, border: false },
    ghost: { bg: 'transparent', fg: color.text.primary, border: false },
    outline: { bg: 'transparent', fg: color.text.primary, border: true },
    danger: { bg: 'transparent', fg: color.state.danger, border: false },
  }[variant];
  const fg = V.fg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: V.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        V.border && { borderWidth: 1, borderColor: color.border.subtle },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnInner}>
          {Ico ? Ico({ size: 20, color: fg, strokeWidth: 2 }) : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'warn' | 'danger' }) {
  const tones = {
    neutral: { bg: color.bg.deep, fg: color.text.muted },
    primary: { bg: 'rgba(197,106,51,0.15)', fg: color.brand.primary },
    success: { bg: 'rgba(123,174,158,0.3)', fg: color.text.primary },
    warn: { bg: 'rgba(232,167,101,0.3)', fg: color.text.primary },
    danger: { bg: 'rgba(178,59,46,0.12)', fg: color.state.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tones.bg }]}>
      <Text style={[styles.badgeText, { color: tones.fg }]}>{label}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={color.brand.primary} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: space.lg,
    ...shadow.card,
  },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: space.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: color.text.primary, textAlign: 'center' },
  muted: { color: color.text.muted, textAlign: 'center' },
});
