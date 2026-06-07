import { conversations, projects, projectMilestones, and, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Assina URLs curtas de mídia para o app. Autoriza por contexto:
//  - conversationId → participante + paths sob chat/{conversationId}/
//  - milestoneId    → participante + paths sob evidence/{milestoneId}/
//  - projectId      → dono OU pedido aberto OU marceneiro engajado + paths sob {projectId}/
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const { paths, conversationId, milestoneId, projectId } = (await req.json().catch(() => ({}))) as {
    paths?: string[];
    conversationId?: string;
    milestoneId?: string;
    projectId?: string;
  };
  if (!Array.isArray(paths) || paths.length === 0) return json({ urls: [] });

  const db = getDb();
  let prefix: string | null = null;

  if (projectId) {
    const [p] = await db.select({ clientId: projects.clientId, status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!p) return json({ error: 'Sem acesso.' }, 403);
    let allowed = p.clientId === auth.userId || p.status === 'OPEN_FOR_QUOTES';
    if (!allowed) {
      const [cv] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.projectId, projectId), eq(conversations.carpenterId, auth.userId)))
        .limit(1);
      allowed = !!cv;
    }
    if (!allowed) return json({ error: 'Sem acesso.' }, 403);
    prefix = `${projectId}/`;
  } else if (conversationId) {
    const [c] = await db
      .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (!c || (c.clientId !== auth.userId && c.carpenterId !== auth.userId)) return json({ error: 'Sem acesso.' }, 403);
    prefix = `chat/${conversationId}/`;
  } else if (milestoneId) {
    const [m] = await db
      .select({ clientId: projectMilestones.clientId, carpenterId: projectMilestones.carpenterId })
      .from(projectMilestones)
      .where(eq(projectMilestones.id, milestoneId))
      .limit(1);
    if (!m || (m.clientId !== auth.userId && m.carpenterId !== auth.userId)) return json({ error: 'Sem acesso.' }, 403);
    prefix = `evidence/${milestoneId}/`;
  } else {
    return json({ error: 'Contexto ausente.' }, 400);
  }

  const safe = paths.filter((p) => typeof p === 'string' && p.startsWith(prefix!));
  const urls = (await Promise.all(safe.map((p) => signedProjectPhotoUrl(p)))).filter((u): u is string => !!u);
  return json({ urls });
}
