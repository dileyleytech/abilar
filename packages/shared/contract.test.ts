import { describe, it, expect } from 'vitest';
import { DEFAULT_MILESTONES, milestonesTotalPct } from './contract';

describe('contrato — marcos (§2.7/§6.5)', () => {
  it('os marcos default somam 100%', () => {
    expect(milestonesTotalPct(DEFAULT_MILESTONES)).toBe(100);
  });

  it('tem o sinal (M0) como primeiro marco', () => {
    expect(DEFAULT_MILESTONES[0]?.key).toBe('M0');
    expect(DEFAULT_MILESTONES[0]?.pct).toBeGreaterThan(0);
  });
});
