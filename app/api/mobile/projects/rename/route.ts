import { z } from 'zod';
import { projects, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

const titleSchema = z.string().trim().min(2, 'Dê um nome ao pedido').max(120);

// Cliente renomeia o próprio pedido. JSON: { projectId, title }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { projectId, title } = (await req.json().catch(() => ({}))) as { projectId?: string; title?: string };
  if (!projectId) return json({ error: 'Pedido inválido.' }, 400);
  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Nome inválido.' }, 400);

  const db = getDb();
  const [own] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, auth.userId)))
    .limit(1);
  if (!own) return json({ error: 'Pedido não encontrado.' }, 404);

  await db.update(projects).set({ title: parsed.data, updatedAt: sql`now()` }).where(eq(projects.id, projectId));
  return json({ ok: true });
}
