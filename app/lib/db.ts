import 'server-only';
import { createDb, type Database } from '@abilar/db';

// Cliente Drizzle no servidor. Em dev usa DATABASE_URL (session pooler).
// TODO(Workers): usar getCloudflareContext().env.HYPERDRIVE.connectionString.
//
// Cacheado no globalThis para sobreviver ao HMR do Next dev — sem isso, cada
// hot-reload abriria uma conexão nova e esgotaria o pooler do Supabase.
const globalForDb = globalThis as unknown as { __abilarDb?: Database };

export function getDb(): Database {
  if (!globalForDb.__abilarDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL ausente (.env.local).');
    globalForDb.__abilarDb = createDb(url);
  }
  return globalForDb.__abilarDb;
}
