// Tipos dos bindings do Worker (wrangler.toml).
// Na Fase 0 mantemos placeholders leves para o typecheck rodar sem puxar
// @cloudflare/workers-types (que conflita com a lib DOM do Next).
// TODO(deploy): regenerar os tipos reais com `pnpm cf-typegen`
//   (wrangler types --env-interface CloudflareEnv), que referencia os tipos do runtime.

interface CloudflareEnv {
  // Vars públicas (wrangler.toml [vars])
  ENVIRONMENT: string;
  APP_URL: string;

  // Banco — conexão DIRETA do Supabase (5432) via Hyperdrive (nunca pooler 6543).
  HYPERDRIVE: { connectionString: string };

  // Bindings (formas reais entram via cf-typegen).
  MEDIA: unknown; // R2Bucket — mídia (fotos, imagens geradas, PDFs)
  CACHE: unknown; // KVNamespace — cache leve
  JOBS: unknown; // Queue — image-gen, pdf, blog
  BROWSER: unknown; // Browser Rendering — HTML -> PDF

  // Segredos (wrangler secret put ...): nunca commitar valores.
  GEMINI_API_KEY?: string;
  ASAAS_API_KEY?: string;
  ASAAS_WEBHOOK_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SMS_PROVIDER_TOKEN?: string;
}
