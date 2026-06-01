// money.ts — dinheiro é SEMPRE inteiro em centavos (regra de ouro #4).
// Nunca usar float para dinheiro. Estes helpers são puros e determinísticos.

/** Centavos como inteiro. Em colunas Postgres é BIGINT; aqui usamos `number`
 *  (seguro até 2^53 ≈ R$ 90 trilhões) para cálculo, e BIGINT no banco. */
export type Cents = number;

export class MoneyError extends Error {}

/** Garante que um valor é centavos inteiros válidos (>= 0, sem fração). */
export function assertCents(value: number): asserts value is Cents {
  if (!Number.isInteger(value)) {
    throw new MoneyError(`Centavos devem ser inteiros, recebido: ${value}`);
  }
  if (value < 0) {
    throw new MoneyError(`Centavos não podem ser negativos, recebido: ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Centavos fora do intervalo seguro: ${value}`);
  }
}

/** Converte reais (number) para centavos inteiros, arredondando half-up. */
export function reaisToCents(reais: number): Cents {
  if (!Number.isFinite(reais)) {
    throw new MoneyError(`Valor em reais inválido: ${reais}`);
  }
  // Arredondamento explícito e testado (evita 1.005 * 100 = 100.499...).
  return Math.round((reais + Number.EPSILON) * 100);
}

/** Formata centavos como moeda BR (R$ 1.234,56). UI sempre exibe assim. */
export function formatBRL(cents: Cents): string {
  assertCents(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/** Aplica um percentual (ex.: 12.5) a um valor em centavos, arredondando half-up.
 *  Regras financeiras NUNCA são hardcoded — o percentual vem de PricingConfig. */
export function applyPercent(cents: Cents, percent: number): Cents {
  assertCents(cents);
  if (!Number.isFinite(percent) || percent < 0) {
    throw new MoneyError(`Percentual inválido: ${percent}`);
  }
  return Math.round((cents * percent) / 100);
}

/** Soma uma lista de centavos com validação. */
export function sumCents(values: Cents[]): Cents {
  return values.reduce((acc, v) => {
    assertCents(v);
    return acc + v;
  }, 0);
}
