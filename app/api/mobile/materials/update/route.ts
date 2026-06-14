import { materialInputSchema } from '@abilar/shared';
import { carpenterMaterials, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Edita um item do catálogo (dono). JSON: { id, ...materialInputSchema }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  const body = (await req.json().catch(() => ({}))) as { id?: string } & Record<string, unknown>;
  if (!body.id) return json({ error: 'Item inválido.' }, 400);
  const parsed = materialInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, 400);

  await getDb()
    .update(carpenterMaterials)
    .set({
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      unitCostCents: parsed.data.unitCostCents,
      sku: parsed.data.sku ?? null,
      supplier: parsed.data.supplier ?? null,
      updatedAt: sql`now()`,
    })
    .where(and(eq(carpenterMaterials.id, body.id), eq(carpenterMaterials.carpenterId, auth.userId)));
  return json({ ok: true });
}
