import type { Category, ProjectStatus } from '@abilar/shared';

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
