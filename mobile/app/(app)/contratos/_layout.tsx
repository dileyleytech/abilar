import { Stack } from 'expo-router';
import { color } from '@/theme';

export default function ContratosStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg.base },
        headerTintColor: color.text.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: color.bg.base },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Contrato' }} />
    </Stack>
  );
}
