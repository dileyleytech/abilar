import { projectMilestones, milestoneEvidences, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { notify } from '@/lib/notifications/notify';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

const MAX_PHOTOS = 8;

// Marceneiro conclui a etapa (IN_PROGRESS → DONE) — EXIGE foto(s) + comentário
// como evidência (§6.4). Multipart: milestoneId, comment, photos[].
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: 'Envio inválido.' }, 400);
  const milestoneId = String(form.get('milestoneId') ?? '');
  const comment = String(form.get('comment') ?? '').trim();
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);

  if (!milestoneId) return json({ error: 'Etapa inválida.' }, 400);
  if (files.length === 0) return json({ error: 'Adicione pelo menos uma foto.' }, 400);
  if (!comment) return json({ error: 'Adicione um comentário descrevendo a etapa.' }, 400);
  if (files.length > MAX_PHOTOS) return json({ error: `Máximo de ${MAX_PHOTOS} fotos.` }, 400);

  const db = getDb();
  const [m] = await db
    .select({
      carpenterId: projectMilestones.carpenterId,
      clientId: projectMilestones.clientId,
      projectId: projectMilestones.projectId,
      label: projectMilestones.label,
      status: projectMilestones.status,
    })
    .from(projectMilestones)
    .where(eq(projectMilestones.id, milestoneId))
    .limit(1);
  if (!m || m.carpenterId !== auth.userId) return json({ error: 'Etapa não encontrada.' }, 404);
  if (m.status !== 'IN_PROGRESS') return json({ error: 'Esta etapa não pode ser concluída agora.' }, 409);

  const supabase = createSupabaseAdminClient();
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    if (!f.type.startsWith('image/')) return json({ error: 'Só é possível anexar imagens.' }, 400);
    if (f.size > 10 * 1024 * 1024) return json({ error: 'Cada foto deve ter no máx 10 MB.' }, 400);
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `evidence/${milestoneId}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from(PROJECT_PHOTOS_BUCKET)
      .upload(path, new Uint8Array(await f.arrayBuffer()), { contentType: f.type || 'image/jpeg', upsert: true });
    if (error) return json({ error: 'Não foi possível enviar a(s) foto(s).' }, 502);
    paths.push(path);
  }

  await db.insert(milestoneEvidences).values({
    milestoneId,
    projectId: m.projectId,
    clientId: m.clientId,
    carpenterId: m.carpenterId,
    authorId: auth.userId,
    comment,
    photos: paths,
  });
  await db.update(projectMilestones).set({ status: 'DONE', doneAt: sql`now()` }).where(eq(projectMilestones.id, milestoneId));
  await notify(m.clientId, {
    title: 'Etapa concluída — aprove ✅',
    body: `${m.label} foi concluída. Confira as fotos e aprove para liberar.`,
    link: `/pedidos/${m.projectId}`,
  });
  return json({ ok: true });
}
