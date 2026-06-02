import 'server-only';
import type { AuthError } from '@supabase/supabase-js';

// Mensagens amigáveis em PT-BR para os erros do Supabase Auth.
const BY_CODE: Record<string, string> = {
  email_exists: 'Esse e-mail já está em uso por outra conta.',
  user_already_exists: 'Esse e-mail já está em uso por outra conta.',
  email_address_invalid: 'E-mail inválido.',
  phone_exists: 'Esse telefone já está em uso por outra conta.',
  over_email_send_rate_limit: 'Muitas tentativas. Tente novamente em alguns minutos.',
  over_sms_send_rate_limit: 'Muitas tentativas de SMS. Tente novamente em alguns minutos.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  otp_expired: 'Código expirado. Peça um novo.',
  otp_disabled: 'Esse tipo de login está desativado.',
  invalid_credentials: 'Telefone/e-mail ou senha incorretos.',
  weak_password: 'Senha muito fraca. Use ao menos 8 caracteres.',
  same_password: 'A nova senha não pode ser igual à atual.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  phone_not_confirmed: 'Confirme seu telefone antes de entrar.',
  validation_failed: 'Dados inválidos. Confira e tente de novo.',
  user_not_found: 'Conta não encontrada.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  sms_send_failed: 'Não foi possível enviar o SMS. Confira o número.',
};

/** Converte um AuthError do Supabase numa mensagem PT-BR amigável. */
export function authErrorMessage(error: AuthError | null, fallback = 'Algo deu errado. Tente de novo.'): string {
  if (!error) return fallback;
  const code = (error as { code?: string }).code;
  if (code && BY_CODE[code]) return BY_CODE[code];

  const msg = error.message?.toLowerCase() ?? '';
  if (msg.includes('already') && msg.includes('regist')) return 'Esse e-mail já está em uso por outra conta.';
  if (msg.includes('rate limit')) return 'Muitas tentativas. Tente novamente em alguns minutos.';
  if (msg.includes('expired')) return 'Código expirado. Peça um novo.';
  if (msg.includes('unverified')) return 'Número não verificado no provedor de SMS (conta de teste do Twilio).';
  if (msg.includes('invalid login')) return 'Telefone/e-mail ou senha incorretos.';
  return fallback;
}
