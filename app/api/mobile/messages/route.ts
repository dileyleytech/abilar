import { maskContact } from '@abilar/shared';
import { conversations, messages, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Envia mensagem do app (texto). Mesma regra de mascaramento da web (§7.8).
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const { conversationId, body } = (await req.json().catch(() => ({}))) as {
    conversationId?: string;
    body?: string;
  };
  const text = (body ?? '').trim();
  if (!conversationId || !text) return json({ error: 'Mensagem vazia.' }, 400);
  if (text.length > 2000) return json({ error: 'Mensagem muito longa.' }, 400);

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

  const redacted = maskContact(text);
  const masked = redacted !== text;
  await db.insert(messages).values({
    conversationId,
    senderId: auth.userId,
    body: text,
    redactedBody: masked ? redacted : null,
    flaggedReason: masked ? 'CONTACT_MASKED' : null,
  });
  return json({ ok: true });
}
