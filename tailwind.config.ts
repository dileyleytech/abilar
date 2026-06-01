import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
// Fonte ÚNICA de cores/fontes: o preset derivado de packages/shared/tokens.ts.
// NUNCA hardcodar cor/fonte aqui — só ajustar tokens.ts.
import { abilarPreset } from './packages/shared/tailwind-preset';

const config: Config = {
  presets: [abilarPreset],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './packages/*/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [tailwindcssAnimate],
};

export default config;
