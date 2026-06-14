import { useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { countUnreadNotifications } from '@/lib/data';
import { subscribeNotifications } from '@/lib/realtime';
import { NOTIF_READ_EVENT } from '@/lib/events';
import { color } from '@/theme';
import { IconConversas, IconAvisos } from '@/components/icons';

// Ícones no topo (Conversas + Avisos) — padrão de apps mobile.
export function HeaderIcons() {
  const { profile } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let cleanup: (() => void) | undefined;
    void countUnreadNotifications(profile.id).then(setUnread);
    void subscribeNotifications(profile.id, () => setUnread((n) => n + 1)).then((c) => (cleanup = c));
    const sub = DeviceEventEmitter.addListener(NOTIF_READ_EVENT, () => setUnread(0));
    return () => {
      cleanup?.();
      sub.remove();
    };
  }, [profile]);

  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.push('/(app)/conversas')} hitSlop={8} style={styles.btn}>
        <IconConversas size={22} color={color.text.primary} strokeWidth={2} />
      </Pressable>
      <Pressable onPress={() => router.push('/(app)/avisos')} hitSlop={8} style={styles.btn}>
        <IconAvisos size={22} color={color.text.primary} strokeWidth={2} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginRight: 12 },
  btn: { padding: 4 },
  badge: { position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color.brand.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
