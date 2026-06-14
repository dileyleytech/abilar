import 'server-only';
import { applyPercent } from '@abilar/shared';
import { contracts, quotes, projects, profiles, architectProfiles, eq } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getActivePricingConfig } from '@/lib/pricing/config';

/** Repartição financeira da plataforma (apenas contratos ASSINADOS).
 *  Modelo §5: cliente paga `contract.valueCents` (à vista, face ao cliente);
 *  o marceneiro recebe V − tm%(V); a comissão do arquiteto sai da fatia da
 *  plataforma. Avulsos (orçamentos off-platform) NÃO entram aqui. */
export type AdminFinancials = {
  clientTotalCents: number; // total pago pelos clientes (face)
  platformNetCents: number; // fica com a plataforma (líquido de comissão do arquiteto)
  architectTotalCents: number; // total repassado a arquitetos
  carpenterTotalCents: number; // total repassado a marceneiros
  contractsCount: number;
  byCarpenter: { id: string; name: string; payoutCents: number; contracts: number }[];
  byArchitect: { id: string; name: string; commissionPercent: number; commissionCents: number; contracts: number }[];
};

export async function getAdminFinancials(): Promise<AdminFinancials> {
  const db = getDb();
  const cfg = await getActivePricingConfig();
  const tm = cfg?.carpenterCommissionPct ?? 0;
  const pixFixed = cfg?.pixFixedFeeCents ?? 0;

  // Contratos assinados + V do orçamento + arquiteto do projeto + nome do marceneiro.
  const rows = await db
    .select({
      contractValueCents: contracts.valueCents,
      baseValueCents: quotes.baseValueCents,
      carpenterId: contracts.carpenterId,
      carpenterName: profiles.name,
      architectId: projects.architectId,
    })
    .from(contracts)
    .innerJoin(quotes, eq(quotes.id, contracts.quoteId))
    .innerJoin(projects, eq(projects.id, contracts.projectId))
    .leftJoin(profiles, eq(profiles.id, contracts.carpenterId))
    .where(eq(contracts.status, 'SIGNED'));

  // Comissão configurada por arquiteto (sai da fatia da plataforma).
  const archRows = await db
    .select({ userId: architectProfiles.userId, name: architectProfiles.name, commissionPercent: architectProfiles.commissionPercent })
    .from(architectProfiles);
  const archMap = new Map(archRows.map((a) => [a.userId, { name: a.name, pct: Number(a.commissionPercent) }]));

  let clientTotalCents = 0;
  let architectTotalCents = 0;
  let carpenterTotalCents = 0;
  let platformGrossCents = 0;
  const byCarpenter = new Map<string, { name: string; payoutCents: number; contracts: number }>();
  const byArchitect = new Map<string, { name: string; commissionPercent: number; commissionCents: number; contracts: number }>();

  for (const r of rows) {
    const V = r.baseValueCents;
    const carpenterPayout = V - applyPercent(V, tm);
    // Bruto da plataforma = o que o cliente paga − repasse do marceneiro.
    const platformGross = r.contractValueCents - carpenterPayout;

    clientTotalCents += r.contractValueCents;
    carpenterTotalCents += carpenterPayout;
    platformGrossCents += platformGross;

    const cKey = r.carpenterId;
    const cEntry = byCarpenter.get(cKey) ?? { name: r.carpenterName ?? 'Marceneiro', payoutCents: 0, contracts: 0 };
    cEntry.payoutCents += carpenterPayout;
    cEntry.contracts += 1;
    byCarpenter.set(cKey, cEntry);

    if (r.architectId) {
      const a = archMap.get(r.architectId);
      const pct = a?.pct ?? 0;
      const commission = applyPercent(V, pct);
      architectTotalCents += commission;
      const aEntry = byArchitect.get(r.architectId) ?? { name: a?.name ?? 'Arquiteto', commissionPercent: pct, commissionCents: 0, contracts: 0 };
      aEntry.commissionCents += commission;
      aEntry.contracts += 1;
      byArchitect.set(r.architectId, aEntry);
    }
  }

  return {
    clientTotalCents,
    // A comissão do arquiteto e a taxa fixa do PIX saem da fatia da plataforma.
    platformNetCents: platformGrossCents - architectTotalCents - pixFixed * rows.length,
    architectTotalCents,
    carpenterTotalCents,
    contractsCount: rows.length,
    byCarpenter: [...byCarpenter.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.payoutCents - a.payoutCents),
    byArchitect: [...byArchitect.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.commissionCents - a.commissionCents),
  };
}
