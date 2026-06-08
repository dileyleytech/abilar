import { projects, projectMilestones, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

const reDate = /^\d{4}-\d{2}-\d{2}$/;

// Marceneiro define os prazos (previsão) da obra da plataforma. JSON: { projectId, startDate?, endDate? }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  const { projectId, startDate, endDate } = (await req.json().catch(() => ({}))) as { projectId?: string; startDate?: string; endDate?: string };
  if (!projectId) return json({ error: 'Obra inválida.' }, 400);
  if ((startDate && !reDate.test(startDate)) || (endDate && !reDate.test(endDate))) return json({ error: 'Data inválida.' }, 400);

  const db = getDb();
  const [m] = await db
    .select({ id: projectMilestones.id })
    .from(projectMilestones)
    .where(and(eq(projectMilestones.projectId, projectId), eq(projectMilestones.carpenterId, auth.userId)))
    .limit(1);
  if (!m) return json({ error: 'Obra não encontrada.' }, 404);

  await db.update(projects).set({ plannedStartDate: startDate || null, plannedEndDate: endDate || null, updatedAt: sql`now()` }).where(eq(projects.id, projectId));
  return json({ ok: true });
}
