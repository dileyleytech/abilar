import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Um único runner para todo o monorepo. Resolve os pacotes @abilar/* via alias
// para o fonte TS (sem build step) — bate com tsconfig paths e transpilePackages.
export default defineConfig({
  resolve: {
    alias: {
      '@abilar/shared': resolve(__dirname, 'packages/shared/index.ts'),
      '@abilar/pricing': resolve(__dirname, 'packages/pricing/src/index.ts'),
      '@abilar/ai-vision': resolve(__dirname, 'packages/ai-vision/src/index.ts'),
      '@abilar/db': resolve(__dirname, 'db/index.ts'),
      // App usa o alias `@/` (tsconfig) e os marcadores server-only/client-only do Next.
      '@': resolve(__dirname, 'app'),
      'server-only': resolve(__dirname, 'test/stubs/empty.ts'),
      'client-only': resolve(__dirname, 'test/stubs/empty.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'db/**/*.test.ts', 'app/**/*.test.ts'],
    exclude: ['**/node_modules/**', '.next/**', '.open-next/**'],
    environment: 'node',
  },
});
