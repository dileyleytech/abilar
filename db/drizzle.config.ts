import { defineConfig } from 'drizzle-kit';

// drizzle-kit usa a conexão DIRETA do Supabase (5432) via DATABASE_URL.
// NUNCA usar a string do pooler (6543). Segredo via env, nunca hardcode.
export default defineConfig({
  schema: './schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
