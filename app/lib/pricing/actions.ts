'use server';

import { revalidatePath } from 'next/cache';
import { pricingConfig, eq, sql } from '@abilar/db';
import { pricingConfigInputSchema, buildInstallmentTable } from '@abilar/pricing';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { GLOBAL_PRICING_KEY } from './config';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Atualiza a config GLOBAL de pricing (apenas ADMIN — defesa em profundidade +
 *  RLS). Valores financeiros só por configuração (regra de ouro #7). */
export async function updatePricingConfig(input: unknown): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  if (profile.role !== 'ADMIN') return { ok: false, error: 'Sem permissão.' };

  const parsed = pricingConfigInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }
  const d = parsed.data;

  await getDb()
    .update(pricingConfig)
    .set({
      clientCommissionPct: String(d.clientCommissionPct),
      carpenterCommissionPct: String(d.carpenterCommissionPct),
      architectCommissionPct: String(d.architectCommissionPct),
      dilutionMinCarpenterSharePct: String(d.dilutionMinCarpenterSharePct),
      dilutionPlatformMarginPct: String(d.dilutionPlatformMarginPct),
      pixFixedFeeCents: d.pixFixedFeeCents,
      installmentTable: buildInstallmentTable(d.installments),
      promoRules: d.promo ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(pricingConfig.key, GLOBAL_PRICING_KEY));

  revalidatePath('/admin/precos');
  return { ok: true };
}
