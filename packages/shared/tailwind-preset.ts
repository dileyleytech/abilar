// tailwind-preset.ts — preset Tailwind derivado de tokens.ts (fonte única).
// Web (tailwind.config.ts) e mobile/NativeWind (Fase 9) consomem ESTE preset.
// NUNCA hardcodar cor/fonte na config — só editar tokens.ts.
import type { Config } from 'tailwindcss';
import { palette, color, font, radius, type, shadow, container } from './tokens';

const px = (n: number) => `${n}px`;
const rem = (n: number) => `${n / 16}rem`;

export const abilarPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Paleta bruta (use as semânticas sempre que possível).
        amber: palette.amber,
        green: palette.green,
        charcoal: palette.charcoal,
        sand: palette.sand,
        'sand-deep': palette.sandDeep,
        sage: palette.sage,
        ochre: palette.ochre,
        brick: palette.brick,
        // Estados semânticos (use bg-danger/text-danger em vez de red-* do Tailwind).
        success: color.state.success,
        warning: color.state.warning,
        danger: color.state.danger,
        // Semânticas da marca.
        brand: {
          DEFAULT: color.brand.primary,
          primary: color.brand.primary,
          secondary: color.brand.secondary,
        },
        abi: {
          DEFAULT: color.abi.base,
          accent: color.abi.accent,
        },
      },
      textColor: {
        muted: color.text.muted,
        subtle: color.text.subtle,
      },
      backgroundColor: {
        base: color.bg.base,
        surface: color.bg.surface,
        deep: color.bg.deep,
        dark: color.bg.dark,
      },
      borderColor: {
        subtle: color.border.subtle,
      },
      fontFamily: {
        heading: [font.family.heading],
        body: [font.family.body],
        mono: [font.family.mono],
        sans: [font.family.body],
      },
      borderRadius: {
        // Escala monotônica derivada de tokens.radius (corrige xl/2xl invertidos).
        sm: px(radius.sm),    // 8
        md: px(radius.md),    // 12
        lg: px(radius.lg),    // 16 — usado por cartões/seções
        xl: px(radius.xl),    // 24 — superfícies grandes
        '2xl': px(radius.xl), // alias p/ o uso histórico de rounded-2xl em cartões
        pill: String(radius.pill),
        full: String(radius.pill),
      },
      fontSize: {
        // Papéis semânticos (size + line-height) — use text-h1, text-body, etc.
        display: [rem(type.display.size), { lineHeight: rem(type.display.line) }],
        h1: [rem(type.h1.size), { lineHeight: rem(type.h1.line) }],
        h2: [rem(type.h2.size), { lineHeight: rem(type.h2.line) }],
        h3: [rem(type.h3.size), { lineHeight: rem(type.h3.line) }],
        body: [rem(type.body.size), { lineHeight: rem(type.body.line) }],
        small: [rem(type.small.size), { lineHeight: rem(type.small.line) }],
        caption: [rem(type.caption.size), { lineHeight: rem(type.caption.line) }],
      },
      boxShadow: {
        card: shadow.card,
        raised: shadow.raised,
        overlay: shadow.overlay,
      },
      maxWidth: {
        'content-sm': px(container.sm),
        content: px(container.md),
        'content-lg': px(container.lg),
        'content-xl': px(container.xl),
      },
    },
  },
};

export default abilarPreset;
