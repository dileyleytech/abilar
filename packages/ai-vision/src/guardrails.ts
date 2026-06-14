// guardrails.ts — qualidade e custo (§8.7). Puro.
// - cache por (imagem base + comando) para não regenerar o que já existe.
// - limite de regenerações por sessão (custo), com aviso amigável.
import type { DesignCommand } from './dsl';

/** Limite padrão de regenerações de imagem por sessão (custo). Ajustável via config. */
export const DEFAULT_REGEN_LIMIT = 20;

/** Serializa um objeto de forma determinística (chaves ordenadas). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/**
 * Chave de cache da geração: depende só da imagem base e da PARTE determinística
 * do comando (intent/alvo/params). `confidence`/`echo` não entram (não afetam a saída).
 */
export function cacheKey(baseImageRef: string, cmd: DesignCommand): string {
  const determinant = { intent: cmd.intent, target: cmd.targetModuleId, params: cmd.params };
  return `${baseImageRef}::${stableStringify(determinant)}`;
}

export type RegenCheck = { allowed: boolean; remaining: number; message?: string };

/** Verifica se ainda há regenerações disponíveis na sessão. */
export function checkRegenLimit(used: number, limit: number = DEFAULT_REGEN_LIMIT): RegenCheck {
  const remaining = Math.max(0, limit - used);
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, message: `Você atingiu o limite de ${limit} prévias nesta sessão. Aguarde ou fale com o suporte.` };
  }
  return { allowed: true, remaining };
}
