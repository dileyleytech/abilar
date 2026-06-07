// contract.ts — contrato padrão por projeto aprovado (§6.5). ESTRUTURA, não teor
// legal: o texto DEVE ser revisado por advogado antes de produção. Função pura.
import { z } from 'zod';

export const CONTRACT_STATUS = ['DRAFT', 'SIGNED', 'CANCELLED'] as const;
export const contractStatusSchema = z.enum(CONTRACT_STATUS);
export type ContractStatus = z.infer<typeof contractStatusSchema>;

// Andamento de cada marco da obra (§6.4): pendente → em andamento (marceneiro) →
// concluído (aguardando cliente) → aprovado (cliente).
export const MILESTONE_STATUS = ['PENDING', 'IN_PROGRESS', 'DONE', 'APPROVED'] as const;
export const milestoneStatusSchema = z.enum(MILESTONE_STATUS);
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

/** Marco de liberação de pagamento (§2.7). Percentuais default, configuráveis. */
export interface Milestone {
  key: string;
  label: string;
  event: string;
  pct: number;
}

export const DEFAULT_MILESTONES: Milestone[] = [
  { key: 'M0', label: 'Sinal / início', event: 'Medição final no local; liberado ~1 semana antes de iniciar', pct: 20 },
  { key: 'M1', label: 'Material + corte', event: 'Chapas e ferragens compradas; peças cortadas, furadas e com borda', pct: 15 },
  { key: 'M2', label: 'Montagem + acabamento', event: 'Módulos montados na oficina; pintura/laca; ferragens instaladas', pct: 20 },
  { key: 'M3', label: 'Entrega no local', event: 'Peças transportadas ao endereço do cliente', pct: 15 },
  { key: 'M4', label: 'Instalação', event: 'Módulos instalados e fixados no local', pct: 20 },
  { key: 'M5', label: 'Vistoria final', event: 'Regulagem de portas/gavetas, arremates, vedação; cliente aprova', pct: 10 },
];

export const milestonesTotalPct = (ms: Milestone[]): number => ms.reduce((acc, m) => acc + m.pct, 0);

/** Cláusulas do contrato padrão (TEMPLATE — revisar com advogado, §6.5). */
export const CONTRACT_CLAUSES: { title: string; body: string }[] = [
  {
    title: 'Pagamento por evolução da obra (escrow)',
    body: 'O pagamento fica retido na Abilar e é liberado ao marceneiro por marco concluído (cronograma acima). Cada marco, exceto o sinal, exige evidência (foto) do marceneiro e aprovação do cliente. O cliente só paga o que foi aprovado; o marceneiro recebe por etapa entregue.',
  },
  {
    title: 'Garantias',
    body: 'O marceneiro garante a peça contra defeitos de fabricação e instalação pelo prazo legal, prestando assistência para correção de problemas decorrentes da execução.',
  },
  {
    title: 'Prazos',
    body: 'Início e estimativa de término são combinados entre as partes no chat e podem ser ajustados por acordo, registrado na plataforma.',
  },
  {
    title: 'Cancelamento e reembolso',
    body: 'Cancelamentos seguem as regras da plataforma; valores de marcos ainda não liberados podem ser reembolsados conforme a etapa de execução e eventuais custos já incorridos.',
  },
  {
    title: 'Disputa',
    body: 'Havendo divergência sobre um marco, a liberação fica suspensa e o caso é encaminhado à mediação da Abilar antes de qualquer liberação ou reembolso.',
  },
  {
    title: 'Proteção de dados (LGPD)',
    body: 'Os dados pessoais são tratados conforme a LGPD, apenas para a execução deste contrato e na medida necessária à prestação do serviço.',
  },
  {
    title: 'Foro',
    body: 'Fica eleito o foro do domicílio do cliente para dirimir questões oriundas deste contrato.',
  },
];

export const CONTRACT_LEGAL_NOTE =
  'Modelo padrão Abilar. Documento gerado eletronicamente; o aceite das duas partes é registrado com data/hora. Texto sujeito a revisão jurídica.';
