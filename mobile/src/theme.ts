// Tema do app — espelha packages/shared/tokens.ts (cores da marca Abilar).
// Mantido como cópia porque o Metro não importa o pacote do monorepo aqui;
// ao trocar os tokens, atualize estes valores também.
export const color = {
  brand: { primary: '#C56A33', secondary: '#2F6B5E' },
  text: {
    primary: '#1F2421',
    onDark: '#F6F1EA',
    muted: 'rgba(31, 36, 33, 0.62)',
    subtle: 'rgba(31, 36, 33, 0.45)',
  },
  bg: { base: '#F6F1EA', surface: '#FFFFFF', deep: '#ECE3D6', dark: '#1F2421' },
  border: { subtle: 'rgba(31, 36, 33, 0.12)' },
  accent: { sage: '#7BAE9E', ochre: '#E8A765' },
  state: { danger: '#B3422E', success: '#2F6B5E' },
} as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
