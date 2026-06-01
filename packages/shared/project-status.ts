// project-status.ts — máquina de estados do Project (pura, testável).
import type { ProjectStatus } from './domain';

/** Transições permitidas. O servidor é a fonte de verdade do status. */
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  DRAFT: ['OPEN_FOR_QUOTES', 'CANCELLED'],
  OPEN_FOR_QUOTES: ['IN_NEGOTIATION', 'CANCELLED'],
  IN_NEGOTIATION: ['HIRED', 'OPEN_FOR_QUOTES', 'CANCELLED'],
  HIRED: ['EXECUTED', 'CANCELLED'],
  EXECUTED: [],
  CANCELLED: [],
} as const;

export function isTerminalProjectStatus(status: ProjectStatus): boolean {
  return PROJECT_STATUS_TRANSITIONS[status].length === 0;
}

export function canTransitionProjectStatus(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_STATUS_TRANSITIONS[from].includes(to);
}

export class ProjectStatusError extends Error {}

/** Lança se a transição for inválida (uso no servidor antes de persistir). */
export function assertProjectTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (!canTransitionProjectStatus(from, to)) {
    throw new ProjectStatusError(`Transição inválida: ${from} → ${to}`);
  }
}
