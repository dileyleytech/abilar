import 'server-only';
import { quotes, externalQuotes, eq } from '@abilar/db';
import { getDb } from '@/lib/db';

export type CarpenterReport = {
  platform: { sent: number; accepted: number; valueCents: number; costCents: number; profitCents: number };
  external: { sent: number; accepted: number; valueCents: number; costCents: number; profitCents: number };
  total: { valueCents: number; costCents: number; profitCents: number };
};

/** Relatório de ganhos do marceneiro: orçamentos da plataforma (aceitos/pagos) +
 *  avulsos (aceitos). Lucro estimado = valor − custo. Tudo em centavos. */
export async function getCarpenterReport(carpenterId: string): Promise<CarpenterReport> {
  const db = getDb();
  const [plat, ext] = await Promise.all([
    db.select({ baseValueCents: quotes.baseValueCents, carpenterCostCents: quotes.carpenterCostCents, status: quotes.status }).from(quotes).where(eq(quotes.carpenterId, carpenterId)),
    db.select({ valueCents: externalQuotes.valueCents, subtotalCostCents: externalQuotes.subtotalCostCents, status: externalQuotes.status }).from(externalQuotes).where(eq(externalQuotes.carpenterId, carpenterId)),
  ]);

  const platformAccepted = plat.filter((q) => q.status === 'ACCEPTED' || q.status === 'PAID');
  const pValue = platformAccepted.reduce((a, q) => a + q.baseValueCents, 0);
  const pCost = platformAccepted.reduce((a, q) => a + (q.carpenterCostCents ?? 0), 0);

  const externalAccepted = ext.filter((q) => q.status === 'ACCEPTED');
  const eValue = externalAccepted.reduce((a, q) => a + q.valueCents, 0);
  const eCost = externalAccepted.reduce((a, q) => a + q.subtotalCostCents, 0);

  const platform = { sent: plat.length, accepted: platformAccepted.length, valueCents: pValue, costCents: pCost, profitCents: pValue - pCost };
  const external = { sent: ext.length, accepted: externalAccepted.length, valueCents: eValue, costCents: eCost, profitCents: eValue - eCost };
  return {
    platform,
    external,
    total: { valueCents: pValue + eValue, costCents: pCost + eCost, profitCents: platform.profitCents + external.profitCents },
  };
}
