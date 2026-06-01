import { describe, it, expect } from 'vitest';
import {
  reaisToCents,
  formatBRL,
  applyPercent,
  sumCents,
  assertCents,
  MoneyError,
} from './money';

describe('money — centavos (regra de ouro #4)', () => {
  describe('reaisToCents', () => {
    it('converte reais para centavos inteiros', () => {
      expect(reaisToCents(1234.56)).toBe(123456);
      expect(reaisToCents(0)).toBe(0);
      expect(reaisToCents(10)).toBe(1000);
    });

    it('arredonda meio-centavo de forma estável (sem erro de float)', () => {
      expect(reaisToCents(1.005)).toBe(101);
      expect(reaisToCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
    });

    it('rejeita valores não finitos', () => {
      expect(() => reaisToCents(NaN)).toThrow(MoneyError);
      expect(() => reaisToCents(Infinity)).toThrow(MoneyError);
    });
  });

  describe('assertCents', () => {
    it('aceita inteiros não-negativos', () => {
      expect(() => assertCents(0)).not.toThrow();
      expect(() => assertCents(123456)).not.toThrow();
    });

    it('rejeita fração e negativo', () => {
      expect(() => assertCents(10.5)).toThrow(MoneyError);
      expect(() => assertCents(-1)).toThrow(MoneyError);
    });
  });

  describe('applyPercent', () => {
    it('aplica percentual e arredonda', () => {
      expect(applyPercent(10000, 12.5)).toBe(1250);
      expect(applyPercent(333, 10)).toBe(33); // 33.3 -> 33
      expect(applyPercent(10000, 0)).toBe(0);
    });

    it('rejeita percentual inválido', () => {
      expect(() => applyPercent(100, -5)).toThrow(MoneyError);
    });
  });

  describe('sumCents', () => {
    it('soma com validação', () => {
      expect(sumCents([100, 200, 300])).toBe(600);
      expect(sumCents([])).toBe(0);
    });
    it('rejeita item inválido', () => {
      expect(() => sumCents([100, 1.5])).toThrow(MoneyError);
    });
  });

  describe('formatBRL', () => {
    // Intl pt-BR usa espaço não-quebrável (U+00A0); \s normaliza para não
    // depender da versão do ICU.
    const norm = (s: string) => s.replace(/\s/g, ' ');
    it('formata como moeda brasileira', () => {
      expect(norm(formatBRL(123456))).toBe('R$ 1.234,56');
      expect(norm(formatBRL(0))).toBe('R$ 0,00');
    });
  });
});
