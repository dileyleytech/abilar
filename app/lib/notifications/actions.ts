'use server';

import { revalidatePath } from 'next/cache';
import { notifications, eq, and, isNull, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { countUnreadNotifications } from '@/lib/notifications/queries';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Marca todas as notificações do usuário como lidas. */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, profile.id), isNull(notifications.readAt)));
  revalidatePath('/notificacoes');
  return { ok: true };
}

/** Contagem de não lidas do usuário logado (re-sync do badge no menu). */
export async function getMyNotificationCount(): Promise<number> {
  const profile = await getSessionProfile();
  if (!profile) return 0;
  return countUnreadNotifications(profile.id);
}
