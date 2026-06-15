import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { ownsProject, restoreDesignState } from '@/lib/design/core';

// POST { projectId, snapshot } → { modules } (dono). UNDO: restaura snapshot anterior.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const body = (await req.json().catch(() => null)) as { projectId?: string; snapshot?: unknown } | null;
  const projectId = body?.projectId ?? '';
  if (!projectId || !(await ownsProject(projectId, auth.userId))) return json({ error: 'Pedido não encontrado.' }, 404);

  const r = await restoreDesignState(projectId, body?.snapshot);
  return r.ok ? json(r.data) : json({ error: r.error }, 400);
}
