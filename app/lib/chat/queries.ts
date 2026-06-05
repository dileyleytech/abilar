import 'server-only';
import {
  conversations,
  messages,
  projects,
  profiles,
  carpenterProfiles,
  eq,
  and,
  asc,
} from '@abilar/db';
import type { Message } from '@abilar/db';
import { getDb } from '@/lib/db';

export type ConversationView = {
  id: string;
  projectId: string;
  projectTitle: string;
  status: string;
  meIsClient: boolean;
  otherName: string;
} | null;

/** Conversa (se o usuário for participante) + nome da outra parte + pedido. */
export async function getConversation(id: string, userId: string): Promise<ConversationView> {
  const db = getDb();
  const [row] = await db
    .select({
      id: conversations.id,
      projectId: conversations.projectId,
      clientId: conversations.clientId,
      carpenterId: conversations.carpenterId,
      status: conversations.status,
      projectTitle: projects.title,
      clientName: profiles.name,
      carpenterName: carpenterProfiles.name,
    })
    .from(conversations)
    .innerJoin(projects, eq(projects.id, conversations.projectId))
    .leftJoin(profiles, eq(profiles.id, conversations.clientId))
    .leftJoin(carpenterProfiles, eq(carpenterProfiles.userId, conversations.carpenterId))
    .where(eq(conversations.id, id))
    .limit(1);

  if (!row || (row.clientId !== userId && row.carpenterId !== userId)) return null;
  const meIsClient = row.clientId === userId;
  return {
    id: row.id,
    projectId: row.projectId,
    projectTitle: row.projectTitle,
    status: row.status,
    meIsClient,
    otherName: (meIsClient ? row.carpenterName : row.clientName) ?? (meIsClient ? 'Marceneiro' : 'Cliente'),
  };
}

export type ChatMessage = Pick<Message, 'id' | 'senderId' | 'createdAt'> & { text: string };

/** Mensagens da conversa (mais antigas primeiro). Mostra o corpo mascarado. */
export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      redactedBody: messages.redactedBody,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
  return rows.map((m) => ({ id: m.id, senderId: m.senderId, createdAt: m.createdAt, text: m.redactedBody ?? m.body }));
}

/** Conversa existente entre um pedido e um marceneiro (ou null). */
export async function getConversationForProjectCarpenter(
  projectId: string,
  carpenterId: string,
): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), eq(conversations.carpenterId, carpenterId)))
    .limit(1);
  return row?.id ?? null;
}
