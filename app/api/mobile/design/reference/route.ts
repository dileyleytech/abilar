import { projectPhotos } from '@abilar/db';
import { resolvePhotoModerator, bytesToBase64 } from '@abilar/ai-vision';
import { getDb } from '@/lib/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { ownsProject } from '@/lib/design/core';
import { referenceUrls } from '@/lib/design/preview';

// Multipart { projectId, photo } → guarda uma imagem de REFERÊNCIA de estilo do
// cliente ("quero parecido com isso"). Sem moduleId: a foto COM módulo é a base a
// editar, esta é inspiração. Dono do pedido.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: 'Envio inválido.' }, 400);
  const projectId = String(form.get('projectId') ?? '');
  if (!projectId || !(await ownsProject(projectId, auth.userId))) return json({ error: 'Pedido não encontrado.' }, 404);

  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) return json({ error: 'Envie uma imagem.' }, 400);
  if (!file.type.startsWith('image/')) return json({ error: 'Anexo deve ser uma imagem.' }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ error: 'A imagem deve ter no máx 10 MB.' }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Moderação com propósito REFERENCE: foto de catálogo/print vale, não precisa ser
  // um cômodo. Fail-open (erro de API não bloqueia).
  const mod = await resolvePhotoModerator({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODERATION_MODEL: process.env.GEMINI_MODERATION_MODEL })
    .check(bytesToBase64(bytes), file.type || 'image/jpeg', 'REFERENCE');
  if (!mod.relevant) {
    return json({ error: mod.reason ?? 'Essa imagem não parece um móvel. Envie a foto do móvel que serve de exemplo.' }, 400);
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${projectId}/referencias/${Date.now()}.${ext}`;
  const { error } = await createSupabaseAdminClient().storage
    .from(PROJECT_PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: true });
  if (error) return json({ error: 'Não consegui guardar a imagem. Tente de novo.' }, 502);

  await getDb().insert(projectPhotos).values({ projectId, kind: 'REFERENCE', path });
  return json({ ok: true, references: await referenceUrls(projectId) });
}
