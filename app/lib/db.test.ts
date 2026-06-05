import { describe, it, expect } from 'vitest';
import { poolMaxForEnv } from './db';

describe('poolMaxForEnv', () => {
  it('usa pool maior em dev (queries paralelas não serializam numa conexão só)', () => {
    expect(poolMaxForEnv('development')).toBeGreaterThan(1);
  });

  it('usa max=1 em produção/Workers (Hyperdrive/Supavisor já faz o pooling)', () => {
    expect(poolMaxForEnv('production')).toBe(1);
    expect(poolMaxForEnv('test')).toBe(1);
    expect(poolMaxForEnv(undefined)).toBe(1);
  });
});
