import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { ownsProject } from '@/lib/design/core';
import { requestPreview } from '@/lib/design/preview';

// POST { projectId } → gera (local) ou enfileira (produção) a prévia. Dono.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const body = (await req.json().catch(() => null)) as { projectId?: string } | null;
  const projectId = body?.projectId ?? '';
  if (!projectId || !(await ownsProject(projectId, auth.userId))) return json({ error: 'Pedido não encontrado.' }, 404);

  const r = await requestPreview(projectId);
  return r.ok ? json(r.data) : json({ error: r.error }, 400);
}
