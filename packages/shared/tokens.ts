// packages/shared/tokens.ts
// ─────────────────────────────────────────────────────────────────────────────
// Abilar — Design Tokens (FINAL)
// Fonte única de verdade para cores e tipografia da marca.
// Substitui a versão provisória. Conceito: ABI (assistente) + lar (casa).
// ─────────────────────────────────────────────────────────────────────────────

/** Paleta bruta — os valores hex canônicos da marca. */
export const palette = {
  amber:    '#C56A33', // Âmbar Terracota — primária (calor de lar / madeira)
  green:    '#2F6B5E', // Verde Profundo — secundária (confiança / escrow)
  charcoal: '#1F2421', // Carvão — texto
  sand:     '#F6F1EA', // Areia — fundo
  sandDeep: '#ECE3D6', // Areia profunda — superfícies/divisores sutis
  sage:     '#7BAE9E', // Sálvia — acento claro
  ochre:    '#E8A765', // Ocre — acento quente
  white:    '#FFFFFF',
} as const;

/** Cores semânticas — use estas na UI, não a paleta bruta. */
export const color = {
  brand: {
    primary: palette.amber,
    secondary: palette.green,
  },
  text: {
    primary: palette.charcoal,
    onDark: palette.sand,
    muted: 'rgba(31, 36, 33, 0.62)',
    subtle: 'rgba(31, 36, 33, 0.45)',
  },
  bg: {
    base: palette.sand,
    surface: palette.white,
    deep: palette.sandDeep,
    dark: palette.charcoal,
  },
  border: {
    subtle: 'rgba(31, 36, 33, 0.10)',
  },
  accent: {
    sage: palette.sage,
    ochre: palette.ochre,
  },
  // Assistente ABI (chat, dicas, avatar)
  abi: {
    base: palette.green,
    accent: palette.ochre,
    onDark: palette.sand,
  },
} as const;

/** Tipografia. Títulos: Poppins · Corpo: Inter · Código/labels: JetBrains Mono. */
export const font = {
  family: {
    heading: "'Poppins', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600, // peso do wordmark "abilar"
    bold: 700,
  },
  // Tracking do wordmark (apenas referência de marca): -0.035em
  tracking: {
    tight: '-0.035em',
    normal: '0em',
  },
  /** <link> do Google Fonts com todos os pesos usados pela marca. */
  googleFontsHref:
    'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
} as const;

/** Raios de canto. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28, // ícone de app
  pill: 999,
} as const;

/** Metadados da marca / assets (caminhos relativos a /brand). */
export const brand = {
  name: 'Abilar',
  tagline: 'Do projeto ao lar, com a ABI.',
  assets: {
    logo: 'brand/svg/abilar-wordmark-color.svg',
    logoMono: 'brand/svg/abilar-wordmark-mono-black.svg',
    logoOnDark: 'brand/svg/abilar-wordmark-dark.svg',
    lockup: 'brand/svg/abilar-logo-horizontal.svg',
    icon: 'brand/svg/abilar-icon-amber.svg',
    abiAvatar: 'brand/svg/abilar-abi-casa-rosto.svg',
    symbol: 'brand/svg/abilar-casinha.svg',
    favicon: 'brand/favicon/favicon-32.png',
  },
} as const;

export type Palette = typeof palette;
export type Color = typeof color;
export type Font = typeof font;

export const tokens = { palette, color, font, radius, brand } as const;
export default tokens;
