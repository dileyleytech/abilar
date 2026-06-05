import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Client com SERVICE ROLE (ignora RLS) — SÓ no servidor, nunca exposto ao browser.
// Usado para mediar acesso já autorizado pelo app (ex.: assinar URLs de mídia
// de um pedido que o marceneiro tem permissão de ver). Cacheado no globalThis.
const globalForAdmin = globalThis as unknown as { __abilarSupabaseAdmin?: SupabaseClient };

export function createSupabaseAdminClient(): SupabaseClient {
  if (!globalForAdmin.__abilarSupabaseAdmin) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
    globalForAdmin.__abilarSupabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalForAdmin.__abilarSupabaseAdmin;
}
