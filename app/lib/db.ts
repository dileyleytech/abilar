import 'server-only';
import { createDb, type Database } from '@abilar/db';

// Cliente Drizzle no servidor. Em dev usa DATABASE_URL (session pooler).
// TODO(Workers): usar getCloudflareContext().env.HYPERDRIVE.connectionString.
//
// Cacheado no globalThis para sobreviver ao HMR do Next dev — sem isso, cada
// hot-reload abriria uma conexão nova e esgotaria o pooler do Supabase.
const globalForDb = globalThis as unknown as { __abilarDb?: Database };

/** Tamanho do pool postgres.js por ambiente.
 *  Em dev (DATABASE_URL → session pooler) usamos várias conexões para que as
 *  queries de uma página em Promise.all rodem de fato em paralelo, não serializadas
 *  numa única conexão. Em Workers/Hyperdrive o pooling é externo → max=1. */
export function poolMaxForEnv(nodeEnv: string | undefined): number {
  return nodeEnv === 'development' ? 10 : 1;
}

export function getDb(): Database {
  if (!globalForDb.__abilarDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL ausente (.env.local).');
    globalForDb.__abilarDb = createDb(url, { max: poolMaxForEnv(process.env.NODE_ENV) });
  }
  return globalForDb.__abilarDb;
}
