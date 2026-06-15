// domain.ts — enums e schemas zod compartilhados (web + mobile + workers).
// Fonte única dos literais de domínio; o schema Drizzle (db/) referencia estes.
import { z } from 'zod';

export const ROLES = ['CLIENT', 'CARPENTER', 'ARCHITECT', 'ADMIN'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const PERSON_TYPES = ['MEI', 'PJ', 'PF'] as const;
export const personTypeSchema = z.enum(PERSON_TYPES);
export type PersonType = z.infer<typeof personTypeSchema>;

// Categorias de marcenaria (§2.1 do mestre). TODO(fase 2): completar a taxonomia.
export const CATEGORIES = [
  'GUARDA_ROUPA',
  'COZINHA',
  'PAINEL_TV',
  'ESTANTE',
  'HOME_OFFICE',
  'BANHEIRO',
  'LAVANDERIA',
  'OUTRO',
] as const;
export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const PROJECT_STATUS = [
  'DRAFT',
  'OPEN_FOR_QUOTES',
  'IN_NEGOTIATION',
  'HIRED',
  'EXECUTED',
  'CANCELLED',
] as const;
export const projectStatusSchema = z.enum(PROJECT_STATUS);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

// Obra nova vs substituição (§3 / doc Design §5 / Ciência de Dados).
export const WORK_TYPES = ['NEW_INSTALL', 'REPLACE_EXISTING'] as const;
export const workTypeSchema = z.enum(WORK_TYPES);
export type WorkType = z.infer<typeof workTypeSchema>;

// Origem do projeto: gerado por IA (chat de design) vs projeto de arquiteto (PDF).
export const SOURCE_TYPES = ['AI_GENERATED', 'ARCHITECT_PROJECT'] as const;
export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export type SourceType = z.infer<typeof sourceTypeSchema>;

// Tipos de foto/anexo de um projeto (§3).
export const PHOTO_KINDS = ['ORIGINAL_ROOM', 'GENERATED', 'REFERENCE', 'ARCHITECT_PDF'] as const;
export const photoKindSchema = z.enum(PHOTO_KINDS);
export type PhotoKind = z.infer<typeof photoKindSchema>;

export const KYC_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const kycStatusSchema = z.enum(KYC_STATUS);
export type KycStatus = z.infer<typeof kycStatusSchema>;

// Proposta de design do marceneiro (§8.6): EDIT entra na proposta dele; SUGGESTION
// volta pro cliente aprovar. Versionada e atribuída ao autor.
export const DESIGN_PROPOSAL_TYPES = ['EDIT', 'SUGGESTION'] as const;
export const designProposalTypeSchema = z.enum(DESIGN_PROPOSAL_TYPES);
export type DesignProposalType = z.infer<typeof designProposalTypeSchema>;

export const DESIGN_PROPOSAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'APPLIED'] as const;
export const designProposalStatusSchema = z.enum(DESIGN_PROPOSAL_STATUS);
export type DesignProposalStatus = z.infer<typeof designProposalStatusSchema>;

// Status do orçamento (Quote) — §3.
export const QUOTE_STATUS = ['SENT', 'PRE_APPROVED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'PAID'] as const;
export const quoteStatusSchema = z.enum(QUOTE_STATUS);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

// Status da conversa (chat cliente↔marceneiro) — §7.8.
export const CONVERSATION_STATUS = ['ACTIVE', 'CLOSED', 'BLOCKED'] as const;
export const conversationStatusSchema = z.enum(CONVERSATION_STATUS);
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

/** Só uma conversa ATIVA aceita novas mensagens (encerrada/bloqueada não). */
export function canMessage(status: ConversationStatus): boolean {
  return status === 'ACTIVE';
}

// Moderação do chat (exigência das lojas) — §7.8: denunciar mensagem/conversa.
export const REPORT_REASONS = [
  'CONTACT_OUTSIDE', // tentar fechar/pagar por fora da plataforma
  'HARASSMENT', // assédio, ofensa, discurso de ódio
  'SCAM', // golpe / fraude
  'SPAM', // spam / propaganda
  'OTHER',
] as const;
export const reportReasonSchema = z.enum(REPORT_REASONS);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const REPORT_STATUS = ['OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED'] as const;
export const reportStatusSchema = z.enum(REPORT_STATUS);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

// ── Gestão financeira do marceneiro (§7.6): catálogo de custo (CarpenterMaterial)
export const MATERIAL_CATEGORIES = [
  'CHAPA', // chapas de MDF/MDP
  'ESPELHO', // espelho / vidro
  'FERRAGEM', // dobradiças, parafusos, puxadores
  'ACESSORIO', // cestos, aramados, iluminação
  'FITA_BORDA',
  'SERVICO', // mão de obra
  'FRETE',
  'OUTRO',
] as const;
export const materialCategorySchema = z.enum(MATERIAL_CATEGORIES);
export type MaterialCategory = z.infer<typeof materialCategorySchema>;

export const MATERIAL_UNITS = ['UN', 'M2', 'ML', 'H'] as const; // unidade, m², metro linear, hora
export const materialUnitSchema = z.enum(MATERIAL_UNITS);
export type MaterialUnit = z.infer<typeof materialUnitSchema>;

/** Entrada validada de um item do catálogo de custo. Custo em centavos (BIGINT). */
export const materialInputSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  category: materialCategorySchema,
  unit: materialUnitSchema,
  unitCostCents: z.number().int('Use centavos inteiros').min(0, 'Custo não pode ser negativo'),
  sku: z.string().trim().max(60).optional(),
  supplier: z.string().trim().max(120).optional(),
});
export type MaterialInput = z.infer<typeof materialInputSchema>;

/** Linha do orçamento (construtor por itens, §7.6). Vem do catálogo ou é avulsa.
 *  qty pode ser fracionária (ex.: 4,5 m²); custo em centavos. */
export const quoteLineItemSchema = z.object({
  materialId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'Descreva o item').max(120),
  category: materialCategorySchema,
  unit: materialUnitSchema,
  qty: z.number().positive('Quantidade deve ser maior que zero').max(100000),
  unitCostCents: z.number().int().min(0),
});
export type QuoteLineItem = z.infer<typeof quoteLineItemSchema>;

/** Entrada validada de uma denúncia (razão + detalhe opcional). */
export const reportInputSchema = z.object({
  reason: reportReasonSchema,
  detail: z.string().trim().max(1000).optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;
