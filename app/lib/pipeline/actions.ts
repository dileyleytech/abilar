'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { carpenterJobs, carpenterProfiles, projects, projectMilestones, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function uid(): Promise<string | null> {
  const p = await getSessionProfile();
  return p && p.role === 'CARPENTER' ? p.id : null;
}

const dateOpt = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().or(z.literal('').transform(() => undefined));
const jobSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título').max(120),
  clientName: z.string().trim().max(120).optional(),
  startDate: dateOpt,
  endDate: dateOpt,
  note: z.string().trim().max(600).optional(),
});

export async function saveJob(input: unknown, id?: string): Promise<ActionResult> {
  const carpenterId = await uid();
  if (!carpenterId) return { ok: false, error: 'Apenas marceneiros.' };
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;
  const values = { title: d.title, clientName: d.clientName ?? null, startDate: d.startDate ?? null, endDate: d.endDate ?? null, note: d.note ?? null };
  const db = getDb();
  if (id) await db.update(carpenterJobs).set({ ...values, updatedAt: sql`now()` }).where(and(eq(carpenterJobs.id, id), eq(carpenterJobs.carpenterId, carpenterId)));
  else await db.insert(carpenterJobs).values({ carpenterId, ...values });
  revalidatePath('/marceneiro/agenda');
  return { ok: true };
}

export async function setJobDates(id: string, input: unknown): Promise<ActionResult> {
  const carpenterId = await uid();
  if (!carpenterId) return { ok: false, error: 'Apenas marceneiros.' };
  const parsed = z.object({ startDate: dateOpt, endDate: dateOpt }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datas inválidas.' };
  await getDb().update(carpenterJobs).set({ startDate: parsed.data.startDate ?? null, endDate: parsed.data.endDate ?? null, updatedAt: sql`now()` }).where(and(eq(carpenterJobs.id, id), eq(carpenterJobs.carpenterId, carpenterId)));
  revalidatePath('/marceneiro/agenda');
  return { ok: true };
}

export async function setJobStatus(id: string, status: 'ACTIVE' | 'DONE'): Promise<ActionResult> {
  const carpenterId = await uid();
  if (!carpenterId) return { ok: false, error: 'Apenas marceneiros.' };
  await getDb().update(carpenterJobs).set({ status, updatedAt: sql`now()` }).where(and(eq(carpenterJobs.id, id), eq(carpenterJobs.carpenterId, carpenterId)));
  revalidatePath('/marceneiro/agenda');
  return { ok: true };
}

export async function deleteJob(id: string): Promise<ActionResult> {
  const carpenterId = await uid();
  if (!carpenterId) return { ok: false, error: 'Apenas marceneiros.' };
  await getDb().delete(carpenterJobs).where(and(eq(carpenterJobs.id, id), eq(carpenterJobs.carpenterId, carpenterId)));
  revalidatePath('/marceneiro/agenda');
  return { ok: true };
}

const datesSchema = z.object({ startDate: dateOpt, endDate: dateOpt });

/** Marceneiro define os prazos (previsão) da obra da plataforma. */
export async function setProjectDates(projectId: string, input: unknown): Promise<ActionResult> {
  const carpenterId = await uid();
  if (!carpenterId) return { ok: false, error: 'Apenas marceneiros.' };
  const parsed = datesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datas inválidas.' };

  const db = getDb();
  // Autorização: é o marceneiro contratado desta obra (tem marcos nela).
  const [m] = await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), eq(projectMilestones.carpenterId, carpenterId))).limit(1);
  if (!m) return { ok: false, error: 'Obra não encontrada.' };

  await db.update(projects).set({ plannedStartDate: parsed.data.startDate ?? null, plannedEndDate: parsed.data.endDate ?? null, updatedAt: sql`now()` }).where(eq(projects.id, projectId));
  revalidatePath('/marceneiro/agenda');
  revalidatePath(`/marceneiro/pedidos/${projectId}`);
  return { ok: true };
}

export async function setMaxParallel(value: number): Promise<ActionResult> {
  const carpenterId = await uid();
  if (!carpenterId) return { ok: false, error: 'Apenas marceneiros.' };
  const n = Math.round(value);
  if (!Number.isFinite(n) || n < 1 || n > 50) return { ok: false, error: 'Informe entre 1 e 50.' };
  await getDb().update(carpenterProfiles).set({ maxParallelProjects: n, updatedAt: sql`now()` }).where(eq(carpenterProfiles.userId, carpenterId));
  revalidatePath('/marceneiro/agenda');
  return { ok: true };
}
