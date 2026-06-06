'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { DEFAULT_MILESTONES, type QuoteLineItem } from '@abilar/shared';
import { quotePricing, maxClientInstallments } from '@abilar/pricing';
import { contracts, quotes, projects, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { getActivePricingConfig } from '@/lib/pricing/config';

export type AcceptQuoteResult = { ok: true; contractId: string } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Hash (SHA-256) do IP do aceitante — registro do aceite eletrônico (§6.5),
 *  sem guardar o IP em claro. */
async function ipHash(): Promise<string | null> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0]?.trim();
  if (!ip) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Quando as duas partes aceitaram: contrato ASSINADO, orçamento ACEITO, projeto HIRED. */
async function finalizeIfBothSigned(contractId: string): Promise<void> {
  const db = getDb();
  const [c] = await db
    .select({
      quoteId: contracts.quoteId,
      projectId: contracts.projectId,
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
}

/** Cliente ACEITA o orçamento → gera o contrato padrão (§6.5) e registra o aceite
 *  do cliente. O marceneiro ainda precisa assinar para fechar (projeto HIRED). */
export async function acceptQuote(quoteId: string): Promise<AcceptQuoteResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
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
  if (!row || row.clientId !== profile.id) return { ok: false, error: 'Orçamento não encontrado.' };
  if (row.projectStatus === 'HIRED' || row.projectStatus === 'EXECUTED' || row.projectStatus === 'CANCELLED') {
    return { ok: false, error: 'Este pedido não está mais em negociação.' };
  }

  const config = await getActivePricingConfig();
  if (!config) return { ok: false, error: 'Configuração de preço indisponível.' };
  const nClient = maxClientInstallments(config);
  const subsidizes = row.maxInstallments > 1;
  const sShare = subsidizes ? Number(row.dilutionSharePct) : 0;
  const avista = quotePricing({ baseValueCents: row.baseValueCents, config, installments: 1, method: 'PIX', carpenterDilutionSharePct: sShare });
  const parc =
    nClient > 1
      ? quotePricing({ baseValueCents: row.baseValueCents, config, installments: subsidizes ? row.maxInstallments : 1, clientInstallments: nClient, method: 'CARD', carpenterDilutionSharePct: sShare })
      : null;

  const terms = {
    items: (row.lineItems as QuoteLineItem[]) ?? [],
    avistaCents: avista.displayedAmountCents,
    parceladoCents: parc?.displayedAmountCents ?? null,
    installmentValueCents: parc ? Math.round(parc.displayedAmountCents / nClient) : null,
    clientInstallments: nClient,
    milestones: DEFAULT_MILESTONES,
  };

  // Cria o contrato (1 por orçamento) ou reaproveita o existente.
  const hash = await ipHash();
  const [created] = await db
    .insert(contracts)
    .values({
      projectId: row.projectId,
      quoteId: row.quoteId,
      clientId: row.clientId,
      carpenterId: row.carpenterId,
      valueCents: avista.displayedAmountCents,
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
  if (!contractId) return { ok: false, error: 'Não foi possível gerar o contrato.' };

  await finalizeIfBothSigned(contractId);
  revalidatePath(`/pedidos/${row.projectId}`);
  revalidatePath(`/contratos/${contractId}`);
  return { ok: true, contractId };
}

/** Registra o aceite da parte logada no contrato. Fecha quando os dois assinam. */
export async function acceptContract(contractId: string): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const db = getDb();
  const [c] = await db
    .select({ clientId: contracts.clientId, carpenterId: contracts.carpenterId, status: contracts.status })
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);
  if (!c || (c.clientId !== profile.id && c.carpenterId !== profile.id)) {
    return { ok: false, error: 'Contrato não encontrado.' };
  }
  if (c.status !== 'DRAFT') return { ok: false, error: 'Este contrato não está aberto para aceite.' };

  const hash = await ipHash();
  const set =
    c.clientId === profile.id
      ? { acceptedByClientAt: sql`now()`, clientIpHash: hash }
      : { acceptedByCarpenterAt: sql`now()`, carpenterIpHash: hash };
  await db.update(contracts).set(set).where(eq(contracts.id, contractId));
  await finalizeIfBothSigned(contractId);
  revalidatePath(`/contratos/${contractId}`);
  return { ok: true };
}
