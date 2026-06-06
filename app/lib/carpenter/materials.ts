import 'server-only';
import { carpenterMaterials, and, asc, eq } from '@abilar/db';
import type { CarpenterMaterial } from '@abilar/db';
import { getDb } from '@/lib/db';

/** Catálogo de custo do marceneiro (ativos primeiro, por categoria/nome). */
export async function listMaterials(
  carpenterId: string,
  opts?: { activeOnly?: boolean },
): Promise<CarpenterMaterial[]> {
  const db = getDb();
  const where = opts?.activeOnly
    ? and(eq(carpenterMaterials.carpenterId, carpenterId), eq(carpenterMaterials.active, true))
    : eq(carpenterMaterials.carpenterId, carpenterId);
  return db
    .select()
    .from(carpenterMaterials)
    .where(where)
    .orderBy(asc(carpenterMaterials.category), asc(carpenterMaterials.name));
}
