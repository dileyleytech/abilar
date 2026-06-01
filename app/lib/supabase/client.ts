'use client';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseEnv } from './env';

/** Client Supabase para Client Components (browser). */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}
