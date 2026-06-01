// db/schema.ts — Drizzle schema (Supabase Postgres). Fase 1: auth e perfis.
// Regras: dinheiro em BIGINT centavos; dimensão em INTEGER mm.
// `User` é o Supabase Auth (auth.users); `profiles.id = auth.uid()`.
// RLS é habilitada e as policies vivem na migration SQL à mão (0001_rls.sql):
// Drizzle/Hyperdrive acessa como papel de serviço (não sujeito a RLS) e a
// autorização é feita também na Server Action (defesa em profundidade); a RLS
// é o guard primário para Realtime/Storage/supabase-js (que usam o JWT).
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { ROLES, PERSON_TYPES, CATEGORIES, KYC_STATUS } from '@abilar/shared';

// Enums (fonte única dos literais em @abilar/shared/domain).
export const roleEnum = pgEnum('role', ROLES);
export const personTypeEnum = pgEnum('person_type', PERSON_TYPES);
export const categoryEnum = pgEnum('category', CATEGORIES);
export const kycStatusEnum = pgEnum('kyc_status', KYC_STATUS);

/** Perfil 1:1 com auth.users (id = auth.uid()). `role` é a fonte de verdade
 *  do papel (NÃO confiar em user_metadata para autorização). */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // = auth.users.id (FK criada na migration RLS)
  role: roleEnum('role').notNull().default('CLIENT'),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Marceneiro (PJ/MEI/PF). Matching por cidade + categoria + CEP/raio (Fase 4). */
export const carpenterProfiles = pgTable(
  'carpenter_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    personType: personTypeEnum('person_type').notNull(),
    name: text('name').notNull(),
    companyName: text('company_name'),
    cnpjOrCpf: text('cnpj_or_cpf').notNull(),
    logoUrl: text('logo_url'),
    useDefaultLogo: boolean('use_default_logo').notNull().default(true),
    bio: text('bio'),
    serviceCity: text('service_city').notNull(),
    serviceCep: text('service_cep').notNull(),
    serviceRadiusKm: integer('service_radius_km').notNull().default(20),
    categories: categoryEnum('categories').array().notNull().default(sql`'{}'`),
    kycStatus: kycStatusEnum('kyc_status').notNull().default('PENDING'),
    rating: numeric('rating', { precision: 2, scale: 1 }),
    asaasWalletId: text('asaas_wallet_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('carpenter_profiles_service_city_idx').on(t.serviceCity)],
);

/** Arquiteto parceiro. `commissionPercent` é config por parceiro (não hardcode). */
export const architectProfiles = pgTable('architect_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  cau: text('cau'),
  commissionPercent: numeric('commission_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  asaasWalletId: text('asaas_wallet_id'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Endereços do usuário (cliente: entrega/instalação; marceneiro: base). */
export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    label: text('label'),
    cep: text('cep').notNull(),
    street: text('street'),
    number: text('number'),
    complement: text('complement'),
    district: text('district'),
    city: text('city'),
    state: text('state'), // UF
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('addresses_user_id_idx').on(t.userId)],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type CarpenterProfile = typeof carpenterProfiles.$inferSelect;
export type NewCarpenterProfile = typeof carpenterProfiles.$inferInsert;
export type ArchitectProfile = typeof architectProfiles.$inferSelect;
export type NewArchitectProfile = typeof architectProfiles.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
