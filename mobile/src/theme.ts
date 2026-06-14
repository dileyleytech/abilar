// Tema do app — espelha packages/shared/tokens.ts (cores/escalas da marca Abilar).
// Mantido como cópia porque o Metro não importa o pacote do monorepo aqui;
// ao trocar os tokens em packages/shared/tokens.ts, atualize estes valores também.
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
  // Estados semânticos (ocre = atenção; tijolo = erro) — alinhado ao web.
  state: { danger: '#B23B2E', warning: '#E8A765', success: '#2F6B5E' },
} as const;

// Raio monotônico (cartões = lg; botões/inputs = md) — alinhado ao web.
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

// Espaçamento base 4px.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Tipografia (dp) — fontes grandes por padrão (acessibilidade do marceneiro).
export const type = {
  display: { size: 32, line: 38, weight: '700' },
  h1: { size: 26, line: 32, weight: '700' },
  h2: { size: 20, line: 26, weight: '600' },
  h3: { size: 17, line: 22, weight: '600' },
  body: { size: 16, line: 22, weight: '400' },
  small: { size: 14, line: 19, weight: '400' },
  caption: { size: 12, line: 16, weight: '500' },
} as const;

// Sombra de cartão (props nativas iOS + elevation Android).
export const shadow = {
  card: {
    shadowColor: '#1F2421',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
} as const;
