import 'server-only';
import { pricingConfig, eq } from '@abilar/db';
import type { PricingConfigRow } from '@abilar/db';
import type { PricingConfig, PricingConfigInput, PromoOverrides } from '@abilar/pricing';
import { getDb } from '@/lib/db';

export const GLOBAL_PRICING_KEY = 'GLOBAL';

type InstallmentTable = PricingConfig['installmentTable'];

/** Linha do banco → PricingConfig puro (para o motor). */
export function rowToPricingConfig(row: PricingConfigRow): PricingConfig {
  return {
    clientCommissionPct: Number(row.clientCommissionPct),
    carpenterCommissionPct: Number(row.carpenterCommissionPct),
    architectCommissionPct: Number(row.architectCommissionPct),
    installmentTable: (row.installmentTable ?? {}) as InstallmentTable,
    dilutionMinCarpenterSharePct: Number(row.dilutionMinCarpenterSharePct),
    dilutionPlatformMarginPct: Number(row.dilutionPlatformMarginPct),
    pixFixedFeeCents: row.pixFixedFeeCents,
    promo: (row.promoRules as PromoOverrides | null) ?? null,
  };
}

/** Linha do banco → valores do formulário admin. */
export function rowToForm(row: PricingConfigRow): PricingConfigInput {
  const table = (row.installmentTable ?? {}) as InstallmentTable;
  const installments = Object.entries(table)
    .map(([n, v]) => ({ n: Number(n), mdrPct: Number(v.mdrPct) }))
    .sort((a, b) => a.n - b.n);
  return {
    clientCommissionPct: Number(row.clientCommissionPct),
    carpenterCommissionPct: Number(row.carpenterCommissionPct),
    architectCommissionPct: Number(row.architectCommissionPct),
    dilutionMinCarpenterSharePct: Number(row.dilutionMinCarpenterSharePct),
    dilutionPlatformMarginPct: Number(row.dilutionPlatformMarginPct),
    pixFixedFeeCents: row.pixFixedFeeCents,
    installments,
    promo: (row.promoRules as PromoOverrides | null) ?? null,
  };
}

async function globalRow(): Promise<PricingConfigRow | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(pricingConfig)
    .where(eq(pricingConfig.key, GLOBAL_PRICING_KEY))
    .limit(1);
  return row;
}

/** Config GLOBAL ativa como PricingConfig (usada pelo motor na Fase 4). */
export async function getActivePricingConfig(): Promise<PricingConfig | null> {
  const row = await globalRow();
  return row ? rowToPricingConfig(row) : null;
}

/** Config GLOBAL como valores de formulário (para a tela admin). */
export async function getPricingConfigForm(): Promise<PricingConfigInput | null> {
  const row = await globalRow();
  return row ? rowToForm(row) : null;
}
