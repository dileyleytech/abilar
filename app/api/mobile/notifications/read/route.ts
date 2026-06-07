import { notifications, eq, and, isNull, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Marca todas as notificações do usuário como lidas.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, auth.userId), isNull(notifications.readAt)));
  return json({ ok: true });
}
