import 'server-only';
import { notifications } from '@abilar/db';
import { getDb } from '@/lib/db';

/** Cria uma notificação in-app para um usuário. Best-effort: nunca quebra a ação
 *  principal (uma falha aqui é só log). */
export async function notify(
  userId: string,
  data: { title: string; body?: string; link?: string },
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(notifications).values({
      userId,
      title: data.title,
      body: data.body ?? null,
      link: data.link ?? null,
    });
  } catch (e) {
    console.error('notify failed:', e);
  }
}
