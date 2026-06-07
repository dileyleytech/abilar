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
  DONE: 'Concluída — aguardando aprovação',
  APPROVED: 'Aprovada ✓',
};

/** Rótulo do status conforme o papel (DONE muda de "você" p/ "o cliente"). */
export function milestoneStatusLabel(status: MilestoneStatus, isClient: boolean): string {
  if (status === 'DONE') return isClient ? 'Concluída — aguarda você aprovar' : 'Concluída — aguardando o cliente';
  return MILESTONE_STATUS_LABEL[status];
}

export const MATERIAL_CATEGORIES = ['CHAPA', 'ESPELHO', 'FERRAGEM', 'ACESSORIO', 'FITA_BORDA', 'SERVICO', 'FRETE', 'OUTRO'] as const;
export const MATERIAL_CATEGORY_LABEL: Record<string, string> = {
  CHAPA: 'Chapa (MDF/MDP)',
  ESPELHO: 'Espelho / Vidro',
  FERRAGEM: 'Ferragem',
  ACESSORIO: 'Acessório',
  FITA_BORDA: 'Fita de borda',
  SERVICO: 'Serviço / mão de obra',
  FRETE: 'Frete',
  OUTRO: 'Outro',
};
export const MATERIAL_UNITS = ['UN', 'M2', 'ML', 'H'] as const;
export const MATERIAL_UNIT_LABEL: Record<string, string> = { UN: 'unidade', M2: 'm²', ML: 'metro linear', H: 'hora' };

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
