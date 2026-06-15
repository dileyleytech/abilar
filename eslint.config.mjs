// eslint.config.mjs — flat config (ESLint 9). Vale para todo o monorepo.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      '.open-next/**',
      '**/dist/**',
      '**/build/**',
      '.wrangler/**',
      'next-env.d.ts',
      'cloudflare-env.d.ts',
      'mobile/**',
      'workers/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Regras do Next.js (core-web-vitals) no app web.
  {
    files: ['app/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // TODO(fase 1): adicionar eslint-plugin-jsx-a11y + react-hooks p/ acessibilidade.
    },
  },
);
