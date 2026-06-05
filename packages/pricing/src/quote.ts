// quote.ts — motor de pricing (§5). Função PURA, determinística, em centavos.
// Regras: nada hardcoded (tudo de PricingConfig); servidor recalcula sempre.
import { applyPercent, assertCents } from '@abilar/shared';
import type { PricingConfig, QuotePricingInput, QuotePricingResult } from './types';

/** Aplica overrides de promoção sobre a config base. */
export function resolvePricingConfig(config: PricingConfig): PricingConfig {
  return config.promo ? { ...config, ...config.promo } : config;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Máximo de parcelas que o sistema oferece ao cliente (maior N da tabela).
 *  É o "10x do sistema": o cliente sempre pode parcelar até aqui. */
export function maxClientInstallments(config: PricingConfig): number {
  const keys = Object.keys(config.installmentTable)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return keys.length ? Math.max(...keys) : 1;
}

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

  // Cartão. O cliente sempre parcela até nClient (máx do sistema); o marceneiro
  // só subsidia a taxa até o N dele (input.installments). A taxa REAL da
  // transação é a do nClient; a absorção do marceneiro tem como base a taxa do N
  // dele (teto), por isso são duas faixas distintas.
  const nCarp = input.installments; // teto do subsídio do marceneiro
  const nClient = input.clientInstallments ?? nCarp; // parcelas reais do cliente
  const rowClient = cfg.installmentTable[nClient];
  if (!rowClient) {
    warnings.push(`Sem taxa configurada para ${nClient}x.`);
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

  // O marceneiro só "perde dinheiro" se aceitou subsidiar (nCarp > 1). Nesse caso
  // valida a diluição s; senão, não há absorção nem incentivo (recebe o à vista).
  const subsidizes = nCarp > 1;
  const rowCarp = subsidizes ? cfg.installmentTable[nCarp] : undefined;
  const s = input.carpenterDilutionSharePct;
  if (subsidizes && (s < cfg.dilutionMinCarpenterSharePct || s > 100)) {
    valid = false;
    warnings.push(`Diluição deve estar entre ${cfg.dilutionMinCarpenterSharePct}% e 100%.`);
  }
  const sSafe = subsidizes ? clamp(s, 0, 100) : 0;

  // Incentivo: nas vendas PARCELADAS subsidiadas o marceneiro paga uma comissão
  // tm reduzida (desconto em pontos). Sem subsídio, mantém o tm cheio (= à vista).
  const discount = subsidizes ? (cfg.carpenterInstallmentDiscountPct ?? 0) : 0;
  const effTm = Math.max(0, tm - discount);
  const payoutBaseEff = V - applyPercent(V, effTm);

  // Base de subsídio: taxa do N do marceneiro (teto). Sem subsídio = 0.
  const subsidyBasis = rowCarp ? applyPercent(precoBase, rowCarp.mdrPct) : 0;
  const custoParcClient = applyPercent(precoBase, rowClient.mdrPct); // taxa real (nClient)
  const carpenterAbsorb = applyPercent(subsidyBasis, sSafe);
  const payoutParc = payoutBaseEff - carpenterAbsorb;
  const clientFromCusto = Math.max(0, custoParcClient - carpenterAbsorb);
  const platformMarginPortion = applyPercent(precoBase, cfg.dilutionPlatformMarginPct);
  const acrescimo = clientFromCusto + platformMarginPortion;
  const displayed = precoBase + acrescimo;
  const gatewayFee = applyPercent(displayed, rowClient.mdrPct);
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
