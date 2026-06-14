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
  brick:    '#B23B2E', // Tijolo — perigo/erro (vermelho quente, harmoniza c/ terracota)
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
  // Estados semânticos (status, alertas, ações destrutivas).
  state: {
    success: palette.green,
    warning: palette.ochre, // ocre = "atenção/acento" (§doc Identidade Visual)
    danger: palette.brick,  // tijolo = erro/falha
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

/** Raios de canto — escala monotônica. Cartões usam `lg`, botões/inputs `md`. */
export const radius = {
  sm: 8,   // chips, badges
  md: 12,  // botões, inputs
  lg: 16,  // cartões, seções
  xl: 24,  // superfícies grandes, modais
  pill: 999,
} as const;

/** Espaçamento — base 4px. Escala compartilhada (web Tailwind já tem a sua; mobile usa esta). */
export const space = {
  '0.5': 2,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

/**
 * Escala de tipografia (px). `size` = corpo, `line` = altura de linha.
 * Fontes grandes por padrão (acessibilidade do marceneiro — §doc Design).
 * display/h1/h2/h3 = Poppins (heading); body/small/caption = Inter (body).
 */
export const type = {
  display: { size: 40, line: 44, weight: 700 }, // herói / institucional
  h1: { size: 30, line: 36, weight: 600 },      // título de página
  h2: { size: 22, line: 28, weight: 600 },      // título de seção
  h3: { size: 18, line: 24, weight: 600 },      // título de cartão
  body: { size: 16, line: 24, weight: 400 },    // corpo padrão
  small: { size: 14, line: 20, weight: 400 },   // apoio / metadados
  caption: { size: 12, line: 16, weight: 500 }, // rótulos / mono financeira
} as const;

/** Sombras semânticas — suaves, calor de lar (nunca duras/azuladas). */
export const shadow = {
  card: '0 1px 2px rgba(31, 36, 33, 0.04), 0 1px 3px rgba(31, 36, 33, 0.06)',
  raised: '0 4px 12px rgba(31, 36, 33, 0.08), 0 2px 4px rgba(31, 36, 33, 0.04)',
  overlay: '0 12px 32px rgba(31, 36, 33, 0.14)',
} as const;

/** Larguras máximas de conteúdo (px). Telas densas usam quase toda a tela; só
 *  formulários/leitura ficam contidos para preservar legibilidade. */
export const container = {
  sm: 680,   // formulários, conta, fluxos focados (1 coluna)
  md: 1100,  // detalhe, leitura, chat
  lg: 1440,  // dashboards, listas, tabelas
  xl: 1760,  // grids muito largos / telas cheias capadas só em monitor enorme
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
export type Type = typeof type;

export const tokens = { palette, color, font, radius, space, type, shadow, container, brand } as const;
export default tokens;
