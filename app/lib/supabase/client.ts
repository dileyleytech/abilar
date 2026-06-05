'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

/** Client Supabase para Client Components (browser). */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}

/**
 * Cria um canal de Realtime JÁ AUTENTICADO com o JWT do usuário. Sem isso, o
 * socket conecta com a anon key e a RLS (policies `TO authenticated`) barra
 * TODOS os eventos de postgres_changes — nada chega ao cliente.
 */
export async function createAuthedChannel(
  name: string,
): Promise<{ supabase: SupabaseClient; channel: RealtimeChannel } | null> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  await supabase.realtime.setAuth(token);
  return { supabase, channel: supabase.channel(name) };
}
