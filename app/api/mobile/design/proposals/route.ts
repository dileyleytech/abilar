import type { DesignProposalType } from '@abilar/shared';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { carpenterCanPropose, clientOwnsProject, createProposal, listProposals } from '@/lib/design/proposals';

// GET ?projectId= → lista propostas (cliente dono ou marceneiro com orçamento).
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const projectId = new URL(req.url).searchParams.get('projectId') ?? '';
  const allowed = projectId && ((await clientOwnsProject(projectId, auth.userId)) || (await carpenterCanPropose(projectId, auth.userId)));
  if (!allowed) return json({ error: 'Pedido não encontrado.' }, 404);

  return json({ proposals: await listProposals(projectId) });
}

// POST { projectId, type, note?, state } → cria proposta (marceneiro com orçamento).
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const body = (await req.json().catch(() => null)) as { projectId?: string; type?: DesignProposalType; note?: string; state?: unknown } | null;
  const projectId = body?.projectId ?? '';
  if (!projectId || !(await carpenterCanPropose(projectId, auth.userId))) return json({ error: 'Você precisa ter um orçamento neste pedido.' }, 403);
  if (body?.type !== 'EDIT' && body?.type !== 'SUGGESTION') return json({ error: 'Tipo inválido.' }, 400);

  const r = await createProposal(projectId, auth.userId, { type: body.type, note: body.note, state: body.state as never });
  return r.ok ? json(r.data) : json({ error: r.error }, 400);
}
