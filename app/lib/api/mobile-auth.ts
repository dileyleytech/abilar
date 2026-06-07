import 'server-only';
import { profiles, eq } from '@abilar/db';
import type { Role } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type MobileAuth = { userId: string; role: Role };

/** Autentica uma requisição do app pelo header Authorization: Bearer <JWT>.
 *  Valida o token no Supabase (service role) e carrega o papel do perfil. */
export async function authenticateBearer(req: Request): Promise<MobileAuth | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const db = getDb();
  const [p] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, data.user.id)).limit(1);
  return { userId: data.user.id, role: (p?.role ?? 'CLIENT') as Role };
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
