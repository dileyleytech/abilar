'use server';

import { revalidatePath } from 'next/cache';
import { quoteInputSchema } from '@abilar/shared';
import { quotePricing } from '@abilar/pricing';
import { quotes, eq, and, sql } from '@abilar/db';
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

  // Elegibilidade: pedido aberto, na área e categoria do marceneiro.
  const eligible = await getProjectForCarpenter(projectId, carpenter);
  if (!eligible) return { ok: false, error: 'Pedido indisponível para orçamento.' };

  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const config = await getActivePricingConfig();
  if (!config) return { ok: false, error: 'Configuração de preço indisponível.' };
  if (d.dilutionSharePct < config.dilutionMinCarpenterSharePct) {
    return { ok: false, error: `A diluição mínima é ${config.dilutionMinCarpenterSharePct}%.` };
  }

  // Recalcula no pior caso (nº máx de parcelas = menor payout) e valida.
  const worst = quotePricing({
    baseValueCents: d.baseValueCents,
    config,
    installments: d.maxInstallments,
    method: d.maxInstallments > 1 ? 'CARD' : 'PIX',
    carpenterDilutionSharePct: d.dilutionSharePct,
    carpenterCostCents: d.carpenterCostCents,
  });
  if (!worst.valid) return { ok: false, error: worst.warnings[0] ?? 'Orçamento inválido.' };

  const db = getDb();
  await db
    .insert(quotes)
    .values({
      projectId,
      carpenterId: profile.id,
      baseValueCents: d.baseValueCents,
      carpenterCostCents: d.carpenterCostCents ?? null,
      maxInstallments: d.maxInstallments,
      dilutionSharePct: String(d.dilutionSharePct),
      note: d.note ?? null,
      status: 'SENT',
    })
    .onConflictDoUpdate({
      target: [quotes.projectId, quotes.carpenterId],
      set: {
        baseValueCents: d.baseValueCents,
        carpenterCostCents: d.carpenterCostCents ?? null,
        maxInstallments: d.maxInstallments,
        dilutionSharePct: String(d.dilutionSharePct),
        note: d.note ?? null,
        status: 'SENT',
        updatedAt: sql`now()`,
      },
    });

  revalidatePath(`/marceneiro/pedidos/${projectId}`);
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true };
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
