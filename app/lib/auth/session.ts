import 'server-only';
import { notFound, redirect } from 'next/navigation';
import type { Role } from '@abilar/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Id do usuário autenticado; redireciona p/ /entrar se deslogado. */
export async function requireUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

/** Usuário autenticado + seu profile (lido via RLS: só lê o próprio). Null se deslogado. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
}
