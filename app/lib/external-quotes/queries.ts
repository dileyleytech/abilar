import 'server-only';
import { externalQuotes, carpenterProfiles, and, eq, desc } from '@abilar/db';
import type { ExternalQuote } from '@abilar/db';
import type { QuoteLineItem } from '@abilar/shared';
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

export type ExternalQuotePrint = {
  id: string;
  clientName: string;
  title: string;
  items: { name: string; qty: number; unit: string }[];
  valueCents: number;
  note: string | null;
  createdAt: Date;
  carpenterName: string;
  carpenterCompany: string | null;
};

/** Orçamento avulso para impressão/PDF (só o dono). */
export async function getExternalQuoteForPrint(id: string, carpenterId: string): Promise<ExternalQuotePrint | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: externalQuotes.id,
      clientName: externalQuotes.clientName,
      title: externalQuotes.title,
      lineItems: externalQuotes.lineItems,
      valueCents: externalQuotes.valueCents,
      note: externalQuotes.note,
      createdAt: externalQuotes.createdAt,
      carpenterName: carpenterProfiles.name,
      carpenterCompany: carpenterProfiles.companyName,
    })
    .from(externalQuotes)
    .leftJoin(carpenterProfiles, eq(carpenterProfiles.userId, externalQuotes.carpenterId))
    .where(and(eq(externalQuotes.id, id), eq(externalQuotes.carpenterId, carpenterId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    clientName: row.clientName,
    title: row.title,
    items: ((row.lineItems as QuoteLineItem[]) ?? []).map((it) => ({ name: it.name, qty: it.qty, unit: it.unit })),
    valueCents: row.valueCents,
    note: row.note,
    createdAt: row.createdAt,
    carpenterName: row.carpenterName ?? 'Marceneiro',
    carpenterCompany: row.carpenterCompany ?? null,
  };
}
