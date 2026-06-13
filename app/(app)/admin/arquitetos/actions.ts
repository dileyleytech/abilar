'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { architectProfiles, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const p = await getSessionProfile();
  return p?.role === 'ADMIN';
}

/** Gera um código de indicação único e legível a partir do nome. */
async function genReferralCode(name: string): Promise<string> {
  const base = (name.normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zA-Z]+/)?.[0] ?? 'ABI').toUpperCase().slice(0, 6);
  const db = getDb();
  for (let i = 0; i < 8; i++) {
    const code = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const [exists] = await db.select({ c: architectProfiles.referralCode }).from(architectProfiles).where(eq(architectProfiles.referralCode, code)).limit(1);
    if (!exists) return code;
  }
  // Fallback improvável: timestamp-ish aleatório.
  return `${base}${Math.floor(Math.random() * 1e6)}`;
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
  const referralCode = await genReferralCode(d.name);
  await getDb()
    .insert(architectProfiles)
    .values({ userId: data.user.id, name: d.name, cau: d.cau ?? null, commissionPercent: String(d.commissionPercent), referralCode, active: true })
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

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const LOGO_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

/** Admin envia/atualiza a logo do arquiteto (sobrescreve a anterior). */
export async function setArchitectLogo(userId: string, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'Apenas admin.' };
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Selecione uma imagem.' };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: 'Imagem muito grande (máx. 2 MB).' };
  const ext = LOGO_EXT[file.type];
  if (!ext) return { ok: false, error: 'Use PNG, JPG, WEBP ou SVG.' };

  const path = `architects/${userId}/logo.${ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (error) return { ok: false, error: 'Falha no upload da logo.' };

  await getDb().update(architectProfiles).set({ logoPath: path }).where(eq(architectProfiles.userId, userId));
  revalidatePath('/admin/arquitetos');
  revalidatePath('/arquitetos');
  return { ok: true };
}

/** Remove a logo do arquiteto. */
export async function removeArchitectLogo(userId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: 'Apenas admin.' };
  await getDb().update(architectProfiles).set({ logoPath: null }).where(eq(architectProfiles.userId, userId));
  revalidatePath('/admin/arquitetos');
  revalidatePath('/arquitetos');
  return { ok: true };
}
