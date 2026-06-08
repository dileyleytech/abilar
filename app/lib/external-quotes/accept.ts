import 'server-only';
import { externalQuotes, carpenterJobs, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';

/** Marca um avulso como ACEITO e cria a obra externa na agenda (idempotente —
 *  não duplica se aceito mais de uma vez). Mesmo espírito do orçamento da
 *  plataforma aprovado virar obra. */
export async function acceptExternalQuote(carpenterId: string, quoteId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const [q] = await db
    .select({ clientName: externalQuotes.clientName, title: externalQuotes.title })
    .from(externalQuotes)
    .where(and(eq(externalQuotes.id, quoteId), eq(externalQuotes.carpenterId, carpenterId)))
    .limit(1);
  if (!q) return { ok: false, error: 'Orçamento não encontrado.' };

  await db.update(externalQuotes).set({ status: 'ACCEPTED', updatedAt: sql`now()` }).where(eq(externalQuotes.id, quoteId));

  const [existing] = await db.select({ id: carpenterJobs.id }).from(carpenterJobs).where(eq(carpenterJobs.sourceExternalQuoteId, quoteId)).limit(1);
  if (!existing) {
    await db.insert(carpenterJobs).values({ carpenterId, title: q.title, clientName: q.clientName, status: 'ACTIVE', sourceExternalQuoteId: quoteId });
  }
  return { ok: true };
}
