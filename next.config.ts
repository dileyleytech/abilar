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

// OpenNext (Cloudflare) — só no `next dev`, para que os bindings/getCloudflareContext
// funcionem localmente. NÃO roda no `next build` (evita exigir Hyperdrive/Postgres).
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}
