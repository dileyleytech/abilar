import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { getArchitectDashboard } from '@/lib/architects/queries';

// Painel do arquiteto (seus projetos + comissões + código de indicação).
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  if (auth.role !== 'ARCHITECT') return json({ error: 'Apenas arquitetos.' }, 403);
  return json({ ok: true, dashboard: await getArchitectDashboard(auth.userId) });
}
