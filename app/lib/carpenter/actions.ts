'use server';

import { revalidatePath } from 'next/cache';
import { carpenterOnboardingSchema, CATEGORIES, type Category } from '@abilar/shared';
import { carpenterProfiles, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Atualiza só a ÁREA DE ATENDIMENTO (raio + categorias) — edição rápida no feed.
 *  O feed é recalculado com esses valores (matching cidade+categoria+raio). */
export async function updateCarpenterServiceArea(input: {
  serviceRadiusKm: number;
  categories: string[];
}): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  if (profile.role !== 'CARPENTER') return { ok: false, error: 'Apenas marceneiros.' };

  const radius = Math.round(input.serviceRadiusKm);
  if (!Number.isFinite(radius) || radius < 1 || radius > 200) {
    return { ok: false, error: 'Raio deve ficar entre 1 e 200 km.' };
  }
  const valid = (Array.isArray(input.categories) ? input.categories : []).filter((c): c is Category =>
    (CATEGORIES as readonly string[]).includes(c),
  );
  if (valid.length === 0) return { ok: false, error: 'Selecione ao menos uma categoria.' };
  const categories = [...new Set(valid)];

  const db = getDb();
  await db
    .update(carpenterProfiles)
    .set({ serviceRadiusKm: radius, categories, updatedAt: sql`now()` })
    .where(eq(carpenterProfiles.userId, profile.id));

  revalidatePath('/marceneiro');
  return { ok: true };
}

/** Cria/atualiza o CarpenterProfile do marceneiro logado (onboarding).
 *  Autorização: apenas o próprio usuário CARPENTER (RLS + checagem aqui). */
export async function saveCarpenterProfile(input: unknown): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  if (profile.role !== 'CARPENTER') return { ok: false, error: 'Apenas marceneiros.' };

  const parsed = carpenterOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }
  const d = parsed.data;

  const db = getDb();
  await db
    .insert(carpenterProfiles)
    .values({
      userId: profile.id,
      personType: d.personType,
      name: d.name,
      companyName: d.companyName ?? null,
      cnpjOrCpf: d.cnpjOrCpf,
      bio: d.bio ?? null,
      serviceCity: d.serviceCity,
      serviceCep: d.serviceCep,
      serviceRadiusKm: d.serviceRadiusKm,
      serviceLat: d.serviceLat != null ? String(d.serviceLat) : null,
      serviceLng: d.serviceLng != null ? String(d.serviceLng) : null,
      categories: d.categories,
    })
    .onConflictDoUpdate({
      target: carpenterProfiles.userId,
      set: {
        personType: d.personType,
        name: d.name,
        companyName: d.companyName ?? null,
        cnpjOrCpf: d.cnpjOrCpf,
        bio: d.bio ?? null,
        serviceCity: d.serviceCity,
        serviceCep: d.serviceCep,
        serviceRadiusKm: d.serviceRadiusKm,
        serviceLat: d.serviceLat != null ? String(d.serviceLat) : null,
        serviceLng: d.serviceLng != null ? String(d.serviceLng) : null,
        categories: d.categories,
        updatedAt: sql`now()`,
      },
    });

  revalidatePath('/marceneiro');
  return { ok: true };
}
