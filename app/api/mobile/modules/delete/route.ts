import { projects, modules, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Remove um móvel do pedido (dono). JSON: { moduleId }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { moduleId } = (await req.json().catch(() => ({}))) as { moduleId?: string };
  if (!moduleId) return json({ error: 'Móvel inválido.' }, 400);

  const db = getDb();
  const [row] = await db
    .select({ clientId: projects.clientId })
    .from(modules)
    .innerJoin(projects, eq(projects.id, modules.projectId))
    .where(eq(modules.id, moduleId))
    .limit(1);
  if (!row || row.clientId !== auth.userId) return json({ error: 'Móvel não encontrado.' }, 404);

  await db.delete(modules).where(eq(modules.id, moduleId)); // fotos caem por cascade
  return json({ ok: true });
}
