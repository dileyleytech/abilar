import 'server-only';
import { DEFAULT_MILESTONES, type Milestone } from '@abilar/shared';
import { quotePricing, maxClientInstallments, allocateProportional, type PricingConfig } from '@abilar/pricing';
import { contracts, quotes, projects, projectMilestones, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { notify } from '@/lib/notifications/notify';

/** Hash (SHA-256) do IP de quem aceita — registro do aceite eletrônico (§6.5). */
export async function ipHashFromReq(req: Request): Promise<string | null> {
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '').split(',')[0]?.trim();
  if (!ip) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type ClientPrices = {
  avistaCents: number;
  parceladoCents: number | null;
  installmentValueCents: number | null;
  clientInstallments: number;
};

/** Preços face ao cliente (modelo de duas faixas) — servidor é a fonte de verdade. */
export function computeClientPrices(
  config: PricingConfig,
  baseValueCents: number,
  maxInstallments: number,
  dilutionSharePct: number,
): ClientPrices {
  const nClient = maxClientInstallments(config);
  const subsidizes = maxInstallments > 1;
  const s = subsidizes ? dilutionSharePct : 0;
  const avista = quotePricing({ baseValueCents, config, installments: 1, method: 'PIX', carpenterDilutionSharePct: s });
  const parc =
    nClient > 1
      ? quotePricing({
          baseValueCents,
          config,
          installments: subsidizes ? maxInstallments : 1,
          clientInstallments: nClient,
          method: 'CARD',
          carpenterDilutionSharePct: s,
        })
      : null;
  return {
    avistaCents: avista.displayedAmountCents,
    parceladoCents: parc?.displayedAmountCents ?? null,
    installmentValueCents: parc ? Math.round(parc.displayedAmountCents / nClient) : null,
    clientInstallments: nClient,
  };
}

/** Os dois aceitaram → contrato ASSINADO, orçamento ACEITO, projeto HIRED + cria
 *  os marcos da obra (idempotente). Espelha lib/contracts/actions.ts. */
export async function finalizeIfBothSigned(contractId: string): Promise<void> {
  const db = getDb();
  const [c] = await db
    .select({
      quoteId: contracts.quoteId,
      projectId: contracts.projectId,
      clientId: contracts.clientId,
      carpenterId: contracts.carpenterId,
      valueCents: contracts.valueCents,
      terms: contracts.terms,
      status: contracts.status,
      client: contracts.acceptedByClientAt,
      carpenter: contracts.acceptedByCarpenterAt,
    })
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);
  if (!c || c.status !== 'DRAFT' || !c.client || !c.carpenter) return;

  await db.update(contracts).set({ status: 'SIGNED' }).where(eq(contracts.id, contractId));
  await db.update(quotes).set({ status: 'ACCEPTED', updatedAt: sql`now()` }).where(eq(quotes.id, c.quoteId));
  await db.update(projects).set({ status: 'HIRED', updatedAt: sql`now()` }).where(eq(projects.id, c.projectId));

  const [exists] = await db
    .select({ id: projectMilestones.id })
    .from(projectMilestones)
    .where(eq(projectMilestones.contractId, contractId))
    .limit(1);
  if (exists) return;

  const ms = (c.terms as { milestones?: Milestone[] })?.milestones ?? DEFAULT_MILESTONES;
  const amounts = allocateProportional(c.valueCents, ms.map((m) => m.pct));
  await db.insert(projectMilestones).values(
    ms.map((m, i) => ({
      projectId: c.projectId,
      contractId,
      clientId: c.clientId,
      carpenterId: c.carpenterId,
      ord: i,
      key: m.key,
      label: m.label,
      event: m.event,
      pct: m.pct,
      amountCents: amounts[i] ?? 0,
      status: 'PENDING' as const,
    })),
  );

  await notify(c.carpenterId, { title: 'Contrato assinado — obra contratada! 🏗️', body: 'A obra foi criada. Toque etapa a etapa.', link: `/marceneiro/pedidos/${c.projectId}` });
  await notify(c.clientId, { title: 'Contrato assinado — obra contratada! 🏗️', body: 'Acompanhe as etapas da sua obra por aqui.', link: `/pedidos/${c.projectId}` });
}
