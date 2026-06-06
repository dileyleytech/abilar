import 'server-only';
import { quotes, projects, profiles, carpenterProfiles, eq, and, desc } from '@abilar/db';
import type { Quote } from '@abilar/db';
import type { QuoteStatus, QuoteLineItem } from '@abilar/shared';
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

export type QuotePrintView = {
  quoteId: string;
  status: QuoteStatus;
  projectId: string;
  meIsClient: boolean;
  projectTitle: string;
  projectCity: string | null;
  clientName: string;
  carpenterName: string;
  carpenterCompany: string | null;
  items: QuoteLineItem[];
  note: string | null;
  validUntil: Date | null;
  createdAt: Date;
  avistaCents: number;
  clientInstallments: number;
  parceladoCents: number | null;
  installmentValueCents: number | null;
} | null;

/** Dados do orçamento para o documento imprimível (PDF). Só o cliente do pedido
 *  ou o marceneiro autor acessam. Valores são os FACE AO CLIENTE (taxa embutida). */
export async function getQuoteForPrint(quoteId: string, userId: string): Promise<QuotePrintView> {
  const db = getDb();
  const [row] = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      baseValueCents: quotes.baseValueCents,
      maxInstallments: quotes.maxInstallments,
      dilutionSharePct: quotes.dilutionSharePct,
      lineItems: quotes.lineItems,
      note: quotes.note,
      validUntil: quotes.validUntil,
      createdAt: quotes.createdAt,
      carpenterId: quotes.carpenterId,
      clientId: projects.clientId,
      projectId: quotes.projectId,
      projectTitle: projects.title,
      projectCity: projects.city,
      clientName: profiles.name,
      carpenterName: carpenterProfiles.name,
      carpenterCompany: carpenterProfiles.companyName,
    })
    .from(quotes)
    .innerJoin(projects, eq(projects.id, quotes.projectId))
    .leftJoin(profiles, eq(profiles.id, projects.clientId))
    .leftJoin(carpenterProfiles, eq(carpenterProfiles.userId, quotes.carpenterId))
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!row) return null;
  if (row.carpenterId !== userId && row.clientId !== userId) return null;

  const config = await getActivePricingConfig();
  if (!config) return null;
  const nClient = maxClientInstallments(config);
  const subsidizes = row.maxInstallments > 1;
  const sShare = subsidizes ? Number(row.dilutionSharePct) : 0;
  const avista = quotePricing({ baseValueCents: row.baseValueCents, config, installments: 1, method: 'PIX', carpenterDilutionSharePct: sShare });
  let parceladoCents: number | null = null;
  let installmentValueCents: number | null = null;
  if (nClient > 1) {
    const parc = quotePricing({
      baseValueCents: row.baseValueCents,
      config,
      installments: subsidizes ? row.maxInstallments : 1,
      clientInstallments: nClient,
      method: 'CARD',
      carpenterDilutionSharePct: sShare,
    });
    parceladoCents = parc.displayedAmountCents;
    installmentValueCents = Math.round(parc.displayedAmountCents / nClient);
  }

  return {
    quoteId: row.id,
    status: row.status,
    projectId: row.projectId,
    meIsClient: row.clientId === userId,
    projectTitle: row.projectTitle,
    projectCity: row.projectCity,
    clientName: row.clientName ?? 'Cliente',
    carpenterName: row.carpenterName ?? 'Marceneiro',
    carpenterCompany: row.carpenterCompany,
    items: (row.lineItems as QuoteLineItem[]) ?? [],
    note: row.note,
    validUntil: row.validUntil,
    createdAt: row.createdAt,
    avistaCents: avista.displayedAmountCents,
    clientInstallments: nClient,
    parceladoCents,
    installmentValueCents,
  };
}
