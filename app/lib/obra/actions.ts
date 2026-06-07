'use server';

import { revalidatePath } from 'next/cache';
import { projectMilestones, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { notify } from '@/lib/notifications/notify';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Marceneiro avança a etapa: PENDING → IN_PROGRESS → DONE (aguardando o cliente). */
export async function advanceMilestone(milestoneId: string): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
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
  if (!m || m.carpenterId !== profile.id) return { ok: false, error: 'Etapa não encontrada.' };

  if (m.status === 'PENDING') {
    await db.update(projectMilestones).set({ status: 'IN_PROGRESS' }).where(eq(projectMilestones.id, milestoneId));
    await notify(m.clientId, { title: 'Sua obra avançou 🔨', body: `O marceneiro iniciou: ${m.label}.`, link: `/pedidos/${m.projectId}` });
  } else if (m.status === 'IN_PROGRESS') {
    await db.update(projectMilestones).set({ status: 'DONE', doneAt: sql`now()` }).where(eq(projectMilestones.id, milestoneId));
    await notify(m.clientId, { title: 'Etapa concluída — aprove ✅', body: `${m.label} foi concluída. Confira e aprove para liberar.`, link: `/pedidos/${m.projectId}` });
  } else {
    return { ok: false, error: 'Esta etapa não pode avançar.' };
  }
  revalidatePath(`/marceneiro/pedidos/${m.projectId}`);
  revalidatePath(`/pedidos/${m.projectId}`);
  return { ok: true };
}

/** Cliente aprova a etapa concluída: DONE → APPROVED (libera o marco). Quando todas
 *  aprovadas, o projeto vira EXECUTED. */
export async function approveMilestone(milestoneId: string): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
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
  if (!m || m.clientId !== profile.id) return { ok: false, error: 'Etapa não encontrada.' };
  if (m.status !== 'DONE') return { ok: false, error: 'Só dá para aprovar uma etapa concluída.' };

  await db.update(projectMilestones).set({ status: 'APPROVED', approvedAt: sql`now()` }).where(eq(projectMilestones.id, milestoneId));
  await notify(m.carpenterId, { title: 'Etapa aprovada ✓', body: `O cliente aprovou: ${m.label}.`, link: `/marceneiro/pedidos/${m.projectId}` });

  // Se todas as etapas foram aprovadas, a obra está concluída.
  const [pending] = await db
    .select({ id: projectMilestones.id })
    .from(projectMilestones)
    .where(and(eq(projectMilestones.projectId, m.projectId), sql`${projectMilestones.status} <> 'APPROVED'`))
    .limit(1);
  if (!pending) {
    await db.update(projects).set({ status: 'EXECUTED', updatedAt: sql`now()` }).where(eq(projects.id, m.projectId));
    await notify(m.carpenterId, { title: 'Obra concluída! 🎉', body: 'Todas as etapas foram aprovadas pelo cliente.', link: `/marceneiro/pedidos/${m.projectId}` });
  }
  revalidatePath(`/marceneiro/pedidos/${m.projectId}`);
  revalidatePath(`/pedidos/${m.projectId}`);
  return { ok: true };
}
