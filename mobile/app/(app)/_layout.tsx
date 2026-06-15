import { Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { HeaderIcons } from '@/components/HeaderIcons';
import { color } from '@/theme';
import {
  IconPedidos, IconNovo, IconInicio, IconAvulsos, IconRelatorios,
  IconCustos, IconConta, type LucideIcon,
} from '@/components/icons';

type TabIconProps = { color: string; size: number };
const tabIcon = (Ico: LucideIcon) =>
  ({ color: c, size }: TabIconProps) => <Ico color={c} size={size} strokeWidth={2} />;

export default function AppLayout() {
  const { profile } = useAuth();
  const carpenter = profile?.role === 'CARPENTER';
  const architect = profile?.role === 'ARCHITECT';

  // Header nativo com Conversas + Avisos no topo (padrão mobile).
  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: color.bg.base },
    headerShadowVisible: false,
    headerTintColor: color.text.primary,
    headerRight: () => <HeaderIcons />,
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
      <Tabs.Screen name="pedidos" options={{ title: 'Pedidos', tabBarIcon: tabIcon(IconPedidos), href: architect ? null : undefined }} />
      {/* Arquiteto: início (projetos indicados + comissões + link) */}
      <Tabs.Screen
        name="arquiteto"
        options={{ ...header, title: 'Início', tabBarIcon: tabIcon(IconInicio), href: architect ? undefined : null }}
      />
      <Tabs.Screen
        name="novo"
        options={{
          ...header,
          title: 'Novo pedido',
          tabBarLabel: 'Criar',
          tabBarIcon: tabIcon(IconNovo),
          href: profile?.role === 'CLIENT' ? undefined : null,
        }}
      />
      {/* Marceneiro: gestão dividida em 3 abas */}
      <Tabs.Screen
        name="avulsos"
        options={{ ...header, title: 'Orçamentos avulsos', tabBarLabel: 'Orçamentos', tabBarIcon: tabIcon(IconAvulsos), href: carpenter ? undefined : null }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{ ...header, title: 'Relatórios', tabBarIcon: tabIcon(IconRelatorios), href: carpenter ? undefined : null }}
      />
      <Tabs.Screen
        name="catalogo-custos"
        options={{ ...header, title: 'Catálogo de custos', tabBarLabel: 'Custos', tabBarIcon: tabIcon(IconCustos), href: carpenter ? undefined : null }}
      />
      <Tabs.Screen name="conta" options={{ ...header, title: 'Minha conta', tabBarLabel: 'Conta', tabBarIcon: tabIcon(IconConta) }} />

      {/* Fora da barra de baixo (topo / navegação) */}
      <Tabs.Screen name="catalogo" options={{ href: null }} />
      <Tabs.Screen name="conversas" options={{ href: null }} />
      <Tabs.Screen name="avisos" options={{ ...header, title: 'Avisos', href: null }} />
      <Tabs.Screen name="contratos" options={{ href: null }} />
      <Tabs.Screen name="design" options={{ ...header, title: 'Conversar com a ABI', href: null }} />
      <Tabs.Screen name="marceneiro-perfil" options={{ href: null }} />
      <Tabs.Screen name="agenda" options={{ ...header, title: 'Agenda', href: null }} />
    </Tabs>
  );
}
