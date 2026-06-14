// Config pública do app (valores expostos no bundle — use só chaves públicas).
// Definidos em .env (EXPO_PUBLIC_*). Veja .env.example.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
// URL do backend Next (endpoints /api/mobile/*). Em dev, IP da LAN + porta 3001.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[config] Faltam EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY (veja .env.example).');
}

export const config = { SUPABASE_URL, SUPABASE_ANON_KEY, API_URL };
