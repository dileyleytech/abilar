import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Role } from '@abilar/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Valida o JWT no Supabase Auth (1 ida à rede). `cache` deduplica por request:
// vários helpers no mesmo render/ação compartilham a mesma chamada.
const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Id do usuário autenticado; redireciona p/ /entrar se deslogado. */
export async function requireUserId(): Promise<string> {
  const user = await getAuthUser();
  if (!user) redirect('/entrar');
  return user.id;
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

/** Usuário autenticado + seu profile. Cacheado por request. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, name, phone, email')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Sessão sem profile (trigger ainda não rodou): devolve o mínimo do auth.
    return {
      id: user.id,
      role: 'CLIENT',
      name: (user.user_metadata?.name as string) ?? null,
      phone: user.phone ?? null,
      email: user.email ?? null,
    };
  }
  return profile as SessionProfile;
});
