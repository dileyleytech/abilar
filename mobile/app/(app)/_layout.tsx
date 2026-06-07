import { useEffect, useState } from 'react';
import { DeviceEventEmitter, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { countUnreadNotifications } from '@/lib/data';
import { subscribeNotifications } from '@/lib/realtime';
import { NOTIF_READ_EVENT } from './avisos';
import { color } from '@/theme';

function Icon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppLayout() {
  const { profile } = useAuth();
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

  // Header nativo para as abas que não têm Stack próprio (evita título sob o
  // status bar). Pedidos/Conversas têm Stack interno e mantêm headerShown:false.
  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: color.bg.base },
    headerShadowVisible: false,
    headerTintColor: color.text.primary,
  } as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand.primary,
        tabBarInactiveTintColor: color.text.muted,
        tabBarStyle: { backgroundColor: color.bg.surface, borderTopColor: color.border.subtle },
      }}
    >
      <Tabs.Screen name="pedidos" options={{ title: 'Pedidos', tabBarIcon: () => <Icon emoji="📋" /> }} />
      <Tabs.Screen
        name="novo"
        options={{
          ...header,
          title: 'Novo pedido',
          tabBarLabel: 'Criar',
          tabBarIcon: () => <Icon emoji="➕" />,
          // Só o cliente cria pedido; escondido para os demais papéis.
          href: profile?.role === 'CLIENT' ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="catalogo"
        options={{
          ...header,
          title: 'Catálogo',
          tabBarIcon: () => <Icon emoji="📦" />,
          href: profile?.role === 'CARPENTER' ? undefined : null,
        }}
      />
      <Tabs.Screen name="conversas" options={{ title: 'Conversas', tabBarIcon: () => <Icon emoji="💬" /> }} />
      <Tabs.Screen
        name="avisos"
        options={{ ...header, title: 'Avisos', tabBarIcon: () => <Icon emoji="🔔" />, tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tabs.Screen name="conta" options={{ ...header, title: 'Minha conta', tabBarLabel: 'Conta', tabBarIcon: () => <Icon emoji="👤" /> }} />
      <Tabs.Screen name="contratos" options={{ href: null }} />
      <Tabs.Screen name="marceneiro-perfil" options={{ href: null }} />
    </Tabs>
  );
}
