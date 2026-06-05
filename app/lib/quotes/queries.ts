import 'server-only';
import { quotes, carpenterProfiles, eq, and, desc } from '@abilar/db';
import type { Quote } from '@abilar/db';
import type { QuoteStatus } from '@abilar/shared';
import { quotePricing } from '@abilar/pricing';
import { getDb } from '@/lib/db';
import { getActivePricingConfig } from '@/lib/pricing/config';

/** Orçamento que ESTE marceneiro já enviou para o pedido (ou null). */
export async function getCarpenterQuote(projectId: string, carpenterId: string): Promise<Quote | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.projectId, projectId), eq(quotes.carpenterId, carpenterId)))
    .limit(1);
  return row ?? null;
}

export type ReceivedQuote = {
  id: string;
  carpenterName: string;
  status: QuoteStatus;
  note: string | null;
  avistaCents: number;
  maxInstallments: number;
  parceladoCents: number | null;
  installmentValueCents: number | null;
};

/** Orçamentos recebidos num pedido (visão do cliente), com o preço já calculado. */
export async function getReceivedQuotes(projectId: string): Promise<ReceivedQuote[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: quotes.id,
      carpenterId: quotes.carpenterId,
      baseValueCents: quotes.baseValueCents,
      maxInstallments: quotes.maxInstallments,
      dilutionSharePct: quotes.dilutionSharePct,
      note: quotes.note,
      status: quotes.status,
      carpenterName: carpenterProfiles.name,
    })
    .from(quotes)
    .leftJoin(carpenterProfiles, eq(carpenterProfiles.userId, quotes.carpenterId))
    .where(eq(quotes.projectId, projectId))
    .orderBy(desc(quotes.createdAt));

  const config = await getActivePricingConfig();
  if (!config) return [];

  return rows.map((r) => {
    const s = Number(r.dilutionSharePct);
    const avista = quotePricing({
      baseValueCents: r.baseValueCents,
      config,
      installments: 1,
      method: 'PIX',
      carpenterDilutionSharePct: s,
    });
    let parceladoCents: number | null = null;
    let installmentValueCents: number | null = null;
    if (r.maxInstallments > 1) {
      const parc = quotePricing({
        baseValueCents: r.baseValueCents,
        config,
        installments: r.maxInstallments,
        method: 'CARD',
        carpenterDilutionSharePct: s,
      });
      parceladoCents = parc.displayedAmountCents;
      installmentValueCents = Math.round(parc.displayedAmountCents / r.maxInstallments);
    }
    return {
      id: r.id,
      carpenterName: r.carpenterName ?? 'Marceneiro',
      status: r.status,
      note: r.note,
      avistaCents: avista.displayedAmountCents,
      maxInstallments: r.maxInstallments,
      parceladoCents,
      installmentValueCents,
    };
  });
}
