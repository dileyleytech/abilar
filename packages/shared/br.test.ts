import { describe, it, expect } from 'vitest';
import { isValidCpf, isValidCnpj, isValidDocument, isValidCep, normalizeBrPhone } from './br';

describe('br — validadores brasileiros', () => {
  describe('CPF', () => {
    it('aceita CPF válido (com e sem máscara)', () => {
      expect(isValidCpf('529.982.247-25')).toBe(true);
      expect(isValidCpf('52998224725')).toBe(true);
    });
    it('rejeita inválido, tamanho errado e dígitos repetidos', () => {
      expect(isValidCpf('529.982.247-24')).toBe(false);
      expect(isValidCpf('111.111.111-11')).toBe(false);
      expect(isValidCpf('123')).toBe(false);
    });
  });

  describe('CNPJ', () => {
    it('aceita CNPJ válido', () => {
      expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
      expect(isValidCnpj('11222333000181')).toBe(true);
    });
    it('rejeita inválido e repetidos', () => {
      expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
      expect(isValidCnpj('00000000000000')).toBe(false);
    });
  });

  describe('isValidDocument', () => {
    it('PF usa CPF; MEI/PJ usam CNPJ', () => {
      expect(isValidDocument('52998224725', 'PF')).toBe(true);
      expect(isValidDocument('11222333000181', 'MEI')).toBe(true);
      expect(isValidDocument('11222333000181', 'PJ')).toBe(true);
      expect(isValidDocument('52998224725', 'PJ')).toBe(false);
    });
  });

  describe('CEP', () => {
    it('valida 8 dígitos', () => {
      expect(isValidCep('01310-100')).toBe(true);
      expect(isValidCep('01310100')).toBe(true);
      expect(isValidCep('123')).toBe(false);
    });
  });

  describe('normalizeBrPhone', () => {
    it('normaliza celular para E.164', () => {
      expect(normalizeBrPhone('(11) 98765-4321')).toBe('+5511987654321');
      expect(normalizeBrPhone('11987654321')).toBe('+5511987654321');
      expect(normalizeBrPhone('+55 11 98765-4321')).toBe('+5511987654321');
    });
    it('aceita fixo (10 dígitos)', () => {
      expect(normalizeBrPhone('1133334444')).toBe('+551133334444');
    });
    it('rejeita inválidos', () => {
      expect(normalizeBrPhone('987654321')).toBeNull(); // sem DDD
      expect(normalizeBrPhone('11887654321')).toBeNull(); // 11 dígitos sem 9
      expect(normalizeBrPhone('00987654321')).toBeNull(); // DDD inválido
    });
  });
});
