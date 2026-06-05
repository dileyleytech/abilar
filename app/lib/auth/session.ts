import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Role } from '@abilar/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Claims, roleFromClaims, nameFromClaims, idFromClaims } from './claims';

// Lê e VERIFICA as claims do JWT. Com signing keys assimétricas, `getClaims()`
// valida o token localmente (sem ida à rede); o middleware já renovou a sessão.
// `cache` deduplica por request: header + página + actions compartilham 1 leitura.
const getVerifiedClaims = cache(async (): Promise<Claims> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims as Claims) ?? null;
});

/** Id do usuário autenticado (ou null). Local — sem rede. */
export async function getUserId(): Promise<string | null> {
  return idFromClaims(await getVerifiedClaims());
}

/** Id do usuário autenticado; redireciona p/ /entrar se deslogado. */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) redirect('/entrar');
  return id;
}

export type SessionProfile = {
  id: string;
  role: Role;
  name: string | null;
  phone: string | null;
  email: string | null;
};

/** Exige um papel específico; redireciona se deslogado, 404 se papel errado. */
export async function requireRole(role: Role): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect('/entrar');
  if (profile.role !== role) notFound();
  return profile;
}

/** Usuário autenticado + seu profile. Cacheado por request.
 *  Caminho rápido: papel vem do JWT (claim `user_role` do access token hook) —
 *  zero query. Fallback: claim ausente (hook não configurado ou sessão antiga)
 *  → consulta `profiles`. Migra sozinho conforme as sessões renovam o token. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const claims = await getVerifiedClaims();
  const id = idFromClaims(claims);
  if (!id) return null;

  const email = typeof claims?.email === 'string' ? claims.email : null;
  const phone = typeof claims?.phone === 'string' ? claims.phone : null;
  const role = roleFromClaims(claims);

  // Caminho rápido: papel no JWT → não toca o banco.
  if (role) {
    return { id, role, name: nameFromClaims(claims), phone, email };
  }

  // Fallback: busca o profile (hook ainda não ativo p/ esta sessão).
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, name, phone, email')
    .eq('id', id)
    .single();

  if (!profile) {
    // Sessão sem profile (trigger ainda não rodou): devolve o mínimo do auth.
    return { id, role: 'CLIENT', name: nameFromClaims(claims), phone, email };
  }
  return profile as SessionProfile;
});
