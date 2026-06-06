import { describe, it, expect } from 'vitest';
import { computeItemsBase } from './quote-items';

describe('computeItemsBase — construtor de orçamento por itens (§7.6)', () => {
  it('soma o custo das linhas (qty fracionária) e aplica a margem', () => {
    // 4,5 m² × R$120,00 = R$540,00 ; 12 un × R$3,50 = R$42,00 ; 8 h × R$50 = R$400
    const r = computeItemsBase(
      [
        { qty: 4.5, unitCostCents: 12000 },
        { qty: 12, unitCostCents: 350 },
        { qty: 8, unitCostCents: 5000 },
      ],
      30, // 30% de margem
    );
    expect(r.subtotalCostCents).toBe(54000 + 4200 + 40000); // 98.200
    expect(r.baseValueCents).toBe(Math.round(98200 * 1.3)); // 127.660
    expect(r.marginCents).toBe(r.baseValueCents - r.subtotalCostCents);
  });

  it('margem 0 = valor igual ao custo', () => {
    const r = computeItemsBase([{ qty: 2, unitCostCents: 10000 }], 0);
    expect(r.subtotalCostCents).toBe(20000);
    expect(r.baseValueCents).toBe(20000);
    expect(r.marginCents).toBe(0);
  });

  it('sem itens = tudo zero; margem negativa é tratada como 0', () => {
    expect(computeItemsBase([], 50).baseValueCents).toBe(0);
    expect(computeItemsBase([{ qty: 1, unitCostCents: 1000 }], -10).baseValueCents).toBe(1000);
  });
});
