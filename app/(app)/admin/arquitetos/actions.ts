'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { architectProfiles, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const p = await getSessionProfile();
  return p?.role === 'ADMIN';
}

const createSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().email('E-mail inválido'),
  cau: z.string().trim().max(40).optional(),
  commissionPercent: z.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
});

/** Admin cadastra um arquiteto parceiro (cria o usuário ARCHITECT + perfil). */
export async function createArchitect(input: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'Apenas admin.' };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: d.email,
    email_confirm: true,
    user_metadata: { name: d.name, role: 'ARCHITECT' },
  });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Não foi possível criar o usuário.' };

  // O trigger handle_new_user já criou o profile com papel ARCHITECT.
  await getDb()
    .insert(architectProfiles)
    .values({ userId: data.user.id, name: d.name, cau: d.cau ?? null, commissionPercent: String(d.commissionPercent), active: true })
    .onConflictDoUpdate({ target: architectProfiles.userId, set: { name: d.name, cau: d.cau ?? null, commissionPercent: String(d.commissionPercent) } });
  revalidatePath('/admin/arquitetos');
  return { ok: true };
}

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  cau: z.string().trim().max(40).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

/** Admin edita o arquiteto (comissão, CAU, nome, ativo). */
export async function updateArchitect(userId: string, input: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'Apenas admin.' };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
  const d = parsed.data;
  await getDb()
    .update(architectProfiles)
    .set({
      ...(d.name != null ? { name: d.name } : {}),
      ...(d.cau != null ? { cau: d.cau } : {}),
      ...(d.commissionPercent != null ? { commissionPercent: String(d.commissionPercent) } : {}),
      ...(d.active != null ? { active: d.active } : {}),
    })
    .where(eq(architectProfiles.userId, userId));
  revalidatePath('/admin/arquitetos');
  return { ok: true };
}
