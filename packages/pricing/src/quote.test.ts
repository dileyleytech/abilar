import { describe, it, expect } from 'vitest';
import { quotePricing, resolvePricingConfig } from './quote';
import type { PricingConfig } from './types';

// Config base do exemplo trabalhado (§5.3).
const baseConfig: PricingConfig = {
  clientCommissionPct: 8, // tc
  carpenterCommissionPct: 10, // tm
  architectCommissionPct: 3, // a
  installmentTable: { 1: { mdrPct: 0 }, 10: { mdrPct: 4.5 } },
  dilutionMinCarpenterSharePct: 50,
  dilutionPlatformMarginPct: 1, // mp
  pixFixedFeeCents: 0,
};

const V = 2_000_000; // R$ 20.000,00

describe('quotePricing — §5 (motor de pricing, crítico)', () => {
  describe('exemplo trabalhado §5.3', () => {
    it('à vista (PIX)', () => {
      const r = quotePricing({
        baseValueCents: V,
        config: baseConfig,
        installments: 1,
        method: 'PIX',
        carpenterDilutionSharePct: 50,
      });
      expect(r.displayedAmountCents).toBe(2_160_000); // 20.000 × 1,08
      expect(r.carpenterPayoutCents).toBe(1_800_000); // 20.000 × 0,90
      expect(r.architectPayoutCents).toBe(60_000); // 20.000 × 0,03
      expect(r.gatewayFeeCents).toBe(0);
      expect(r.platformNetCents).toBe(300_000); // ≈ R$ 3.000
      expect(r.installmentDeltaCents).toBe(0);
      expect(r.valid).toBe(true);
    });

    it('parcelado 10x, s = 50%, mp = 1%', () => {
      const r = quotePricing({
        baseValueCents: V,
        config: baseConfig,
        installments: 10,
        method: 'CARD',
        carpenterDilutionSharePct: 50,
      });
      expect(r.displayedAmountCents).toBe(2_230_200); // 22.302,00
      expect(r.carpenterPayoutCents).toBe(1_751_400); // 17.514,00
      expect(r.architectPayoutCents).toBe(60_000);
      expect(r.gatewayFeeCents).toBe(100_359); // 22.302 × 0,045
      expect(r.platformNetCents).toBe(318_441); // 3.184,41
      expect(r.installmentDeltaCents).toBe(18_441); // +184,41
      expect(r.valid).toBe(true);
    });

    it('s = 100%: marceneiro absorve tudo, recebe ~17.028', () => {
      const r = quotePricing({
        baseValueCents: V,
        config: baseConfig,
        installments: 10,
        method: 'CARD',
        carpenterDilutionSharePct: 100,
      });
      expect(r.carpenterPayoutCents).toBe(1_702_800); // 18.000 − 972
      // cliente paga só a margem da plataforma sobre a base
      expect(r.displayedAmountCents).toBe(2_181_600); // 2.160.000 + 21.600
      expect(r.valid).toBe(true);
      expect(r.installmentDeltaCents).toBeGreaterThan(0);
    });
  });

  describe('diluição s (mín/máx)', () => {
    it('s no mínimo é válido', () => {
      const r = quotePricing({ baseValueCents: V, config: baseConfig, installments: 10, method: 'CARD', carpenterDilutionSharePct: 50 });
      expect(r.valid).toBe(true);
    });
    it('s abaixo do mínimo é inválido', () => {
      const r = quotePricing({ baseValueCents: V, config: baseConfig, installments: 10, method: 'CARD', carpenterDilutionSharePct: 40 });
      expect(r.valid).toBe(false);
      expect(r.warnings.join(' ')).toMatch(/Diluição/);
    });
    it('s acima de 100 é inválido', () => {
      const r = quotePricing({ baseValueCents: V, config: baseConfig, installments: 10, method: 'CARD', carpenterDilutionSharePct: 120 });
      expect(r.valid).toBe(false);
    });
  });

  describe('promoções', () => {
    it('promo zera a comissão do cliente', () => {
      const cfg: PricingConfig = { ...baseConfig, promo: { clientCommissionPct: 0 } };
      const r = quotePricing({ baseValueCents: V, config: cfg, installments: 1, method: 'PIX', carpenterDilutionSharePct: 50 });
      expect(r.displayedAmountCents).toBe(2_000_000); // sem taxa do cliente
      expect(r.valid).toBe(true);
    });
    it('resolvePricingConfig aplica overrides', () => {
      const cfg: PricingConfig = { ...baseConfig, promo: { carpenterCommissionPct: 0 } };
      expect(resolvePricingConfig(cfg).carpenterCommissionPct).toBe(0);
    });
  });

  describe('proteções (servidor é a fonte de verdade)', () => {
    it('margem negativa é rejeitada', () => {
      const cfg: PricingConfig = { ...baseConfig, clientCommissionPct: 0, carpenterCommissionPct: 0 };
      const r = quotePricing({ baseValueCents: V, config: cfg, installments: 1, method: 'PIX', carpenterDilutionSharePct: 50 });
      expect(r.valid).toBe(false);
      expect(r.warnings.join(' ')).toMatch(/Margem/);
    });

    it('payout abaixo do custo do marceneiro é rejeitado', () => {
      const r = quotePricing({
        baseValueCents: V,
        config: baseConfig,
        installments: 10,
        method: 'CARD',
        carpenterDilutionSharePct: 50,
        carpenterCostCents: 1_760_000, // > payout parcelado (1.751.400)
      });
      expect(r.valid).toBe(false);
      expect(r.warnings.join(' ')).toMatch(/custo/);
    });

    it('payout acima do custo é válido', () => {
      const r = quotePricing({
        baseValueCents: V,
        config: baseConfig,
        installments: 10,
        method: 'CARD',
        carpenterDilutionSharePct: 50,
        carpenterCostCents: 1_700_000,
      });
      expect(r.valid).toBe(true);
    });

    it('nº de parcelas sem taxa configurada é inválido', () => {
      const r = quotePricing({ baseValueCents: V, config: baseConfig, installments: 12, method: 'CARD', carpenterDilutionSharePct: 50 });
      expect(r.valid).toBe(false);
      expect(r.warnings.join(' ')).toMatch(/12x/);
    });
  });

  describe('incentivo: tm reduzido no parcelado (carpenterInstallmentDiscountPct)', () => {
    const cfg: PricingConfig = { ...baseConfig, carpenterInstallmentDiscountPct: 2 }; // tm 10% → 8% no parcelado

    it('à vista NÃO recebe o desconto (tm cheio)', () => {
      const r = quotePricing({ baseValueCents: V, config: cfg, installments: 1, method: 'PIX', carpenterDilutionSharePct: 50 });
      expect(r.carpenterPayoutCents).toBe(1_800_000); // 90% de V (tm cheio)
      expect(r.displayedAmountCents).toBe(2_160_000);
    });

    it('parcelado: marceneiro recebe +2% de V; a plataforma abre mão dessa margem', () => {
      const r = quotePricing({ baseValueCents: V, config: cfg, installments: 10, method: 'CARD', carpenterDilutionSharePct: 50 });
      expect(r.carpenterPayoutCents).toBe(1_791_400); // base tm 8% (1.840.000) − 48.600
      expect(r.displayedAmountCents).toBe(2_230_200); // cliente não muda
      expect(r.platformNetCents).toBe(278_441); // 318.441 − 40.000 (o incentivo)
      expect(r.installmentDeltaCents).toBe(-21_559); // ganha menos no parcelado, de propósito
      expect(r.valid).toBe(true);
    });

    it('soma continua fechando com o desconto', () => {
      const r = quotePricing({ baseValueCents: V, config: cfg, installments: 10, method: 'CARD', carpenterDilutionSharePct: 50 });
      expect(r.gatewayFeeCents + r.carpenterPayoutCents + r.architectPayoutCents + r.platformNetCents).toBe(r.displayedAmountCents);
    });

    it('desconto absurdo que leva a plataforma ao prejuízo é inválido', () => {
      // tc=0 + arquiteto 5% + desconto 50pp (tm→0): a plataforma fica negativa no parcelado.
      const big: PricingConfig = {
        ...baseConfig,
        clientCommissionPct: 0,
        architectCommissionPct: 5,
        carpenterInstallmentDiscountPct: 50,
      };
      const r = quotePricing({ baseValueCents: V, config: big, installments: 10, method: 'CARD', carpenterDilutionSharePct: 50 });
      expect(r.valid).toBe(false);
      expect(r.warnings.join(' ')).toMatch(/prejuízo/);
    });
  });

  describe('soma fecha (conservação de centavos)', () => {
    it('cliente pago = gateway + marceneiro + arquiteto + plataforma (10x)', () => {
      const r = quotePricing({ baseValueCents: V, config: baseConfig, installments: 10, method: 'CARD', carpenterDilutionSharePct: 50 });
      expect(r.gatewayFeeCents + r.carpenterPayoutCents + r.architectPayoutCents + r.platformNetCents).toBe(
        r.displayedAmountCents,
      );
    });
    it('à vista também fecha', () => {
      const r = quotePricing({ baseValueCents: V, config: baseConfig, installments: 1, method: 'PIX', carpenterDilutionSharePct: 50 });
      expect(r.gatewayFeeCents + r.carpenterPayoutCents + r.architectPayoutCents + r.platformNetCents).toBe(
        r.displayedAmountCents,
      );
    });
  });
});
