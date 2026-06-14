import { Stack } from 'expo-router';
import { color } from '@/theme';

export default function ConversasStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg.base },
        headerTintColor: color.text.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: color.bg.base },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Conversas' }} />
      <Stack.Screen name="[id]" options={{ title: 'Conversa' }} />
    </Stack>
  );
}
