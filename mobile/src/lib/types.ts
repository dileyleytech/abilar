// Tipos/labels espelhados de packages/shared (mantidos em cópia: o Metro não
// importa o pacote do monorepo). Sincronize ao mudar os enums do backend.
export type Role = 'CLIENT' | 'CARPENTER' | 'ARCHITECT' | 'ADMIN';

export type ProjectStatus =
  | 'DRAFT'
  | 'OPEN_FOR_QUOTES'
  | 'IN_NEGOTIATION'
  | 'HIRED'
  | 'EXECUTED'
  | 'CANCELLED';

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'APPROVED';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Rascunho',
  OPEN_FOR_QUOTES: 'Recebendo orçamentos',
  IN_NEGOTIATION: 'Em negociação',
  HIRED: 'Contratado',
  EXECUTED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluída — aguardando você',
  APPROVED: 'Aprovada ✓',
};

export const CATEGORY_LABEL: Record<string, string> = {
  GUARDA_ROUPA: 'Guarda-roupa',
  COZINHA: 'Cozinha',
  PAINEL_TV: 'Painel de TV',
  ESTANTE: 'Estante',
  HOME_OFFICE: 'Home office',
  BANHEIRO: 'Banheiro',
  LAVANDERIA: 'Lavanderia',
  OUTRO: 'Outro',
};
