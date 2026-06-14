import { conversations, quotes, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { notify } from '@/lib/notifications/notify';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Cliente pré-aprova um orçamento → cria a conversa e libera o chat (§7.8).
// Espelha lib/chat/actions.ts:preApproveQuote. JSON: { quoteId }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { quoteId } = (await req.json().catch(() => ({}))) as { quoteId?: string };
  if (!quoteId) return json({ error: 'Orçamento inválido.' }, 400);

  const db = getDb();
  const [row] = await db
    .select({
      quoteId: quotes.id,
      projectId: quotes.projectId,
      carpenterId: quotes.carpenterId,
      clientId: projects.clientId,
      projectStatus: projects.status,
    })
    .from(quotes)
    .innerJoin(projects, eq(projects.id, quotes.projectId))
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!row || row.clientId !== auth.userId) return json({ error: 'Orçamento não encontrado.' }, 404);

  await db.update(quotes).set({ status: 'PRE_APPROVED', updatedAt: sql`now()` }).where(eq(quotes.id, quoteId));
  if (row.projectStatus === 'OPEN_FOR_QUOTES') {
    await db.update(projects).set({ status: 'IN_NEGOTIATION', updatedAt: sql`now()` }).where(eq(projects.id, row.projectId));
  }

  const [created] = await db
    .insert(conversations)
    .values({ projectId: row.projectId, clientId: auth.userId, carpenterId: row.carpenterId, quoteId })
    .onConflictDoNothing({ target: [conversations.projectId, conversations.carpenterId] })
    .returning({ id: conversations.id });

  let conversationId = created?.id;
  if (!conversationId) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.projectId, row.projectId), eq(conversations.carpenterId, row.carpenterId)))
      .limit(1);
    conversationId = existing?.id;
  }
  if (!conversationId) return json({ error: 'Não foi possível abrir a conversa.' }, 502);

  await notify(row.carpenterId, {
    title: 'Seu orçamento foi pré-aprovado! 🎉',
    body: 'O cliente liberou o chat. Combine os detalhes para fechar.',
    link: `/conversas/${conversationId}`,
  });
  return json({ ok: true, conversationId });
}
