import { describe, it, expect } from 'vitest';
import { materialInputSchema } from './domain';

describe('materialInputSchema — catálogo de custo (§7.6)', () => {
  const base = { name: 'Chapa MDF 18mm Branco', category: 'CHAPA', unit: 'M2', unitCostCents: 12000 };

  it('aceita um material válido (custo em centavos)', () => {
    expect(materialInputSchema.safeParse(base).success).toBe(true);
    expect(materialInputSchema.safeParse({ ...base, sku: 'MDF-18-BR', supplier: 'Leo Madeiras' }).success).toBe(true);
  });

  it('rejeita custo negativo e não-inteiro (centavos)', () => {
    expect(materialInputSchema.safeParse({ ...base, unitCostCents: -1 }).success).toBe(false);
    expect(materialInputSchema.safeParse({ ...base, unitCostCents: 120.5 }).success).toBe(false);
  });

  it('rejeita categoria/unidade inválidas e nome curto', () => {
    expect(materialInputSchema.safeParse({ ...base, category: 'XPTO' }).success).toBe(false);
    expect(materialInputSchema.safeParse({ ...base, unit: 'KG' }).success).toBe(false);
    expect(materialInputSchema.safeParse({ ...base, name: 'x' }).success).toBe(false);
  });
});
