import { describe, it, expect } from 'vitest';
import { pricingConfigInputSchema, buildInstallmentTable, inputToPricingConfig } from './config-schema';
import { quotePricing } from './quote';

const validInput = {
  clientCommissionPct: 8,
  carpenterCommissionPct: 10,
  architectCommissionPct: 0,
  dilutionMinCarpenterSharePct: 50,
  dilutionPlatformMarginPct: 1,
  pixFixedFeeCents: 0,
  installments: [
    { n: 1, mdrPct: 0 },
    { n: 10, mdrPct: 4.5 },
  ],
};

describe('config-schema (admin de pricing)', () => {
  it('valida um input correto', () => {
    expect(pricingConfigInputSchema.parse(validInput).installments).toHaveLength(2);
  });

  it('rejeita percentual negativo e parcelas duplicadas', () => {
    expect(() => pricingConfigInputSchema.parse({ ...validInput, clientCommissionPct: -1 })).toThrow();
    expect(() =>
      pricingConfigInputSchema.parse({ ...validInput, installments: [{ n: 1, mdrPct: 0 }, { n: 1, mdrPct: 2 }] }),
    ).toThrow();
  });

  it('rejeita desconto no parcelado maior que a comissão do marceneiro (tm)', () => {
    expect(() =>
      pricingConfigInputSchema.parse({ ...validInput, carpenterCommissionPct: 5, carpenterInstallmentDiscountPct: 10 }),
    ).toThrow(/desconto/i);
    // igual ao tm é permitido (zera a comissão no parcelado)
    expect(
      pricingConfigInputSchema.parse({ ...validInput, carpenterCommissionPct: 5, carpenterInstallmentDiscountPct: 5 })
        .carpenterInstallmentDiscountPct,
    ).toBe(5);
  });

  it('buildInstallmentTable monta o Record por nº', () => {
    expect(buildInstallmentTable(validInput.installments)).toEqual({ 1: { mdrPct: 0 }, 10: { mdrPct: 4.5 } });
  });

  it('inputToPricingConfig produz um config que o motor consome (§5.3)', () => {
    const cfg = inputToPricingConfig(pricingConfigInputSchema.parse(validInput));
    const r = quotePricing({
      baseValueCents: 2_000_000,
      config: cfg,
      installments: 10,
      method: 'CARD',
      carpenterDilutionSharePct: 50,
    });
    expect(r.displayedAmountCents).toBe(2_230_200);
    expect(r.valid).toBe(true);
  });
});
