'use server';

import { revalidatePath } from 'next/cache';
import { carpenterOnboardingSchema, materialInputSchema, CATEGORIES, type Category } from '@abilar/shared';
import { carpenterProfiles, carpenterMaterials, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Item do catálogo serializável (para o cliente atualizar a lista na hora). */
export type MaterialDTO = {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitCostCents: number;
  sku: string | null;
  supplier: string | null;
  active: boolean;
  updatedAt: string;
};
export type CreateMaterialResult = { ok: true; material: MaterialDTO } | { ok: false; error: string };

/** Cria um item no catálogo de custo do marceneiro (§7.6). Custo em centavos. */
export async function createMaterial(input: unknown): Promise<CreateMaterialResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  if (profile.role !== 'CARPENTER') return { ok: false, error: 'Apenas marceneiros.' };
  const parsed = materialInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const db = getDb();
  const [row] = await db
    .insert(carpenterMaterials)
    .values({
      carpenterId: profile.id,
      name: d.name,
      category: d.category,
      unit: d.unit,
      unitCostCents: d.unitCostCents,
      sku: d.sku ?? null,
      supplier: d.supplier ?? null,
    })
    .returning();
  revalidatePath('/marceneiro/catalogo');
  if (!row) return { ok: false, error: 'Não foi possível salvar.' };
  return {
    ok: true,
    material: {
      id: row.id,
      name: row.name,
      category: row.category,
      unit: row.unit,
      unitCostCents: row.unitCostCents,
      sku: row.sku,
      supplier: row.supplier,
      active: row.active,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

/** Atualiza um item do catálogo (só o dono). */
export async function updateMaterial(id: string, input: unknown): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  if (profile.role !== 'CARPENTER') return { ok: false, error: 'Apenas marceneiros.' };
  const parsed = materialInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const db = getDb();
  await db
    .update(carpenterMaterials)
    .set({
      name: d.name,
      category: d.category,
      unit: d.unit,
      unitCostCents: d.unitCostCents,
      sku: d.sku ?? null,
      supplier: d.supplier ?? null,
      updatedAt: sql`now()`,
    })
    .where(and(eq(carpenterMaterials.id, id), eq(carpenterMaterials.carpenterId, profile.id)));
  revalidatePath('/marceneiro/catalogo');
  return { ok: true };
}

/** Ativa/desativa um item (não some do histórico de orçamentos). */
export async function setMaterialActive(id: string, active: boolean): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'CARPENTER') return { ok: false, error: 'Sem permissão.' };
  const db = getDb();
  await db
    .update(carpenterMaterials)
    .set({ active, updatedAt: sql`now()` })
    .where(and(eq(carpenterMaterials.id, id), eq(carpenterMaterials.carpenterId, profile.id)));
  revalidatePath('/marceneiro/catalogo');
  return { ok: true };
}

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
