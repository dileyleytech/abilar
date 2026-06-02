import { describe, it, expect } from 'vitest';
import {
  phoneSchema,
  otpTokenSchema,
  signupRoleSchema,
  carpenterOnboardingSchema,
  requestPhoneOtpSchema,
} from './auth-schemas';

describe('auth-schemas (zod)', () => {
  it('phoneSchema normaliza para E.164', () => {
    expect(phoneSchema.parse('(11) 98765-4321')).toBe('+5511987654321');
    expect(() => phoneSchema.parse('123')).toThrow();
  });

  it('otpTokenSchema exige 6 dígitos', () => {
    expect(otpTokenSchema.parse('123456')).toBe('123456');
    expect(() => otpTokenSchema.parse('12345')).toThrow();
    expect(() => otpTokenSchema.parse('abcdef')).toThrow();
  });

  it('signupRole NÃO permite ADMIN (anti escalonamento de privilégio)', () => {
    expect(signupRoleSchema.parse('CARPENTER')).toBe('CARPENTER');
    expect(() => signupRoleSchema.parse('ADMIN')).toThrow();
  });

  it('requestPhoneOtp aceita role opcional e normaliza telefone', () => {
    const r = requestPhoneOtpSchema.parse({ phone: '11987654321', role: 'CLIENT' });
    expect(r.phone).toBe('+5511987654321');
    expect(r.role).toBe('CLIENT');
  });

  describe('carpenterOnboarding', () => {
    const base = {
      personType: 'PF' as const,
      name: 'João Marceneiro',
      cnpjOrCpf: '529.982.247-25',
      serviceCity: 'São Paulo',
      serviceCep: '01310-100',
      serviceRadiusKm: 20,
      categories: ['COZINHA' as const],
    };
    it('aceita marceneiro PF com CPF válido', () => {
      expect(carpenterOnboardingSchema.parse(base).personType).toBe('PF');
    });
    it('rejeita documento incompatível com o tipo de pessoa', () => {
      expect(() => carpenterOnboardingSchema.parse({ ...base, personType: 'PJ' })).toThrow();
    });
    it('exige ao menos uma categoria', () => {
      expect(() => carpenterOnboardingSchema.parse({ ...base, categories: [] })).toThrow();
    });
  });
});
