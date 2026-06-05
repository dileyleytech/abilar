import 'server-only';
import { quotes, carpenterProfiles, eq, and, desc } from '@abilar/db';
import type { Quote } from '@abilar/db';
import type { QuoteStatus } from '@abilar/shared';
import { quotePricing, maxClientInstallments } from '@abilar/pricing';
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
  // O cliente sempre parcela no máx do sistema; NUNCA expomos o N do marceneiro.
  clientInstallments: number;
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

  // O cliente sempre parcela no máximo do sistema (ex.: 10x). O N que o marceneiro
  // aceitou subsidiar fica INTERNO — só abate um pouco o valor do parcelado.
  const nClient = maxClientInstallments(config);

  return rows.map((r) => {
    const subsidizes = r.maxInstallments > 1; // marceneiro aceitou "perder" p/ parcelar
    const s = subsidizes ? Number(r.dilutionSharePct) : 0;
    const avista = quotePricing({
      baseValueCents: r.baseValueCents,
      config,
      installments: 1,
      method: 'PIX',
      carpenterDilutionSharePct: s,
    });
    let parceladoCents: number | null = null;
    let installmentValueCents: number | null = null;
    if (nClient > 1) {
      const parc = quotePricing({
        baseValueCents: r.baseValueCents,
        config,
        installments: subsidizes ? r.maxInstallments : 1, // teto do subsídio (interno)
        clientInstallments: nClient, // o que o cliente realmente parcela
        method: 'CARD',
        carpenterDilutionSharePct: s,
      });
      parceladoCents = parc.displayedAmountCents;
      installmentValueCents = Math.round(parc.displayedAmountCents / nClient);
    }
    return {
      id: r.id,
      carpenterName: r.carpenterName ?? 'Marceneiro',
      status: r.status,
      note: r.note,
      avistaCents: avista.displayedAmountCents,
      clientInstallments: nClient,
      parceladoCents,
      installmentValueCents,
    };
  });
}
