'use server';

import { revalidatePath } from 'next/cache';
import { projectMilestones, milestoneEvidences, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { notify } from '@/lib/notifications/notify';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_PHOTOS = 8;
type Mstone = { id: string; projectId: string; clientId: string; carpenterId: string; label: string; status: string };

const loadMilestone = async (id: string): Promise<Mstone | null> => {
  const db = getDb();
  const [m] = await db
    .select({
      id: projectMilestones.id,
      projectId: projectMilestones.projectId,
      clientId: projectMilestones.clientId,
      carpenterId: projectMilestones.carpenterId,
      label: projectMilestones.label,
      status: projectMilestones.status,
    })
    .from(projectMilestones)
    .where(eq(projectMilestones.id, id))
    .limit(1);
  return m ?? null;
};

/** Sobe as fotos (service-role) e cria um registro de evidência (comentário + fotos). */
async function createEvidence(m: Mstone, authorId: string, formData: FormData): Promise<{ ok: true; photos: number } | { ok: false; error: string }> {
  const comment = String(formData.get('comment') ?? '').trim() || null;
  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return { ok: false, error: `Máximo de ${MAX_PHOTOS} fotos por envio.` };

  const supabase = createSupabaseAdminClient();
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    if (f.size > 10 * 1024 * 1024) return { ok: false, error: 'Cada foto deve ter no máx 10 MB.' };
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `evidence/${m.id}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from(PROJECT_PHOTOS_BUCKET)
      .upload(path, new Uint8Array(await f.arrayBuffer()), { contentType: f.type || 'image/jpeg', upsert: true });
    if (error) return { ok: false, error: 'Não foi possível enviar a(s) foto(s).' };
    paths.push(path);
  }
  const db = getDb();
  await db.insert(milestoneEvidences).values({
    milestoneId: m.id,
    projectId: m.projectId,
    clientId: m.clientId,
    carpenterId: m.carpenterId,
    authorId,
    comment,
    photos: paths,
  });
  return { ok: true, photos: paths.length };
}

/** Marceneiro adiciona evidência (várias fotos + comentário) numa etapa, sem mudar
 *  o status — registro de progresso visível para o cliente (§6.4). */
export async function addMilestoneEvidence(formData: FormData): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const m = await loadMilestone(String(formData.get('milestoneId') ?? ''));
  if (!m || m.carpenterId !== profile.id) return { ok: false, error: 'Etapa não encontrada.' };

  const hasComment = String(formData.get('comment') ?? '').trim().length > 0;
  const hasPhoto = formData.getAll('photos').some((f) => f instanceof File && f.size > 0);
  if (!hasComment && !hasPhoto) return { ok: false, error: 'Adicione uma foto ou um comentário.' };

  const r = await createEvidence(m, profile.id, formData);
  if (!r.ok) return r;
  await notify(m.clientId, { title: 'Atualização da obra 📸', body: `Novidades em: ${m.label}.`, link: `/pedidos/${m.projectId}` });
  revalidatePath(`/marceneiro/pedidos/${m.projectId}`);
  revalidatePath(`/pedidos/${m.projectId}`);
  return { ok: true };
}

/** Marceneiro conclui a etapa (IN_PROGRESS → DONE), opcionalmente com evidência. */
export async function concludeMilestone(formData: FormData): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const m = await loadMilestone(String(formData.get('milestoneId') ?? ''));
  if (!m || m.carpenterId !== profile.id) return { ok: false, error: 'Etapa não encontrada.' };
  if (m.status !== 'IN_PROGRESS') return { ok: false, error: 'Esta etapa não pode ser concluída agora.' };

  const hasComment = String(formData.get('comment') ?? '').trim().length > 0;
  const hasPhoto = formData.getAll('photos').some((f) => f instanceof File && f.size > 0);
  if (hasComment || hasPhoto) {
    const r = await createEvidence(m, profile.id, formData);
    if (!r.ok) return r;
  }

  const db = getDb();
  await db.update(projectMilestones).set({ status: 'DONE', doneAt: sql`now()` }).where(eq(projectMilestones.id, m.id));
  await notify(m.clientId, {
    title: 'Etapa concluída — aprove ✅',
    body: `${m.label} foi concluída. Confira as fotos e aprove para liberar.`,
    link: `/pedidos/${m.projectId}`,
  });
  revalidatePath(`/marceneiro/pedidos/${m.projectId}`);
  revalidatePath(`/pedidos/${m.projectId}`);
  return { ok: true };
}

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
