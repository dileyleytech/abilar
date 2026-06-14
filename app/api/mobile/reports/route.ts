import { reportInputSchema } from '@abilar/shared';
import { conversations, reports, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Denúncia de conversa (moderação §7.8 — exigência das lojas). JSON: conversationId, reason, detail?.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const body = (await req.json().catch(() => ({}))) as { conversationId?: string; reason?: unknown; detail?: unknown };
  const parsed = reportInputSchema.safeParse({ reason: body.reason, detail: body.detail });
  if (!body.conversationId || !parsed.success) return json({ error: 'Dados inválidos.' }, 400);

  const db = getDb();
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId })
    .from(conversations)
    .where(eq(conversations.id, body.conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== auth.userId && conv.carpenterId !== auth.userId)) {
    return json({ error: 'Conversa não encontrada.' }, 404);
  }

  await db.insert(reports).values({
    conversationId: body.conversationId,
    reporterId: auth.userId,
    reason: parsed.data.reason,
    detail: parsed.data.detail ?? null,
  });
  return json({ ok: true });
}
