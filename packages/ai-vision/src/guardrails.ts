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

/**
 * Chave de cache da PRÉVIA: (imagem base + prompt final) → §8.7. Guardada junto da
 * foto gerada; se a mesma dupla voltar, reaproveitamos a imagem em vez de pagar
 * outra geração. Hash FNV-1a (rápido, sem dependência, roda em Node e em Workers) —
 * é chave de cache, não hash criptográfico.
 */
export function previewCacheKey(baseImageRef: string | null, prompt: string): string {
  return `${fnv1a(baseImageRef ?? '<sem-base>')}-${fnv1a(prompt)}-${prompt.length}`;
}

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export type RegenCheck = { allowed: boolean; remaining: number; message?: string };

/** Verifica se ainda há regenerações disponíveis na sessão. */
export function checkRegenLimit(used: number, limit: number = DEFAULT_REGEN_LIMIT): RegenCheck {
  const remaining = Math.max(0, limit - used);
  if (remaining <= 0) {
    // O limite é por PEDIDO (contamos as prévias já geradas nele), não por sessão.
    return { allowed: false, remaining: 0, message: `Você atingiu o limite de ${limit} prévias neste pedido. Fale com o suporte se precisar de mais.` };
  }
  return { allowed: true, remaining };
}
