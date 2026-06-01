import { describe, it, expect } from 'vitest';
import { allocateProportional } from './allocate';

describe('allocateProportional — base do escrow por marco', () => {
  it('distribui os marcos default (§2.7) somando exatamente o total', () => {
    const marcos = [20, 15, 20, 15, 20, 10]; // soma 100
    const total = 1_000_000; // R$ 10.000,00 em centavos
    const parts = allocateProportional(total, marcos);
    expect(parts).toEqual([200000, 150000, 200000, 150000, 200000, 100000]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
  });

  it('não perde nem cria centavos quando há resto', () => {
    const total = 100; // 100 centavos
    const parts = allocateProportional(total, [1, 1, 1]); // 33.33 cada
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts.sort((a, b) => a - b)).toEqual([33, 33, 34]);
  });

  it('lida com total zero', () => {
    expect(allocateProportional(0, [50, 50])).toEqual([0, 0]);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => allocateProportional(100, [])).toThrow();
    expect(() => allocateProportional(100, [0, 0])).toThrow();
    expect(() => allocateProportional(100, [-1, 2])).toThrow();
    expect(() => allocateProportional(10.5, [1])).toThrow();
  });
});
