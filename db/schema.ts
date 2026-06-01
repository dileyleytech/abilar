// db/schema.ts — Drizzle schema (Supabase Postgres).
// Regra: dinheiro em BIGINT centavos; dimensão em INTEGER mm.
// `User` é gerenciado pelo Supabase Auth (auth.users); `profiles` referencia auth.uid().
// Esqueleto da Fase 0 — a Fase 1 expande (CarpenterProfile, ArchitectProfile, Address, RLS §3).
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ROLES } from '@abilar/shared';

export const roleEnum = pgEnum('role', ROLES);

/** Perfil 1:1 com auth.users (id = auth.uid()). */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // = auth.users.id
  role: roleEnum('role').notNull().default('CLIENT'),
  name: text('name'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// TODO(Fase 1): CarpenterProfile, ArchitectProfile, Address + policies RLS (§3).
// TODO(dinheiro): usar `bigint(..., { mode: 'number' })` em centavos nas tabelas financeiras.
