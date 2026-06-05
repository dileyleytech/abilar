'use server';

import { redirect } from 'next/navigation';
import {
  requestPhoneOtpSchema,
  verifyPhoneOtpSchema,
  requestEmailLinkSchema,
  signInPasswordSchema,
  setPasswordSchema,
  updateNameSchema,
  updateEmailSchema,
  changePhoneSchema,
  confirmPhoneChangeSchema,
  normalizeBrPhone,
} from '@abilar/shared';
import { profiles, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authErrorMessage } from '@/lib/auth/errors';

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
  if (error) return { ok: false, error: authErrorMessage(error, 'Não foi possível enviar o código. Tente de novo.') };
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
  if (error) return { ok: false, error: authErrorMessage(error, 'Código incorreto ou expirado.') };
  redirect('/'); // a home roteia por papel (cliente/marceneiro/admin)
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
  if (error) return { ok: false, error: authErrorMessage(error, 'Não foi possível enviar o link. Tente de novo.') };
  return { ok: true };
}

/** Login por SENHA (sem SMS). Identificador pode ser telefone (E.164) ou e-mail. */
export async function signInWithPassword(input: unknown): Promise<ActionResult> {
  const parsed = signInPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };

  const supabase = await createSupabaseServerClient();
  const phone = normalizeBrPhone(parsed.data.identifier);
  const credential = phone
    ? { phone, password: parsed.data.password }
    : { email: parsed.data.identifier.trim().toLowerCase(), password: parsed.data.password };

  const { error } = await supabase.auth.signInWithPassword(credential);
  if (error) return { ok: false, error: authErrorMessage(error, 'Telefone/e-mail ou senha incorretos.') };
  redirect('/'); // a home roteia por papel
}

/** Define/atualiza a senha do usuário logado (ex.: quem entrou por OTP). */
export async function setPassword(input: unknown): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'A senha precisa de ao menos 8 caracteres.' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Faça login primeiro.' };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authErrorMessage(error, 'Não foi possível salvar a senha.') };
  return { ok: true };
}

// ── Meu perfil ───────────────────────────────────────────────────────────────

async function currentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Atualiza o nome (profiles + metadata do auth). */
export async function updateName(input: unknown): Promise<ActionResult> {
  const parsed = updateNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Informe um nome válido.' };
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };

  const supabase = await createSupabaseServerClient();
  await supabase.auth.updateUser({ data: { name: parsed.data.name } });
  await getDb()
    .update(profiles)
    .set({ name: parsed.data.name, updatedAt: sql`now()` })
    .where(eq(profiles.id, userId));
  return { ok: true };
}

/** Inicia troca de e-mail (Supabase envia confirmação ao novo e-mail). */
export async function updateEmail(input: unknown): Promise<ActionResult> {
  const parsed = updateEmailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'E-mail inválido.' };
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) return { ok: false, error: authErrorMessage(error, 'Não foi possível trocar o e-mail.') };
  return { ok: true };
}

/** Inicia troca de telefone: envia OTP ao novo número (type phone_change).
 *  TODO(segurança): cooldown + notificar o número antigo (doc Segurança). */
export async function requestPhoneChange(input: unknown): Promise<ActionResult> {
  const parsed = changePhoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Telefone inválido.' };
  if (!(await currentUserId())) return { ok: false, error: 'Faça login.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ phone: parsed.data.phone });
  if (error) return { ok: false, error: authErrorMessage(error, 'Não foi possível enviar o código.') };
  return { ok: true };
}

/** Confirma a troca de telefone com o OTP recebido. */
export async function confirmPhoneChange(input: unknown): Promise<ActionResult> {
  const parsed = confirmPhoneChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: 'phone_change',
  });
  if (error) return { ok: false, error: authErrorMessage(error, 'Código incorreto ou expirado.') };

  await getDb()
    .update(profiles)
    .set({ phone: parsed.data.phone, updatedAt: sql`now()` })
    .where(eq(profiles.id, userId));
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/entrar');
}
