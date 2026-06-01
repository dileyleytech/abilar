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
  // Hyperdrive já faz pooling em transaction mode -> desligar prepare/pooling do driver.
  const sql = postgres(connectionString, { prepare: false, max: 1 });
  return drizzle(sql, { schema });
}

export { schema };
