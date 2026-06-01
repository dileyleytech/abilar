import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Config do adapter OpenNext para Cloudflare Workers.
// TODO(perf): habilitar incremental cache (R2/KV) e tag cache quando houver ISR.
//   ex.: import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
export default defineCloudflareConfig({
  // incrementalCache: r2IncrementalCache,
});
