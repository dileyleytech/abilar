'use server';

import { redirect } from 'next/navigation';
import {
  requestPhoneOtpSchema,
  verifyPhoneOtpSchema,
  requestEmailLinkSchema,
} from '@abilar/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ActionResult = { ok: true } | { ok: false; error: string };

// Anti SMS-pumping: o limite de envio de OTP é configurado no Supabase Auth
// (Rate Limits) — decisão #2. TODO(Fase 1+): throttle por IP/telefone via KV
// (binding CACHE) como segunda camada antes de chamar o provider.

/** Envia OTP por SMS (Twilio Verify). `role` (1º cadastro) vai no metadata e o
 *  trigger handle_new_user clampa (ADMIN nunca via signup). */
export async function requestPhoneOtp(input: unknown): Promise<ActionResult> {
  const parsed = requestPhoneOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Telefone inválido.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
    options: parsed.data.role ? { data: { role: parsed.data.role } } : undefined,
  });
  if (error) return { ok: false, error: 'Não foi possível enviar o código. Tente de novo.' };
  return { ok: true };
}

/** Verifica o OTP por SMS e cria a sessão. Em sucesso, redireciona. */
export async function verifyPhoneOtp(input: unknown): Promise<ActionResult> {
  const parsed = verifyPhoneOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: 'sms',
  });
  if (error) return { ok: false, error: 'Código incorreto ou expirado.' };
  redirect('/conta');
}

/** Envia magic link por e-mail (opção gratuita). */
export async function requestEmailLink(input: unknown): Promise<ActionResult> {
  const parsed = requestEmailLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'E-mail inválido.' };

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      data: parsed.data.role ? { role: parsed.data.role } : undefined,
    },
  });
  if (error) return { ok: false, error: 'Não foi possível enviar o link. Tente de novo.' };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/entrar');
}
