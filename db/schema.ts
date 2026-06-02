// db/schema.ts — Drizzle schema (Supabase Postgres). Fase 1: auth e perfis.
// Regras: dinheiro em BIGINT centavos; dimensão em INTEGER mm.
// `User` é o Supabase Auth (auth.users); `profiles.id = auth.uid()`.
// RLS é habilitada e as policies vivem na migration SQL à mão (0001_rls.sql):
// Drizzle/Hyperdrive acessa como papel de serviço (não sujeito a RLS) e a
// autorização é feita também na Server Action (defesa em profundidade); a RLS
// é o guard primário para Realtime/Storage/supabase-js (que usam o JWT).
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  ROLES,
  PERSON_TYPES,
  CATEGORIES,
  KYC_STATUS,
  PROJECT_STATUS,
  WORK_TYPES,
  SOURCE_TYPES,
  PHOTO_KINDS,
} from '@abilar/shared';

// Enums (fonte única dos literais em @abilar/shared/domain).
export const roleEnum = pgEnum('role', ROLES);
export const personTypeEnum = pgEnum('person_type', PERSON_TYPES);
export const categoryEnum = pgEnum('category', CATEGORIES);
export const kycStatusEnum = pgEnum('kyc_status', KYC_STATUS);
export const projectStatusEnum = pgEnum('project_status', PROJECT_STATUS);
export const workTypeEnum = pgEnum('work_type', WORK_TYPES);
export const sourceTypeEnum = pgEnum('source_type', SOURCE_TYPES);
export const photoKindEnum = pgEnum('photo_kind', PHOTO_KINDS);
export const pricingScopeEnum = pgEnum('pricing_scope', ['GLOBAL', 'PROMO']);

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

// ── Fase 2: Projeto, Módulos e Fotos ────────────────────────────────────────

/** Projeto do cliente (DRAFT → OPEN_FOR_QUOTES → …). `category` alimenta o matching. */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(), // nome do projeto (dado pelo cliente)
    status: projectStatusEnum('status').notNull().default('DRAFT'),
    sourceType: sourceTypeEnum('source_type').notNull().default('AI_GENERATED'),
    architectId: uuid('architect_id').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('projects_status_created_idx').on(t.status, t.createdAt), // feed de pedidos
    index('projects_client_idx').on(t.clientId),
  ],
);

/** Módulo do projeto. Dimensões em mm (inteiro). hardware/items em jsonb. */
export const modules = pgTable(
  'modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    ambiente: text('ambiente'), // cômodo (ex.: "Cozinha", "Quarto do casal")
    type: text('type').notNull(), // categoria do móvel (GUARDA_ROUPA, COZINHA, ...)
    workType: workTypeEnum('work_type'), // novo vs substituição (por móvel)
    label: text('label'),
    widthMm: integer('width_mm').notNull(),
    heightMm: integer('height_mm').notNull(),
    depthMm: integer('depth_mm').notNull(),
    material: text('material'),
    finish: text('finish'),
    hardware: jsonb('hardware').notNull().default(sql`'{}'::jsonb`),
    items: jsonb('items').notNull().default(sql`'[]'::jsonb`),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('modules_project_idx').on(t.projectId)],
);

/** Foto/anexo do projeto. `path` = caminho no bucket; a URL assinada é curta (gerada na leitura). */
export const projectPhotos = pgTable(
  'project_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }),
    kind: photoKindEnum('kind').notNull(),
    path: text('path').notNull(),
    version: integer('version').notNull().default(1),
    isCurrent: boolean('is_current').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('project_photos_project_idx').on(t.projectId)],
);

// ── Fase 3: configuração de pricing (taxas/promoções) ───────────────────────

/** Configuração financeira (§5.1). Dinheiro em centavos (BIGINT); % em numeric.
 *  Mapeada para o tipo puro PricingConfig de @abilar/pricing. */
export const pricingConfig = pgTable(
  'pricing_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(), // 'GLOBAL' (config ativa) ou chave de promo
    scope: pricingScopeEnum('scope').notNull().default('GLOBAL'),
    clientCommissionPct: numeric('client_commission_pct', { precision: 6, scale: 3 }).notNull(),
    carpenterCommissionPct: numeric('carpenter_commission_pct', { precision: 6, scale: 3 }).notNull(),
    architectCommissionPct: numeric('architect_commission_pct', { precision: 6, scale: 3 }).notNull().default('0'),
    // installmentTable: { "1": { "mdrPct": 0 }, "10": { "mdrPct": 4.5 }, ... }
    installmentTable: jsonb('installment_table').notNull().default(sql`'{}'::jsonb`),
    dilutionMinCarpenterSharePct: numeric('dilution_min_carpenter_share_pct', { precision: 6, scale: 3 }).notNull().default('50'),
    dilutionPlatformMarginPct: numeric('dilution_platform_margin_pct', { precision: 6, scale: 3 }).notNull().default('1'),
    pixFixedFeeCents: bigint('pix_fixed_fee_cents', { mode: 'number' }).notNull().default(0),
    promoRules: jsonb('promo_rules'), // PromoOverrides (nullable)
    activeFrom: timestamp('active_from', { withTimezone: true }),
    activeTo: timestamp('active_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('pricing_config_key_idx').on(t.key)],
);

export type PricingConfigRow = typeof pricingConfig.$inferSelect;
export type NewPricingConfigRow = typeof pricingConfig.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
export type ProjectPhoto = typeof projectPhotos.$inferSelect;
export type NewProjectPhoto = typeof projectPhotos.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type CarpenterProfile = typeof carpenterProfiles.$inferSelect;
export type NewCarpenterProfile = typeof carpenterProfiles.$inferInsert;
export type ArchitectProfile = typeof architectProfiles.$inferSelect;
export type NewArchitectProfile = typeof architectProfiles.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
