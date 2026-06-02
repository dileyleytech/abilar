// quote.ts — motor de pricing (§5). Função PURA, determinística, em centavos.
// Regras: nada hardcoded (tudo de PricingConfig); servidor recalcula sempre.
import { applyPercent, assertCents } from '@abilar/shared';
import type { PricingConfig, QuotePricingInput, QuotePricingResult } from './types';

/** Aplica overrides de promoção sobre a config base. */
export function resolvePricingConfig(config: PricingConfig): PricingConfig {
  return config.promo ? { ...config, ...config.promo } : config;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Calcula o preço exibido ao cliente, o payout do marceneiro, repasse do
 * arquiteto, taxa da adquirente e a margem líquida da plataforma — à vista
 * (PIX/BOLETO) ou parcelado no cartão com diluição escolhida pelo marceneiro.
 */
export function quotePricing(input: QuotePricingInput): QuotePricingResult {
  assertCents(input.baseValueCents);
  const warnings: string[] = [];
  let valid = true;

  const cfg = resolvePricingConfig(input.config);
  const V = input.baseValueCents;
  const tc = cfg.clientCommissionPct;
  const tm = cfg.carpenterCommissionPct;
  const a = cfg.architectCommissionPct;
  const pixFixed = cfg.pixFixedFeeCents ?? 0;

  // Base (§5.2)
  const precoBase = V + applyPercent(V, tc);
  const payoutAvista = V - applyPercent(V, tm);
  const architectPayout = applyPercent(V, a);
  const platformNetAvista = applyPercent(V, tc) + applyPercent(V, tm) - architectPayout - pixFixed;

  if (platformNetAvista < 0) {
    valid = false;
    warnings.push('Margem da plataforma negativa.');
  }

  // À vista (PIX/BOLETO): sem MDR, sem diluição.
  if (input.method !== 'CARD') {
    if (input.carpenterCostCents != null && payoutAvista < input.carpenterCostCents) {
      valid = false;
      warnings.push('Pagamento ao marceneiro abaixo do custo informado.');
    }
    return {
      displayedAmountCents: precoBase,
      carpenterPayoutCents: payoutAvista,
      architectPayoutCents: architectPayout,
      gatewayFeeCents: pixFixed,
      platformNetCents: platformNetAvista,
      installmentDeltaCents: 0,
      valid,
      warnings,
    };
  }

  // Cartão: precisa de taxa configurada para n.
  const n = input.installments;
  const row = cfg.installmentTable[n];
  if (!row) {
    warnings.push(`Sem taxa configurada para ${n}x.`);
    return {
      displayedAmountCents: precoBase,
      carpenterPayoutCents: payoutAvista,
      architectPayoutCents: architectPayout,
      gatewayFeeCents: 0,
      platformNetCents: platformNetAvista,
      installmentDeltaCents: 0,
      valid: false,
      warnings,
    };
  }

  // Diluição escolhida pelo marceneiro.
  const s = input.carpenterDilutionSharePct;
  if (s < cfg.dilutionMinCarpenterSharePct || s > 100) {
    valid = false;
    warnings.push(`Diluição deve estar entre ${cfg.dilutionMinCarpenterSharePct}% e 100%.`);
  }
  const sSafe = clamp(s, 0, 100);

  // Incentivo: nas vendas PARCELADAS o marceneiro paga uma comissão tm reduzida
  // (desconto em pontos). À vista mantém o tm cheio. Default 0 (sem incentivo).
  const discount = cfg.carpenterInstallmentDiscountPct ?? 0;
  const effTm = Math.max(0, tm - discount);
  const payoutBaseEff = V - applyPercent(V, effTm);

  const custoParc = applyPercent(precoBase, row.mdrPct);
  const carpenterAbsorb = applyPercent(custoParc, sSafe);
  const payoutParc = payoutBaseEff - carpenterAbsorb;
  const clientFromCusto = custoParc - carpenterAbsorb; // (1 - s) * custoParc
  const platformMarginPortion = applyPercent(precoBase, cfg.dilutionPlatformMarginPct);
  const acrescimo = clientFromCusto + platformMarginPortion;
  const displayed = precoBase + acrescimo;
  const gatewayFee = applyPercent(displayed, row.mdrPct);
  const platformNetParc = displayed - gatewayFee - payoutParc - architectPayout;
  const delta = platformNetParc - platformNetAvista; // pode ser < 0 (incentivo)

  // Com o incentivo a plataforma pode abrir mão de margem no parcelado de
  // propósito — só barramos se ela ficar no PREJUÍZO absoluto.
  if (platformNetParc < 0) {
    valid = false;
    warnings.push('Parcelamento deixa a plataforma no prejuízo.');
  }
  if (input.carpenterCostCents != null && payoutParc < input.carpenterCostCents) {
    valid = false;
    warnings.push('Pagamento ao marceneiro abaixo do custo informado.');
  }

  return {
    displayedAmountCents: displayed,
    carpenterPayoutCents: payoutParc,
    architectPayoutCents: architectPayout,
    gatewayFeeCents: gatewayFee,
    platformNetCents: platformNetParc,
    installmentDeltaCents: delta,
    valid,
    warnings,
  };
}
