import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { clientOwnsProject, decideProposal } from '@/lib/design/proposals';

// POST { projectId, proposalId, decision } → cliente aprova/recusa (aprovar aplica).
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const body = (await req.json().catch(() => null)) as { projectId?: string; proposalId?: string; decision?: string } | null;
  const projectId = body?.projectId ?? '';
  if (!projectId || !(await clientOwnsProject(projectId, auth.userId))) return json({ error: 'Pedido não encontrado.' }, 404);
  if (body?.decision !== 'APPROVED' && body?.decision !== 'REJECTED') return json({ error: 'Decisão inválida.' }, 400);
  if (!body?.proposalId) return json({ error: 'Proposta inválida.' }, 400);

  const r = await decideProposal(projectId, body.proposalId, body.decision);
  return r.ok ? json(r.data) : json({ error: r.error }, 400);
}
