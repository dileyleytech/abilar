// dimension.ts — dimensão física é SEMPRE inteiro em milímetros (regra de ouro #5).
// O banco guarda mm; a UI exibe em cm. Estes helpers são puros.

/** Milímetros inteiros. */
export type Mm = number;

export class DimensionError extends Error {}

/** Garante mm inteiro positivo. */
export function assertMm(value: number): asserts value is Mm {
  if (!Number.isInteger(value)) {
    throw new DimensionError(`Dimensão (mm) deve ser inteiro, recebido: ${value}`);
  }
  if (value <= 0) {
    throw new DimensionError(`Dimensão (mm) deve ser positiva, recebido: ${value}`);
  }
}

/** cm (UI) -> mm (armazenamento), arredondando para o mm mais próximo. */
export function cmToMm(cm: number): Mm {
  if (!Number.isFinite(cm) || cm <= 0) {
    throw new DimensionError(`Valor em cm inválido: ${cm}`);
  }
  return Math.round(cm * 10);
}

/** mm (armazenamento) -> cm (UI). */
export function mmToCm(mm: Mm): number {
  assertMm(mm);
  return mm / 10;
}

/** Formata mm como cm para a UI (ex.: 2400 -> "240 cm"). */
export function formatCm(mm: Mm): string {
  assertMm(mm);
  const cm = mm / 10;
  const str = Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
  return `${str} cm`;
}

/** Valida se uma medida em mm é válida (inteiro positivo). Sem limite máximo. */
export function isValidMm(mm: number): boolean {
  return Number.isInteger(mm) && mm > 0;
}

/** Valida uma medida em cm vinda da UI; devolve a mensagem de erro ou null.
 *  Só exige que seja um número positivo — não há limite de tamanho. */
export function dimensionCmError(cm: number): string | null {
  if (!Number.isFinite(cm) || cm <= 0) return 'Informe a medida em cm';
  return null;
}
