import { createProjectSchema, moduleInputSchema, categorySchema } from '@abilar/shared';
import { projects, modules } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Cliente cria um pedido já aberto para orçamentos (OPEN_FOR_QUOTES), com o
// primeiro móvel (categoria + medidas em cm). JSON: title, city, category, widthCm, heightCm, depthCm.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = createProjectSchema.safeParse({ title: b.title, city: b.city });
  if (!p.success) return json({ error: p.error.issues[0]?.message ?? 'Dados do pedido inválidos.' }, 400);

  const cat = categorySchema.safeParse(b.category);
  if (!cat.success) return json({ error: 'Escolha o tipo do móvel.' }, 400);
  const m = moduleInputSchema.safeParse({
    type: cat.data,
    widthMm: b.widthCm,
    heightMm: b.heightCm,
    depthMm: b.depthCm,
  });
  if (!m.success) return json({ error: 'Confira as medidas (em cm, maior que zero).' }, 400);

  const db = getDb();
  const [created] = await db
    .insert(projects)
    .values({
      clientId: auth.userId,
      title: p.data.title,
      city: p.data.city ?? null,
      status: 'OPEN_FOR_QUOTES',
    })
    .returning({ id: projects.id });
  if (!created) return json({ error: 'Não foi possível criar o pedido.' }, 502);

  await db.insert(modules).values({
    projectId: created.id,
    type: m.data.type,
    widthMm: m.data.widthMm,
    heightMm: m.data.heightMm,
    depthMm: m.data.depthMm,
  });
  return json({ ok: true, projectId: created.id });
}
