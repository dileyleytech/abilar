import { createProjectSchema } from '@abilar/shared';
import { projects } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Cliente cria um pedido (RASCUNHO) com nome + local (cidade/CEP). Os móveis e a
// publicação vêm depois — mesmo fluxo da web. JSON: { title, city?, cep?, lat?, lng? }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = createProjectSchema.safeParse({ title: b.title, sourceType: b.sourceType, city: b.city, cep: b.cep, lat: b.lat, lng: b.lng });
  if (!p.success) return json({ error: p.error.issues[0]?.message ?? 'Dados do pedido inválidos.' }, 400);

  const db = getDb();
  const [created] = await db
    .insert(projects)
    .values({
      clientId: auth.userId,
      title: p.data.title,
      sourceType: p.data.sourceType,
      city: p.data.city ?? null,
      cep: p.data.cep ?? null,
      lat: p.data.lat != null ? String(p.data.lat) : null,
      lng: p.data.lng != null ? String(p.data.lng) : null,
      status: 'DRAFT',
    })
    .returning({ id: projects.id });
  if (!created) return json({ error: 'Não foi possível criar o pedido.' }, 502);
  return json({ ok: true, projectId: created.id });
}
