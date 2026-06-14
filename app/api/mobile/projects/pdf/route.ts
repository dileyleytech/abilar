import { projects, projectPhotos, and, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Anexa o PDF do projeto de arquiteto ao pedido (dono). Multipart: projectId, file.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: 'Envio inválido.' }, 400);
  const projectId = String(form.get('projectId') ?? '');
  const file = form.get('file');
  if (!projectId || !(file instanceof File) || file.size === 0) return json({ error: 'Arquivo ausente.' }, 400);
  if (file.type !== 'application/pdf') return json({ error: 'Envie um PDF.' }, 400);
  if (file.size > 20 * 1024 * 1024) return json({ error: 'O PDF deve ter no máx 20 MB.' }, 400);

  const db = getDb();
  const [own] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, auth.userId)))
    .limit(1);
  if (!own) return json({ error: 'Pedido não encontrado.' }, 404);

  const safe = (file.name || 'projeto.pdf').replace(/[^\w.-]/g, '_');
  const path = `${projectId}/${Date.now()}-${safe}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: 'application/pdf', upsert: true });
  if (error) return json({ error: 'Não foi possível enviar o PDF.' }, 502);
  await db.insert(projectPhotos).values({ projectId, kind: 'ARCHITECT_PDF', path });
  return json({ ok: true });
}
