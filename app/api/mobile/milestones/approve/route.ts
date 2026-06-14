import { projectMilestones, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { notify } from '@/lib/notifications/notify';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Cliente aprova a etapa concluída: DONE → APPROVED. Tudo aprovado → projeto EXECUTED.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const { milestoneId } = (await req.json().catch(() => ({}))) as { milestoneId?: string };
  if (!milestoneId) return json({ error: 'Etapa inválida.' }, 400);

  const db = getDb();
  const [m] = await db
    .select({
      clientId: projectMilestones.clientId,
      carpenterId: projectMilestones.carpenterId,
      projectId: projectMilestones.projectId,
      label: projectMilestones.label,
      status: projectMilestones.status,
    })
    .from(projectMilestones)
    .where(eq(projectMilestones.id, milestoneId))
    .limit(1);
  if (!m || m.clientId !== auth.userId) return json({ error: 'Etapa não encontrada.' }, 404);
  if (m.status !== 'DONE') return json({ error: 'Só dá para aprovar uma etapa concluída.' }, 409);

  await db.update(projectMilestones).set({ status: 'APPROVED', approvedAt: sql`now()` }).where(eq(projectMilestones.id, milestoneId));
  await notify(m.carpenterId, { title: 'Etapa aprovada ✓', body: `O cliente aprovou: ${m.label}.`, link: `/marceneiro/pedidos/${m.projectId}` });

  const [pending] = await db
    .select({ id: projectMilestones.id })
    .from(projectMilestones)
    .where(and(eq(projectMilestones.projectId, m.projectId), sql`${projectMilestones.status} <> 'APPROVED'`))
    .limit(1);
  if (!pending) {
    await db.update(projects).set({ status: 'EXECUTED', updatedAt: sql`now()` }).where(eq(projects.id, m.projectId));
    await notify(m.carpenterId, { title: 'Obra concluída! 🎉', body: 'Todas as etapas foram aprovadas pelo cliente.', link: `/marceneiro/pedidos/${m.projectId}` });
  }
  return json({ ok: true });
}
