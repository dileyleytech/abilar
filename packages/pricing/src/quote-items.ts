// quote-items.ts — construtor de orçamento por itens (§7.6). PURO, em centavos.
// O custo é a soma das linhas; o valor do serviço (V) = custo + margem (lucro).
import { assertCents } from '@abilar/shared';

export interface QuoteItem {
  qty: number; // pode ser fracionária (ex.: 4,5 m²)
  unitCostCents: number; // custo unitário em centavos
}

export interface QuoteItemsResult {
  subtotalCostCents: number; // soma dos custos das linhas
  marginCents: number; // lucro do marceneiro (V − custo)
  baseValueCents: number; // V — valor do serviço cobrado (base do pricing)
}

const lineCost = (it: QuoteItem) => {
  assertCents(it.unitCostCents);
  if (!Number.isFinite(it.qty) || it.qty < 0) return 0;
  return Math.round(it.qty * it.unitCostCents);
};

/** Soma os itens e aplica a margem (% sobre o custo) para chegar no valor V. */
export function computeItemsBase(items: QuoteItem[], marginPct: number): QuoteItemsResult {
  const subtotalCostCents = items.reduce((acc, it) => acc + lineCost(it), 0);
  const pct = Number.isFinite(marginPct) && marginPct > 0 ? marginPct : 0;
  const baseValueCents = Math.round(subtotalCostCents * (1 + pct / 100));
  return {
    subtotalCostCents,
    marginCents: baseValueCents - subtotalCostCents,
    baseValueCents,
  };
}
