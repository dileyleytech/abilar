import { assertCents, type Cents } from '@abilar/shared';

/**
 * Distribui um total em centavos sobre pesos (ex.: percentuais dos marcos §2.7),
 * usando o método do maior resto — a soma das partes é EXATAMENTE o total
 * (nenhum centavo some ou aparece). Base do escrow por marco.
 *
 * NÃO contém regra de negócio (taxas/percentuais vêm de PricingConfig na Fase 3).
 */
export function allocateProportional(total: Cents, weights: number[]): Cents[] {
  assertCents(total);
  if (weights.length === 0) {
    throw new Error('allocateProportional: pesos vazios');
  }
  const sumW = weights.reduce((a, w) => {
    if (!(Number.isFinite(w) && w >= 0)) {
      throw new Error(`allocateProportional: peso inválido ${w}`);
    }
    return a + w;
  }, 0);
  if (sumW <= 0) {
    throw new Error('allocateProportional: soma dos pesos deve ser > 0');
  }

  const raw = weights.map((w) => (total * w) / sumW);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = total - floors.reduce((a, b) => a + b, 0);

  // Distribui os centavos restantes aos maiores restos fracionários.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (let k = 0; remainder > 0; k++, remainder--) {
    const idx = order[k % order.length]!.i;
    result[idx]!++;
  }
  return result;
}
