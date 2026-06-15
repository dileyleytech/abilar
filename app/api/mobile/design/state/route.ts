import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { ownsProject } from '@/lib/design/core';
import { loadDesignState } from '@/lib/design/queries';

// GET ?projectId= → estado de design inicial (dono).
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const projectId = new URL(req.url).searchParams.get('projectId') ?? '';
  if (!projectId || !(await ownsProject(projectId, auth.userId))) return json({ error: 'Pedido não encontrado.' }, 404);

  const state = await loadDesignState(projectId);
  return json({ state });
}
