import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Exclusão de conta in-app (exigência Apple + Google). Remove o usuário de auth;
// os dados em cascata (profiles → projetos/contratos/...) caem pelas FKs.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(auth.userId);
  if (error) return json({ error: 'Não foi possível excluir a conta.' }, 502);
  return json({ ok: true });
}
