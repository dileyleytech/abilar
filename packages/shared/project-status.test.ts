import { describe, it, expect } from 'vitest';
import {
  canTransitionProjectStatus,
  assertProjectTransition,
  isTerminalProjectStatus,
  ProjectStatusError,
} from './project-status';

describe('project-status — máquina de estados', () => {
  it('permite o caminho feliz', () => {
    expect(canTransitionProjectStatus('DRAFT', 'OPEN_FOR_QUOTES')).toBe(true);
    expect(canTransitionProjectStatus('OPEN_FOR_QUOTES', 'IN_NEGOTIATION')).toBe(true);
    expect(canTransitionProjectStatus('IN_NEGOTIATION', 'HIRED')).toBe(true);
    expect(canTransitionProjectStatus('HIRED', 'EXECUTED')).toBe(true);
  });

  it('permite cancelar de qualquer estado não-terminal', () => {
    for (const s of ['DRAFT', 'OPEN_FOR_QUOTES', 'IN_NEGOTIATION', 'HIRED'] as const) {
      expect(canTransitionProjectStatus(s, 'CANCELLED')).toBe(true);
    }
  });

  it('rejeita pulos inválidos', () => {
    expect(canTransitionProjectStatus('DRAFT', 'HIRED')).toBe(false);
    expect(canTransitionProjectStatus('DRAFT', 'EXECUTED')).toBe(false);
    expect(canTransitionProjectStatus('OPEN_FOR_QUOTES', 'EXECUTED')).toBe(false);
  });

  it('estados terminais não saem', () => {
    expect(isTerminalProjectStatus('EXECUTED')).toBe(true);
    expect(isTerminalProjectStatus('CANCELLED')).toBe(true);
    expect(canTransitionProjectStatus('CANCELLED', 'DRAFT')).toBe(false);
    expect(isTerminalProjectStatus('DRAFT')).toBe(false);
  });

  it('assert lança em transição inválida', () => {
    expect(() => assertProjectTransition('DRAFT', 'HIRED')).toThrow(ProjectStatusError);
    expect(() => assertProjectTransition('DRAFT', 'OPEN_FOR_QUOTES')).not.toThrow();
  });
});
