'use server';

import { revalidatePath } from 'next/cache';
import { reportStatusSchema } from '@abilar/shared';
import { reports, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Admin tria uma denúncia (REVIEWED/DISMISSED/ACTIONED). */
export async function setReportStatus(reportId: string, status: unknown): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'ADMIN') return { ok: false, error: 'Apenas admin.' };
  const parsed = reportStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: 'Status inválido.' };

  const db = getDb();
  await db.update(reports).set({ status: parsed.data }).where(eq(reports.id, reportId));
  revalidatePath('/admin/denuncias');
  return { ok: true };
}
