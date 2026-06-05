import 'server-only';
import {
  conversations,
  messages,
  projects,
  profiles,
  carpenterProfiles,
  eq,
  and,
  or,
  asc,
  desc,
  inArray,
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

export type ConversationListItem = {
  id: string;
  projectId: string;
  projectTitle: string;
  otherName: string;
  status: string;
  lastText: string | null;
  lastAt: string | null; // ISO
  unread: number;
};

/** Todas as conversas do usuário (cliente ou marceneiro), com a outra parte, o
 *  pedido e a prévia da última mensagem. Ordenadas por atividade mais recente. */
export async function listConversations(userId: string): Promise<ConversationListItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: conversations.id,
      projectId: conversations.projectId,
      clientId: conversations.clientId,
      carpenterId: conversations.carpenterId,
      status: conversations.status,
      createdAt: conversations.createdAt,
      clientLastReadAt: conversations.clientLastReadAt,
      carpenterLastReadAt: conversations.carpenterLastReadAt,
      projectTitle: projects.title,
      clientName: profiles.name,
      carpenterName: carpenterProfiles.name,
    })
    .from(conversations)
    .innerJoin(projects, eq(projects.id, conversations.projectId))
    .leftJoin(profiles, eq(profiles.id, conversations.clientId))
    .leftJoin(carpenterProfiles, eq(carpenterProfiles.userId, conversations.carpenterId))
    .where(or(eq(conversations.clientId, userId), eq(conversations.carpenterId, userId)));
  if (rows.length === 0) return [];

  // Todas as mensagens das conversas (mais recentes primeiro), p/ prévia + não lidas.
  const ids = rows.map((r) => r.id);
  const msgs = await db
    .select({
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      body: messages.body,
      redactedBody: messages.redactedBody,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(inArray(messages.conversationId, ids))
    .orderBy(desc(messages.createdAt));

  const last = new Map<string, { text: string; at: Date }>();
  const unreadByConv = new Map<string, number>();
  const lastReadByConv = new Map<string, Date | null>();
  for (const r of rows) {
    lastReadByConv.set(r.id, r.clientId === userId ? r.clientLastReadAt : r.carpenterLastReadAt);
  }
  for (const m of msgs) {
    if (!last.has(m.conversationId)) last.set(m.conversationId, { text: m.redactedBody ?? m.body, at: m.createdAt });
    // Não lida = de outra pessoa e mais nova que o meu "último lido".
    const lr = lastReadByConv.get(m.conversationId) ?? null;
    if (m.senderId !== userId && (lr === null || m.createdAt > lr)) {
      unreadByConv.set(m.conversationId, (unreadByConv.get(m.conversationId) ?? 0) + 1);
    }
  }

  return rows
    .map((r) => {
      const meIsClient = r.clientId === userId;
      const l = last.get(r.id);
      return {
        id: r.id,
        projectId: r.projectId,
        projectTitle: r.projectTitle,
        status: r.status,
        otherName:
          (meIsClient ? r.carpenterName : r.clientName) ?? (meIsClient ? 'Marceneiro' : 'Cliente'),
        lastText: l?.text ?? null,
        lastAt: (l?.at ?? r.createdAt).toISOString(),
        unread: unreadByConv.get(r.id) ?? 0,
      };
    })
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
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
