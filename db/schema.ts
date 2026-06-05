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
  QUOTE_STATUS,
  CONVERSATION_STATUS,
  REPORT_REASONS,
  REPORT_STATUS,
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
export const quoteStatusEnum = pgEnum('quote_status', QUOTE_STATUS);
export const conversationStatusEnum = pgEnum('conversation_status', CONVERSATION_STATUS);
export const reportReasonEnum = pgEnum('report_reason', REPORT_REASONS);
export const reportStatusEnum = pgEnum('report_status', REPORT_STATUS);

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
    serviceLat: numeric('service_lat', { precision: 9, scale: 6 }), // base p/ matching por raio
    serviceLng: numeric('service_lng', { precision: 9, scale: 6 }),
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
    // Local da obra (para matching cidade/raio com o marceneiro).
    city: text('city'),
    cep: text('cep'),
    lat: numeric('lat', { precision: 9, scale: 6 }),
    lng: numeric('lng', { precision: 9, scale: 6 }),
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
    // Desconto (pontos) na comissão do marceneiro nas vendas parceladas (incentivo).
    carpenterInstallmentDiscountPct: numeric('carpenter_installment_discount_pct', { precision: 6, scale: 3 }).notNull().default('0'),
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

// ── Fase 4: Orçamentos (Quote) ──────────────────────────────────────────────

/** Orçamento do marceneiro para um pedido. V = valor do serviço (BIGINT centavos).
 *  O preço exibido ao cliente é recalculado pelo motor (packages/pricing). */
export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    carpenterId: uuid('carpenter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    baseValueCents: bigint('base_value_cents', { mode: 'number' }).notNull(), // V
    carpenterCostCents: bigint('carpenter_cost_cents', { mode: 'number' }), // proteção de margem
    maxInstallments: integer('max_installments').notNull().default(1),
    dilutionSharePct: numeric('dilution_share_pct', { precision: 6, scale: 3 }).notNull().default('100'),
    note: text('note'), // mensagem ao cliente
    lineItems: jsonb('line_items').notNull().default(sql`'[]'::jsonb`), // itens (Fase 4.3b)
    status: quoteStatusEnum('status').notNull().default('SENT'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    pdfUrl: text('pdf_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('quotes_project_carpenter_idx').on(t.projectId, t.carpenterId),
    index('quotes_project_idx').on(t.projectId),
    index('quotes_carpenter_status_idx').on(t.carpenterId, t.status),
  ],
);

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;

// ── Fase 4.4: Conversa e mensagens (chat após pré-aprovação) ────────────────

/** Conversa cliente↔marceneiro, criada quando o cliente PRÉ-APROVA um orçamento. */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    carpenterId: uuid('carpenter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    status: conversationStatusEnum('status').notNull().default('ACTIVE'),
    // Até quando cada participante leu (para contar mensagens não lidas).
    clientLastReadAt: timestamp('client_last_read_at', { withTimezone: true }),
    carpenterLastReadAt: timestamp('carpenter_last_read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('conversations_project_carpenter_idx').on(t.projectId, t.carpenterId),
    index('conversations_client_idx').on(t.clientId),
    index('conversations_carpenter_idx').on(t.carpenterId),
  ],
);

/** Mensagem do chat. `body` = original; `redactedBody` = com contato mascarado. */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    redactedBody: text('redacted_body'),
    flaggedReason: text('flagged_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_conversation_idx').on(t.conversationId, t.createdAt)],
);

/** Denúncia de conversa/mensagem (moderação §7.8, exigência das lojas). */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    reason: reportReasonEnum('reason').notNull(),
    detail: text('detail'),
    status: reportStatusEnum('status').notNull().default('OPEN'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reports_status_idx').on(t.status, t.createdAt),
    index('reports_conversation_idx').on(t.conversationId),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type CarpenterProfile = typeof carpenterProfiles.$inferSelect;
export type NewCarpenterProfile = typeof carpenterProfiles.$inferInsert;
export type ArchitectProfile = typeof architectProfiles.$inferSelect;
export type NewArchitectProfile = typeof architectProfiles.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
