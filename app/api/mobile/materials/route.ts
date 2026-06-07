import { materialInputSchema } from '@abilar/shared';
import { carpenterMaterials } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Marceneiro cria um item do catálogo de custo. JSON: materialInputSchema.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  const parsed = materialInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, 400);

  const [created] = await getDb()
    .insert(carpenterMaterials)
    .values({
      carpenterId: auth.userId,
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      unitCostCents: parsed.data.unitCostCents,
      sku: parsed.data.sku ?? null,
      supplier: parsed.data.supplier ?? null,
    })
    .returning({ id: carpenterMaterials.id });
  return json({ ok: true, id: created?.id });
}
