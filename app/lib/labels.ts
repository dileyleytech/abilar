import type { Category, ProjectStatus } from '@abilar/shared';

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
