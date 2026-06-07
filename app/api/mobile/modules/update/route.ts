import { moduleInputSchema, categorySchema } from '@abilar/shared';
import { projects, modules, projectPhotos, and, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Edita um móvel (dono). Multipart: moduleId, ambiente?, category, label?, workType?,
// widthCm, heightCm, depthCm, photo? (substitui a foto atual).
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: 'Envio inválido.' }, 400);
  const moduleId = String(form.get('moduleId') ?? '');
  if (!moduleId) return json({ error: 'Móvel inválido.' }, 400);

  const db = getDb();
  const [row] = await db
    .select({ projectId: modules.projectId, clientId: projects.clientId })
    .from(modules)
    .innerJoin(projects, eq(projects.id, modules.projectId))
    .where(eq(modules.id, moduleId))
    .limit(1);
  if (!row || row.clientId !== auth.userId) return json({ error: 'Móvel não encontrado.' }, 404);

  const cat = categorySchema.safeParse(form.get('category'));
  if (!cat.success) return json({ error: 'Escolha o tipo do móvel.' }, 400);
  const label = String(form.get('label') ?? '').trim();
  if (cat.data === 'OUTRO' && !label) return json({ error: 'Diga qual é o móvel.' }, 400);

  const m = moduleInputSchema.safeParse({
    ambiente: form.get('ambiente') || undefined,
    type: cat.data,
    label: label || undefined,
    workType: form.get('workType') || undefined,
    widthMm: Number(form.get('widthCm')),
    heightMm: Number(form.get('heightCm')),
    depthMm: Number(form.get('depthCm')),
  });
  if (!m.success) return json({ error: 'Confira as medidas (em cm, maior que zero).' }, 400);

  await db
    .update(modules)
    .set({
      ambiente: m.data.ambiente ?? null,
      type: m.data.type,
      label: m.data.label ?? null,
      workType: m.data.workType ?? null,
      widthMm: m.data.widthMm,
      heightMm: m.data.heightMm,
      depthMm: m.data.depthMm,
    })
    .where(eq(modules.id, moduleId));

  // Foto nova substitui a anterior (1 por móvel).
  const file = form.get('photo');
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) return json({ error: 'Anexo deve ser uma imagem.' }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: 'A foto deve ter no máx 10 MB.' }, 400);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${row.projectId}/${moduleId}/${Date.now()}.${ext}`;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(PROJECT_PHOTOS_BUCKET)
      .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type || 'image/jpeg', upsert: true });
    if (!error) {
      await db.delete(projectPhotos).where(and(eq(projectPhotos.projectId, row.projectId), eq(projectPhotos.moduleId, moduleId)));
      await db.insert(projectPhotos).values({ projectId: row.projectId, moduleId, kind: 'REFERENCE', path });
    }
  }

  return json({ ok: true });
}
