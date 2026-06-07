import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { color } from '@/theme';

function Icon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppLayout() {
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
      <Tabs.Screen name="conversas" options={{ title: 'Conversas', tabBarIcon: () => <Icon emoji="💬" /> }} />
      <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: () => <Icon emoji="👤" /> }} />
    </Tabs>
  );
}
