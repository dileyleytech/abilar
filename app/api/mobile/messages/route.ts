import { maskContact } from '@abilar/shared';
import { conversations, messages, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET } from '@/lib/storage';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

const MAX_PHOTOS = 4;

// Envia mensagem do app (texto e/ou fotos). Multipart: conversationId, body, photos[].
// Mesmo mascaramento de contato da web (§7.8); fotos sobem via service-role.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: 'Envio inválido.' }, 400);
  const conversationId = String(form.get('conversationId') ?? '');
  const text = String(form.get('body') ?? '').trim();
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);

  if (!conversationId || (!text && files.length === 0)) return json({ error: 'Mensagem vazia.' }, 400);
  if (text.length > 2000) return json({ error: 'Mensagem muito longa.' }, 400);
  if (files.length > MAX_PHOTOS) return json({ error: `Máximo de ${MAX_PHOTOS} fotos por mensagem.` }, 400);

  const db = getDb();
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId, status: conversations.status })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== auth.userId && conv.carpenterId !== auth.userId)) {
    return json({ error: 'Conversa não encontrada.' }, 404);
  }
  if (conv.status !== 'ACTIVE') return json({ error: 'Esta conversa está fechada.' }, 409);

  const paths: string[] = [];
  if (files.length > 0) {
    const supabase = createSupabaseAdminClient();
    for (let i = 0; i < files.length; i++) {
      const f = files[i]!;
      if (!f.type.startsWith('image/')) return json({ error: 'Só é possível anexar imagens.' }, 400);
      if (f.size > 10 * 1024 * 1024) return json({ error: 'Cada foto deve ter no máx 10 MB.' }, 400);
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `chat/${conversationId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from(PROJECT_PHOTOS_BUCKET)
        .upload(path, new Uint8Array(await f.arrayBuffer()), { contentType: f.type || 'image/jpeg', upsert: true });
      if (error) return json({ error: 'Não foi possível enviar a(s) foto(s).' }, 502);
      paths.push(path);
    }
  }

  const redacted = text ? maskContact(text) : '';
  const masked = redacted !== text;
  await db.insert(messages).values({
    conversationId,
    senderId: auth.userId,
    body: text,
    redactedBody: masked ? redacted : null,
    flaggedReason: masked ? 'CONTACT_MASKED' : null,
    attachments: paths,
  });
  return json({ ok: true });
}
