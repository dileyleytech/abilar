// @abilar/db — schema Drizzle + cliente sobre Hyperdrive/postgres.js.
export * from './schema';
export * from './client';

// Re-export dos operadores Drizzle usados pelo app (evita o app depender
// diretamente de drizzle-orm).
export { and, or, eq, ne, desc, asc, sql, inArray, exists, isNull, ilike } from 'drizzle-orm';
