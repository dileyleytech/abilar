'use server';

import { revalidatePath } from 'next/cache';
import { maskContact } from '@abilar/shared';
import { conversations, messages, quotes, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';

export type PreApproveResult = { ok: true; conversationId: string } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Cliente PRÉ-APROVA um orçamento → cria a conversa e libera o chat (§7.8). */
export async function preApproveQuote(quoteId: string): Promise<PreApproveResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const db = getDb();

  // Carrega o orçamento + valida que o pedido é do cliente logado.
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

  if (!row || row.clientId !== profile.id) return { ok: false, error: 'Orçamento não encontrado.' };

  // Marca o orçamento como pré-aprovado e o pedido em negociação.
  await db.update(quotes).set({ status: 'PRE_APPROVED', updatedAt: sql`now()` }).where(eq(quotes.id, quoteId));
  if (row.projectStatus === 'OPEN_FOR_QUOTES') {
    await db.update(projects).set({ status: 'IN_NEGOTIATION', updatedAt: sql`now()` }).where(eq(projects.id, row.projectId));
  }

  // Cria a conversa (1 por projeto+marceneiro) ou reaproveita a existente.
  const [created] = await db
    .insert(conversations)
    .values({ projectId: row.projectId, clientId: profile.id, carpenterId: row.carpenterId, quoteId })
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
  if (!conversationId) return { ok: false, error: 'Não foi possível abrir a conversa.' };

  revalidatePath(`/pedidos/${row.projectId}`);
  return { ok: true, conversationId };
}

/** Envia uma mensagem no chat (com mascaramento de contato — §7.8). */
export async function sendMessage(conversationId: string, body: string): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const text = body.trim();
  if (!text) return { ok: false, error: 'Mensagem vazia.' };
  if (text.length > 2000) return { ok: false, error: 'Mensagem muito longa.' };

  const db = getDb();
  // Participante de uma conversa ATIVA?
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId, status: conversations.status })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== profile.id && conv.carpenterId !== profile.id)) {
    return { ok: false, error: 'Conversa não encontrada.' };
  }
  if (conv.status !== 'ACTIVE') return { ok: false, error: 'Esta conversa está fechada.' };

  const redacted = maskContact(text);
  await db.insert(messages).values({
    conversationId,
    senderId: profile.id,
    body: text,
    redactedBody: redacted === text ? null : redacted,
  });
  revalidatePath(`/conversas/${conversationId}`);
  return { ok: true };
}
