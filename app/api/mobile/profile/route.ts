import { z } from 'zod';
import { profiles, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

const nameSchema = z.string().trim().min(2, 'Informe um nome válido').max(80);

// Atualiza o nome do usuário (profiles + metadata do auth). JSON: { name }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Nome inválido.' }, 400);

  await getDb().update(profiles).set({ name: parsed.data, updatedAt: sql`now()` }).where(eq(profiles.id, auth.userId));
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(auth.userId, { user_metadata: { name: parsed.data } });
  return json({ ok: true });
}
