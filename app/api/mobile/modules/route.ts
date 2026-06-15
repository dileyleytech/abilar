import { moduleInputSchema, categorySchema } from '@abilar/shared';
import { projects, modules, projectPhotos, and, eq } from '@abilar/db';
import { resolvePhotoModerator, bytesToBase64 } from '@abilar/ai-vision';
import { getDb } from '@/lib/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Cliente adiciona um móvel ao pedido (dono). Tipo = categoria; quando OUTRO, o
// `label` diz qual é. Medidas cm → mm. Foto opcional (galeria ou câmera).
// Multipart: projectId, ambiente?, category, label?, workType?, widthCm, heightCm, depthCm, photo?
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: 'Envio inválido.' }, 400);
  const projectId = String(form.get('projectId') ?? '');
  if (!projectId) return json({ error: 'Pedido inválido.' }, 400);

  const db = getDb();
  const [own] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, auth.userId)))
    .limit(1);
  if (!own) return json({ error: 'Pedido não encontrado.' }, 404);

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
  const moduleId = created?.id;
  if (!moduleId) return json({ error: 'Não foi possível salvar o móvel.' }, 502);

  // Foto opcional do móvel (galeria/câmera).
  const file = form.get('photo');
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) return json({ error: 'Anexo deve ser uma imagem.' }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: 'A foto deve ter no máx 10 MB.' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());

    // Moderação (§8.7): foto irrelevante não é guardada — o móvel fica salvo e
    // o cliente pode enviar outra. Fail-open: erro de API não bloqueia.
    const mod = await resolvePhotoModerator({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODERATION_MODEL: process.env.GEMINI_MODERATION_MODEL }).check(bytesToBase64(bytes), file.type || 'image/jpeg');
    if (!mod.relevant) {
      return json({ ok: true, moduleId, photoRejected: true, photoReason: mod.reason ?? 'Essa foto não parece ser do cômodo. Envie a parede onde o móvel vai ficar.' });
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${projectId}/${moduleId}/${Date.now()}.${ext}`;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(PROJECT_PHOTOS_BUCKET)
      .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: true });
    if (!error) {
      await db.insert(projectPhotos).values({ projectId, moduleId, kind: 'REFERENCE', path });
    }
  }

  return json({ ok: true, moduleId });
}
