import { describe, it, expect } from 'vitest';
import { cmToMm, mmToCm, formatCm, isSaneMm, assertMm, DimensionError } from './dimension';

describe('dimension — milímetros (regra de ouro #5)', () => {
  it('converte cm <-> mm', () => {
    expect(cmToMm(240)).toBe(2400);
    expect(cmToMm(55.5)).toBe(555);
    expect(mmToCm(2400)).toBe(240);
  });

  it('formata mm como cm para a UI', () => {
    expect(formatCm(2400)).toBe('240 cm');
    expect(formatCm(555)).toBe('55,5 cm');
  });

  it('rejeita entradas inválidas', () => {
    expect(() => cmToMm(0)).toThrow(DimensionError);
    expect(() => cmToMm(-1)).toThrow(DimensionError);
    expect(() => assertMm(10.5)).toThrow(DimensionError);
    expect(() => mmToCm(-5)).toThrow(DimensionError);
  });

  it('valida sanidade (5 cm a 6 m)', () => {
    expect(isSaneMm(2400)).toBe(true);
    expect(isSaneMm(40)).toBe(false); // < 5 cm
    expect(isSaneMm(7000)).toBe(false); // > 6 m
    expect(isSaneMm(100.5)).toBe(false); // não inteiro
  });
});
