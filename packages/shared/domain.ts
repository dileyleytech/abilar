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

// Obra nova vs substituição (§9 Fase 2 / doc Ciência de Dados).
export const WORK_TYPES = ['NOVA', 'SUBSTITUICAO'] as const;
export const workTypeSchema = z.enum(WORK_TYPES);
export type WorkType = z.infer<typeof workTypeSchema>;

export const KYC_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const kycStatusSchema = z.enum(KYC_STATUS);
export type KycStatus = z.infer<typeof kycStatusSchema>;
