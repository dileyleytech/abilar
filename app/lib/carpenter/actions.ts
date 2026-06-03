'use server';

import { revalidatePath } from 'next/cache';
import { carpenterOnboardingSchema } from '@abilar/shared';
import { carpenterProfiles, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

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
        categories: d.categories,
        updatedAt: sql`now()`,
      },
    });

  revalidatePath('/marceneiro');
  return { ok: true };
}
