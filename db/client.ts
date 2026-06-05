// db/client.ts — fábrica do cliente Drizzle sobre postgres.js.
// Nos Workers, a connection string vem do binding HYPERDRIVE (env.HYPERDRIVE.connectionString),
// que aponta para a conexão DIRETA do Supabase (5432) — NUNCA o pooler 6543 (double-pooling).
// Em scripts/migrations locais, vem de DATABASE_URL.
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

/**
 * Cria um cliente Drizzle. Passe a connection string explicitamente
 * (ex.: env.HYPERDRIVE.connectionString nos Workers).
 */
export function createDb(connectionString: string) {
  // Hyperdrive/Supavisor já fazem pooling -> desligar prepare/pooling do driver.
  // idle_timeout/max_lifetime: solta conexões ociosas antes do pooler matá-las
  // (evita "Failed query" ao reusar uma conexão derrubada).
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
  });
  return drizzle(sql, { schema });
}

export { schema };
