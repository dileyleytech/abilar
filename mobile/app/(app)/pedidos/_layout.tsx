import { Stack } from 'expo-router';
import { HeaderIcons } from '@/components/HeaderIcons';
import { color } from '@/theme';

export default function PedidosStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg.base },
        headerTintColor: color.text.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: color.bg.base },
        headerRight: () => <HeaderIcons />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Pedidos' }} />
      <Stack.Screen name="[id]" options={{ title: 'Pedido' }} />
    </Stack>
  );
}
