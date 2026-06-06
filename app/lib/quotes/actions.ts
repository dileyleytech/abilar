'use server';

import { revalidatePath } from 'next/cache';
import { quoteInputSchema } from '@abilar/shared';
import { quotePricing, maxClientInstallments, computeItemsBase } from '@abilar/pricing';
import { quotes, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { getCarpenterProfile } from '@/lib/carpenter/profile';
import { getProjectForCarpenter } from '@/lib/carpenter/feed';
import { getActivePricingConfig } from '@/lib/pricing/config';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Marceneiro envia (ou atualiza) um orçamento. O servidor recalcula o pricing
 *  e valida (regra de ouro #8: nunca confiar em valor vindo do cliente). */
export async function sendQuote(projectId: string, input: unknown): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  if (profile.role !== 'CARPENTER') return { ok: false, error: 'Apenas marceneiros.' };

  const carpenter = await getCarpenterProfile(profile.id);
  if (!carpenter) return { ok: false, error: 'Complete seu cadastro primeiro.' };

  const db = getDb();
  const [existingQuote] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.projectId, projectId), eq(quotes.carpenterId, profile.id)))
    .limit(1);

  if (existingQuote) {
    // Já tem orçamento → pode atualizar enquanto o pedido está em negociação.
    const [proj] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!proj) return { ok: false, error: 'Pedido não encontrado.' };
    if (proj.status !== 'OPEN_FOR_QUOTES' && proj.status !== 'IN_NEGOTIATION') {
      return { ok: false, error: 'Este pedido não está mais em negociação.' };
    }
  } else {
    // Novo orçamento: exige elegibilidade (pedido aberto, na área e categoria).
    const eligible = await getProjectForCarpenter(projectId, carpenter);
    if (!eligible) return { ok: false, error: 'Pedido indisponível para orçamento.' };
  }

  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const config = await getActivePricingConfig();
  if (!config) return { ok: false, error: 'Configuração de preço indisponível.' };

  // Construtor por itens (§7.6): se vier lineItems, o SERVIDOR recalcula V = custo
  // + margem (regra de ouro #8). Senão, usa o valor informado (modo "valor fechado").
  const hasItems = (d.lineItems?.length ?? 0) > 0;
  const items = hasItems ? computeItemsBase(d.lineItems!, d.marginPct ?? 0) : null;
  const baseValueCents = items ? items.baseValueCents : d.baseValueCents;
  const carpenterCostCents = items ? items.subtotalCostCents : (d.carpenterCostCents ?? null);
  if (baseValueCents <= 0) return { ok: false, error: 'Informe o valor do serviço (ou itens com custo).' };

  // O marceneiro só "perde dinheiro" se aceitou subsidiar (maxInstallments > 1);
  // só aí a diluição mínima se aplica.
  const subsidizes = d.maxInstallments > 1;
  if (subsidizes && d.dilutionSharePct < config.dilutionMinCarpenterSharePct) {
    return { ok: false, error: `A diluição mínima é ${config.dilutionMinCarpenterSharePct}%.` };
  }

  // Recalcula no cenário REAL: o cliente parcela no máx do sistema; o marceneiro
  // subsidia só até o N dele. É o pior caso de payout/margem — valida aqui.
  const nClient = maxClientInstallments(config);
  const worst = quotePricing({
    baseValueCents,
    config,
    installments: subsidizes ? d.maxInstallments : 1,
    clientInstallments: nClient,
    method: nClient > 1 ? 'CARD' : 'PIX',
    carpenterDilutionSharePct: subsidizes ? d.dilutionSharePct : 0,
    carpenterCostCents: carpenterCostCents ?? undefined,
  });
  if (!worst.valid) return { ok: false, error: worst.warnings[0] ?? 'Orçamento inválido.' };

  const lineItems = d.lineItems ?? [];
  await db
    .insert(quotes)
    .values({
      projectId,
      carpenterId: profile.id,
      baseValueCents,
      carpenterCostCents,
      maxInstallments: d.maxInstallments,
      dilutionSharePct: String(d.dilutionSharePct),
      note: d.note ?? null,
      lineItems,
      status: 'SENT',
    })
    .onConflictDoUpdate({
      target: [quotes.projectId, quotes.carpenterId],
      set: {
        baseValueCents,
        carpenterCostCents,
        maxInstallments: d.maxInstallments,
        dilutionSharePct: String(d.dilutionSharePct),
        note: d.note ?? null,
        lineItems,
        status: 'SENT',
        updatedAt: sql`now()`,
      },
    });

  revalidatePath(`/marceneiro/pedidos/${projectId}`);
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true };
}

export type QuotePreview = {
  avista: { youGetCents: number; clientPaysCents: number };
  parcelado: { youGetCents: number; clientPaysCents: number; installmentCents: number; n: number } | null;
  valid: boolean;
  warning?: string;
};

/** Calcula os cenários (à vista/parcelado) no SERVIDOR — a config de preço não
 *  vai para o navegador. Usado pelo preview ao vivo do construtor de orçamento. */
export async function previewQuote(input: {
  baseValueCents: number;
  maxInstallments: number;
  dilutionSharePct: number;
}): Promise<QuotePreview | null> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'CARPENTER') return null;
  const config = await getActivePricingConfig();
  if (!config) return null;

  const cents = Math.max(0, Math.round(input.baseValueCents));
  if (cents <= 0) return null;
  const nCarp = Math.max(1, Math.round(input.maxInstallments)); // teto do subsídio (interno)
  const subsidizes = nCarp > 1;
  const s = subsidizes ? Math.min(100, Math.max(0, input.dilutionSharePct)) : 0;
  const nClient = maxClientInstallments(config); // cliente sempre parcela no máx do sistema

  const avista = quotePricing({ baseValueCents: cents, config, installments: 1, method: 'PIX', carpenterDilutionSharePct: s });
  const parc =
    nClient > 1
      ? quotePricing({
          baseValueCents: cents,
          config,
          installments: subsidizes ? nCarp : 1,
          clientInstallments: nClient,
          method: 'CARD',
          carpenterDilutionSharePct: s,
        })
      : null;

  return {
    avista: { youGetCents: avista.carpenterPayoutCents, clientPaysCents: avista.displayedAmountCents },
    parcelado: parc
      ? {
          youGetCents: parc.carpenterPayoutCents,
          clientPaysCents: parc.displayedAmountCents,
          installmentCents: Math.round(parc.displayedAmountCents / nClient),
          n: nClient,
        }
      : null,
    valid: (parc ?? avista).valid,
    warning: (parc ?? avista).warnings[0],
  };
}

/** Remove o próprio orçamento (marceneiro). */
export async function withdrawQuote(projectId: string): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'CARPENTER') return { ok: false, error: 'Sem permissão.' };
  const db = getDb();
  await db.delete(quotes).where(and(eq(quotes.projectId, projectId), eq(quotes.carpenterId, profile.id)));
  revalidatePath(`/marceneiro/pedidos/${projectId}`);
  return { ok: true };
}
