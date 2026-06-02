import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pacotes do workspace consumidos direto do fonte TS (sem build step).
  transpilePackages: ['@abilar/shared', '@abilar/pricing', '@abilar/ai-vision', '@abilar/db'],
  typedRoutes: true,
  // O lint roda como passo dedicado no CI e no `pnpm lint` (eslint flat config),
  // não durante o build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

// OpenNext (Cloudflare) — emula os bindings (Hyperdrive/R2/Queues) no dev via
// miniflare. É OPT-IN (USE_CF_DEV=1): por ora o app usa DATABASE_URL/postgres.js e
// Supabase via HTTP, então `pnpm dev` roda Next puro (mais leve e sem workerd).
if (process.env.NODE_ENV === 'development' && process.env.USE_CF_DEV === '1') {
  initOpenNextCloudflareForDev();
}
