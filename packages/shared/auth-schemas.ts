// auth-schemas.ts — validação (zod) de auth/perfil. Fonte de verdade no servidor.
import { z } from 'zod';
import { CATEGORIES, PERSON_TYPES } from './domain';
import { isValidDocument, isValidCep, normalizeBrPhone } from './br';

/** Papéis que podem se auto-cadastrar (ADMIN NÃO — é promovido manualmente). */
export const signupRoleSchema = z.enum(['CLIENT', 'CARPENTER', 'ARCHITECT']);
export type SignupRole = z.infer<typeof signupRoleSchema>;

/** Telefone BR → E.164. Recusa o que `normalizeBrPhone` rejeita. */
export const phoneSchema = z
  .string()
  .transform((v) => normalizeBrPhone(v))
  .refine((v): v is string => v !== null, { message: 'Telefone inválido' });

export const emailSchema = z.string().trim().toLowerCase().email('E-mail inválido');

/** Código OTP de 6 dígitos. */
export const otpTokenSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Código deve ter 6 dígitos');

export const cepSchema = z.string().refine(isValidCep, { message: 'CEP inválido' });

/** Senha — mínimo 8 caracteres. */
export const passwordSchema = z.string().min(8, 'A senha precisa de ao menos 8 caracteres');

/** Login por senha: identificador (telefone OU e-mail) + senha. */
export const signInPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Informe telefone ou e-mail'),
  password: passwordSchema,
});

/** Definir/alterar a própria senha (usuário logado). */
export const setPasswordSchema = z.object({ password: passwordSchema });

/** Início de login por telefone (envia OTP). */
export const requestPhoneOtpSchema = z.object({
  phone: phoneSchema,
  role: signupRoleSchema.optional(), // só no 1º cadastro
});

/** Verificação do OTP. */
export const verifyPhoneOtpSchema = z.object({
  phone: phoneSchema,
  token: otpTokenSchema,
});

/** Login por e-mail (magic link). */
export const requestEmailLinkSchema = z.object({
  email: emailSchema,
  role: signupRoleSchema.optional(),
});

/** Onboarding do marceneiro (§3). Documento validado conforme o tipo de pessoa. */
export const carpenterOnboardingSchema = z
  .object({
    personType: z.enum(PERSON_TYPES),
    name: z.string().trim().min(2, 'Informe o nome'),
    companyName: z.string().trim().optional(),
    cnpjOrCpf: z.string().trim(),
    serviceCity: z.string().trim().min(2, 'Informe a cidade'),
    serviceCep: cepSchema,
    serviceRadiusKm: z.number().int().min(1).max(200),
    categories: z.array(z.enum(CATEGORIES)).min(1, 'Escolha ao menos uma categoria'),
    bio: z.string().trim().max(600).optional(),
  })
  .refine((d) => isValidDocument(d.cnpjOrCpf, d.personType), {
    path: ['cnpjOrCpf'],
    message: 'CPF/CNPJ inválido',
  });
export type CarpenterOnboarding = z.infer<typeof carpenterOnboardingSchema>;

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  cep: cepSchema,
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  district: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().length(2, 'UF deve ter 2 letras').optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;
