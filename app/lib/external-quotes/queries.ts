import 'server-only';
import { externalQuotes, eq, desc } from '@abilar/db';
import type { ExternalQuote } from '@abilar/db';
import { getDb } from '@/lib/db';

/** Orçamentos avulsos do marceneiro (mais recentes primeiro). */
export async function listExternalQuotes(carpenterId: string): Promise<ExternalQuote[]> {
  const db = getDb();
  return db
    .select()
    .from(externalQuotes)
    .where(eq(externalQuotes.carpenterId, carpenterId))
    .orderBy(desc(externalQuotes.createdAt));
}
