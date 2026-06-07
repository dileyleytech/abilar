import { DEFAULT_MILESTONES, type QuoteLineItem } from '@abilar/shared';
import { contracts, quotes, projects, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getActivePricingConfig } from '@/lib/pricing/config';
import { notify } from '@/lib/notifications/notify';
import { computeClientPrices, finalizeIfBothSigned, ipHashFromReq } from '@/lib/api/deal';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Cliente aceita o orçamento → gera o contrato padrão (§6.5) + registra o aceite
// do cliente. Espelha lib/contracts/actions.ts:acceptQuote. JSON: { quoteId }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { quoteId } = (await req.json().catch(() => ({}))) as { quoteId?: string };
  if (!quoteId) return json({ error: 'Orçamento inválido.' }, 400);

  const db = getDb();
  const [row] = await db
    .select({
      quoteId: quotes.id,
      projectId: quotes.projectId,
      carpenterId: quotes.carpenterId,
      baseValueCents: quotes.baseValueCents,
      maxInstallments: quotes.maxInstallments,
      dilutionSharePct: quotes.dilutionSharePct,
      lineItems: quotes.lineItems,
      clientId: projects.clientId,
      projectStatus: projects.status,
    })
    .from(quotes)
    .innerJoin(projects, eq(projects.id, quotes.projectId))
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!row || row.clientId !== auth.userId) return json({ error: 'Orçamento não encontrado.' }, 404);
  if (['HIRED', 'EXECUTED', 'CANCELLED'].includes(row.projectStatus)) {
    return json({ error: 'Este pedido não está mais em negociação.' }, 409);
  }

  const config = await getActivePricingConfig();
  if (!config) return json({ error: 'Configuração de preço indisponível.' }, 503);
  const prices = computeClientPrices(config, row.baseValueCents, row.maxInstallments, Number(row.dilutionSharePct));

  const terms = {
    items: (row.lineItems as QuoteLineItem[]) ?? [],
    avistaCents: prices.avistaCents,
    parceladoCents: prices.parceladoCents,
    installmentValueCents: prices.installmentValueCents,
    clientInstallments: prices.clientInstallments,
    milestones: DEFAULT_MILESTONES,
  };

  const hash = await ipHashFromReq(req);
  const [created] = await db
    .insert(contracts)
    .values({
      projectId: row.projectId,
      quoteId: row.quoteId,
      clientId: row.clientId,
      carpenterId: row.carpenterId,
      valueCents: prices.avistaCents,
      terms,
      acceptedByClientAt: sql`now()`,
      clientIpHash: hash,
    })
    .onConflictDoNothing({ target: contracts.quoteId })
    .returning({ id: contracts.id });

  let contractId = created?.id;
  if (!contractId) {
    const [existing] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.quoteId, quoteId)).limit(1);
    contractId = existing?.id;
    if (contractId) {
      await db.update(contracts).set({ acceptedByClientAt: sql`now()`, clientIpHash: hash }).where(eq(contracts.id, contractId));
    }
  }
  if (!contractId) return json({ error: 'Não foi possível gerar o contrato.' }, 502);

  await notify(row.carpenterId, {
    title: 'Cliente aprovou o orçamento! ✅',
    body: 'Assine o contrato para fechar e iniciar a obra.',
    link: `/contratos/${contractId}`,
  });
  await finalizeIfBothSigned(contractId);
  return json({ ok: true, contractId });
}
