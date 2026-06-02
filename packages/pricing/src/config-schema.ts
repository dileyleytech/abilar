// config-schema.ts — validação (zod) da edição admin de taxas/promoções.
import { z } from 'zod';
import type { PricingConfig, PromoOverrides } from './types';

const pct = z.number().min(0, 'Não pode ser negativo').max(1000, 'Percentual alto demais');
const sharePct = z.number().min(0).max(100);

export const installmentRowInputSchema = z.object({
  n: z.number().int().min(1).max(36),
  mdrPct: z.number().min(0).max(100),
});

const promoInputSchema = z
  .object({
    clientCommissionPct: pct.optional(),
    carpenterCommissionPct: pct.optional(),
    architectCommissionPct: pct.optional(),
    dilutionMinCarpenterSharePct: sharePct.optional(),
    dilutionPlatformMarginPct: pct.optional(),
  })
  .strict();

export const pricingConfigInputSchema = z
  .object({
    clientCommissionPct: pct,
    carpenterCommissionPct: pct,
    architectCommissionPct: pct,
    dilutionMinCarpenterSharePct: sharePct,
    dilutionPlatformMarginPct: pct,
    pixFixedFeeCents: z.number().int().min(0),
    installments: z.array(installmentRowInputSchema).min(1, 'Inclua ao menos uma parcela'),
    promo: promoInputSchema.nullable().optional(),
  })
  .refine((d) => new Set(d.installments.map((r) => r.n)).size === d.installments.length, {
    path: ['installments'],
    message: 'Nº de parcelas duplicado',
  });

export type PricingConfigInput = z.infer<typeof pricingConfigInputSchema>;

/** Monta o installmentTable (Record) a partir da lista do formulário. */
export function buildInstallmentTable(rows: { n: number; mdrPct: number }[]): PricingConfig['installmentTable'] {
  const table: PricingConfig['installmentTable'] = {};
  for (const r of rows) table[r.n] = { mdrPct: r.mdrPct };
  return table;
}

/** Converte o input validado do admin no PricingConfig puro (para o motor). */
export function inputToPricingConfig(input: PricingConfigInput): PricingConfig {
  return {
    clientCommissionPct: input.clientCommissionPct,
    carpenterCommissionPct: input.carpenterCommissionPct,
    architectCommissionPct: input.architectCommissionPct,
    installmentTable: buildInstallmentTable(input.installments),
    dilutionMinCarpenterSharePct: input.dilutionMinCarpenterSharePct,
    dilutionPlatformMarginPct: input.dilutionPlatformMarginPct,
    pixFixedFeeCents: input.pixFixedFeeCents,
    promo: (input.promo as PromoOverrides | null | undefined) ?? null,
  };
}
