// tailwind-preset.ts — preset Tailwind derivado de tokens.ts (fonte única).
// Web (tailwind.config.ts) e mobile/NativeWind (Fase 9) consomem ESTE preset.
// NUNCA hardcodar cor/fonte na config — só editar tokens.ts.
import type { Config } from 'tailwindcss';
import { palette, color, font, radius } from './tokens';

const px = (n: number) => `${n}px`;

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
        sm: px(radius.sm),
        md: px(radius.md),
        lg: px(radius.lg),
        xl: px(radius.xl),
        pill: String(radius.pill),
      },
    },
  },
};

export default abilarPreset;
