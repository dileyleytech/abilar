import { describe, it, expect } from 'vitest';
import {
  cmToMm,
  mmToCm,
  formatCm,
  isValidMm,
  assertMm,
  dimensionCmError,
  DimensionError,
} from './dimension';

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

  it('isValidMm aceita inteiro positivo (sem limite máximo)', () => {
    expect(isValidMm(2400)).toBe(true);
    expect(isValidMm(99999)).toBe(true); // sem limite
    expect(isValidMm(0)).toBe(false);
    expect(isValidMm(-1)).toBe(false);
    expect(isValidMm(100.5)).toBe(false); // não inteiro
  });

  it('dimensionCmError só rejeita não-positivo (sem limite de tamanho)', () => {
    expect(dimensionCmError(240)).toBeNull();
    expect(dimensionCmError(3)).toBeNull(); // sem mínimo
    expect(dimensionCmError(700)).toBeNull(); // sem máximo
    expect(dimensionCmError(0)).toBe('Informe a medida em cm');
    expect(dimensionCmError(-5)).toBe('Informe a medida em cm');
  });
});
