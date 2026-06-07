import { projects, modules, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Publica o pedido (DRAFT → OPEN_FOR_QUOTES) para os marceneiros orçarem.
// Exige ao menos um móvel. JSON: { projectId }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { projectId } = (await req.json().catch(() => ({}))) as { projectId?: string };
  if (!projectId) return json({ error: 'Pedido inválido.' }, 400);

  const db = getDb();
  const [proj] = await db
    .select({ status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, auth.userId)))
    .limit(1);
  if (!proj) return json({ error: 'Pedido não encontrado.' }, 404);
  if (proj.status !== 'DRAFT') return json({ error: 'Este pedido já foi publicado.' }, 409);

  const [hasModule] = await db.select({ id: modules.id }).from(modules).where(eq(modules.projectId, projectId)).limit(1);
  if (!hasModule) return json({ error: 'Adicione ao menos um móvel antes de publicar.' }, 400);

  await db.update(projects).set({ status: 'OPEN_FOR_QUOTES', updatedAt: sql`now()` }).where(eq(projects.id, projectId));
  return json({ ok: true });
}
