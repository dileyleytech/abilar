import type { DesignState } from '@abilar/ai-vision';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { carpenterCanPropose } from '@/lib/design/proposals';
import { proposalDraftPreview } from '@/lib/design/preview';

// POST { projectId, state } → prévia do rascunho do marceneiro (a partir do estado).
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const body = (await req.json().catch(() => null)) as { projectId?: string; state?: DesignState } | null;
  const projectId = body?.projectId ?? '';
  if (!projectId || !(await carpenterCanPropose(projectId, auth.userId))) return json({ error: 'Você precisa ter um orçamento neste pedido.' }, 403);
  if (!body?.state) return json({ error: 'Estado inválido.' }, 400);

  const r = await proposalDraftPreview(projectId, auth.userId, body.state);
  return r.ok ? json(r.data) : json({ error: r.error }, 400);
}
