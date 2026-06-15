import { projects, projectPhotos, conversations, and, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// GET ?projectId= → paths das fotos atuais do pedido (não-PDF).
// Autorização (igual à signed-urls): dono OU pedido aberto OU marceneiro engajado.
// Necessário porque o RLS de project_photos só deixa o cliente dono ler direto.
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const projectId = new URL(req.url).searchParams.get('projectId') ?? '';
  if (!projectId) return json({ paths: [] });

  const db = getDb();
  const [p] = await db.select({ clientId: projects.clientId, status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!p) return json({ error: 'Sem acesso.' }, 403);

  let allowed = p.clientId === auth.userId || p.status === 'OPEN_FOR_QUOTES';
  if (!allowed) {
    const [c] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.projectId, projectId), eq(conversations.carpenterId, auth.userId)))
      .limit(1);
    allowed = !!c;
  }
  if (!allowed) return json({ error: 'Sem acesso.' }, 403);

  const rows = await db
    .select({ path: projectPhotos.path, kind: projectPhotos.kind })
    .from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.isCurrent, true)));
  return json({ paths: rows.filter((r) => r.kind !== 'ARCHITECT_PDF').map((r) => r.path) });
}
