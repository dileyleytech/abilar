import 'server-only';
import { notifications, eq, and, desc, isNull, sql } from '@abilar/db';
import { getDb } from '@/lib/db';

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/** Notificações do usuário (mais recentes primeiro). */
export async function listNotifications(userId: string, limit = 50): Promise<NotificationItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows;
}

/** Quantas notificações não lidas o usuário tem. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}
