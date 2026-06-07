import { projectMilestones, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { notify } from '@/lib/notifications/notify';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Marceneiro avança a etapa: PENDING → IN_PROGRESS → DONE (aguardando o cliente).
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const { milestoneId } = (await req.json().catch(() => ({}))) as { milestoneId?: string };
  if (!milestoneId) return json({ error: 'Etapa inválida.' }, 400);

  const db = getDb();
  const [m] = await db
    .select({
      carpenterId: projectMilestones.carpenterId,
      clientId: projectMilestones.clientId,
      projectId: projectMilestones.projectId,
      label: projectMilestones.label,
      status: projectMilestones.status,
    })
    .from(projectMilestones)
    .where(eq(projectMilestones.id, milestoneId))
    .limit(1);
  if (!m || m.carpenterId !== auth.userId) return json({ error: 'Etapa não encontrada.' }, 404);

  if (m.status === 'PENDING') {
    await db.update(projectMilestones).set({ status: 'IN_PROGRESS' }).where(eq(projectMilestones.id, milestoneId));
    await notify(m.clientId, { title: 'Sua obra avançou 🔨', body: `O marceneiro iniciou: ${m.label}.`, link: `/pedidos/${m.projectId}` });
  } else if (m.status === 'IN_PROGRESS') {
    await db.update(projectMilestones).set({ status: 'DONE', doneAt: sql`now()` }).where(eq(projectMilestones.id, milestoneId));
    await notify(m.clientId, { title: 'Etapa concluída — aprove ✅', body: `${m.label} foi concluída. Confira e aprove para liberar.`, link: `/pedidos/${m.projectId}` });
  } else {
    return json({ error: 'Esta etapa não pode avançar.' }, 409);
  }
  return json({ ok: true });
}
