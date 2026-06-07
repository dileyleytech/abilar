import { carpenterMaterials, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Ativa/inativa um item do catálogo (dono). JSON: { id, active }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  const { id, active } = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean };
  if (!id || typeof active !== 'boolean') return json({ error: 'Dados inválidos.' }, 400);

  await getDb()
    .update(carpenterMaterials)
    .set({ active, updatedAt: sql`now()` })
    .where(and(eq(carpenterMaterials.id, id), eq(carpenterMaterials.carpenterId, auth.userId)));
  return json({ ok: true });
}
