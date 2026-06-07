import type {
  Category,
  ProjectStatus,
  QuoteStatus,
  ReportReason,
  ReportStatus,
  MaterialCategory,
  MaterialUnit,
  MilestoneStatus,
} from '@abilar/shared';

export const CATEGORY_EMOJI: Record<Category, string> = {
  GUARDA_ROUPA: '🚪',
  COZINHA: '🍳',
  PAINEL_TV: '📺',
  ESTANTE: '📚',
  HOME_OFFICE: '💻',
  BANHEIRO: '🚿',
  LAVANDERIA: '🧺',
  OUTRO: '🪵',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  GUARDA_ROUPA: 'Guarda-roupa',
  COZINHA: 'Cozinha',
  PAINEL_TV: 'Painel de TV',
  ESTANTE: 'Estante',
  HOME_OFFICE: 'Home office',
  BANHEIRO: 'Banheiro',
  LAVANDERIA: 'Lavanderia',
  OUTRO: 'Outro',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Rascunho',
  OPEN_FOR_QUOTES: 'Recebendo orçamentos',
  IN_NEGOTIATION: 'Em negociação',
  HIRED: 'Contratado',
  EXECUTED: 'Concluído',
  CANCELLED: 'Cancelado',
};

/** Classes Tailwind do badge de status (cores da marca via tokens). */
export const PROJECT_STATUS_BADGE: Record<ProjectStatus, string> = {
  DRAFT: 'bg-deep text-muted',
  OPEN_FOR_QUOTES: 'bg-brand-secondary/15 text-brand-secondary',
  IN_NEGOTIATION: 'bg-ochre/25 text-charcoal',
  HIRED: 'bg-brand-primary/15 text-brand-primary',
  EXECUTED: 'bg-sage/30 text-charcoal',
  CANCELLED: 'bg-charcoal/10 text-muted line-through',
};

/** Rótulos do status do orçamento, na ótica do marceneiro. */
export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  SENT: 'Enviado',
  PRE_APPROVED: 'Pré-aprovado',
  ACCEPTED: 'Aceito',
  REJECTED: 'Recusado',
  EXPIRED: 'Expirado',
  PAID: 'Pago',
};

export const QUOTE_STATUS_BADGE: Record<QuoteStatus, string> = {
  SENT: 'bg-brand-secondary/15 text-brand-secondary',
  PRE_APPROVED: 'bg-brand-primary/15 text-brand-primary',
  ACCEPTED: 'bg-sage/30 text-charcoal',
  REJECTED: 'bg-charcoal/10 text-muted line-through',
  EXPIRED: 'bg-deep text-muted',
  PAID: 'bg-sage/30 text-charcoal',
};

/** Catálogo de custo (§7.6) — categorias e unidades. */
export const MATERIAL_CATEGORY_LABEL: Record<MaterialCategory, string> = {
  CHAPA: 'Chapa (MDF/MDP)',
  ESPELHO: 'Espelho / Vidro',
  FERRAGEM: 'Ferragem',
  ACESSORIO: 'Acessório',
  FITA_BORDA: 'Fita de borda',
  SERVICO: 'Serviço / mão de obra',
  FRETE: 'Frete',
  OUTRO: 'Outro',
};

export const MATERIAL_UNIT_LABEL: Record<MaterialUnit, string> = {
  UN: 'unidade',
  M2: 'm²',
  ML: 'metro linear',
  H: 'hora',
};

/** Andamento das etapas da obra (§6.4). */
export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluída — aguardando aprovação',
  APPROVED: 'Aprovada',
};

export const MILESTONE_STATUS_BADGE: Record<MilestoneStatus, string> = {
  PENDING: 'bg-deep text-muted',
  IN_PROGRESS: 'bg-ochre/25 text-charcoal',
  DONE: 'bg-brand-secondary/15 text-brand-secondary',
  APPROVED: 'bg-sage/30 text-charcoal',
};

/** Razões de denúncia do chat (§7.8). */
export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  CONTACT_OUTSIDE: 'Tentou negociar/pagar por fora',
  HARASSMENT: 'Ofensa ou assédio',
  SCAM: 'Golpe ou fraude',
  SPAM: 'Spam ou propaganda',
  OTHER: 'Outro motivo',
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: 'Aberta',
  REVIEWED: 'Revisada',
  DISMISSED: 'Dispensada',
  ACTIONED: 'Ação tomada',
};

export const REPORT_STATUS_BADGE: Record<ReportStatus, string> = {
  OPEN: 'bg-ochre/25 text-charcoal',
  REVIEWED: 'bg-brand-secondary/15 text-brand-secondary',
  DISMISSED: 'bg-charcoal/10 text-muted',
  ACTIONED: 'bg-sage/30 text-charcoal',
};

/** Variante SÓLIDA (fundo cheio + texto branco) para badge legível sobre foto. */
export const QUOTE_STATUS_BADGE_SOLID: Record<QuoteStatus, string> = {
  SENT: 'bg-brand-secondary text-white',
  PRE_APPROVED: 'bg-brand-primary text-white',
  ACCEPTED: 'bg-brand-primary text-white',
  REJECTED: 'bg-charcoal/85 text-white',
  EXPIRED: 'bg-charcoal/65 text-white',
  PAID: 'bg-brand-primary text-white',
};
