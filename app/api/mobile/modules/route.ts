import { moduleInputSchema, categorySchema } from '@abilar/shared';
import { projects, modules, and, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Cliente adiciona um móvel ao pedido (dono). Tipo = categoria; quando OUTRO, o
// `label` diz qual é. Medidas em cm → mm (schema). JSON:
// { projectId, ambiente?, category, label?, workType?, widthCm, heightCm, depthCm }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = String(b.projectId ?? '');
  if (!projectId) return json({ error: 'Pedido inválido.' }, 400);

  const db = getDb();
  const [own] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, auth.userId)))
    .limit(1);
  if (!own) return json({ error: 'Pedido não encontrado.' }, 404);

  const cat = categorySchema.safeParse(b.category);
  if (!cat.success) return json({ error: 'Escolha o tipo do móvel.' }, 400);
  const label = String(b.label ?? '').trim();
  if (cat.data === 'OUTRO' && !label) return json({ error: 'Diga qual é o móvel.' }, 400);

  const m = moduleInputSchema.safeParse({
    ambiente: b.ambiente,
    type: cat.data,
    label: label || undefined,
    workType: b.workType,
    widthMm: b.widthCm,
    heightMm: b.heightCm,
    depthMm: b.depthCm,
  });
  if (!m.success) return json({ error: 'Confira as medidas (em cm, maior que zero).' }, 400);

  const [created] = await db
    .insert(modules)
    .values({
      projectId,
      ambiente: m.data.ambiente ?? null,
      type: m.data.type,
      label: m.data.label ?? null,
      workType: m.data.workType ?? null,
      widthMm: m.data.widthMm,
      heightMm: m.data.heightMm,
      depthMm: m.data.depthMm,
    })
    .returning({ id: modules.id });
  return json({ ok: true, moduleId: created?.id });
}
