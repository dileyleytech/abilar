// nlu.ts — NLU do chat de design (§8.4). Converte fala livre PT-BR em DesignCommand.
// Regra de ouro #6: todo LLM é Gemini (3.1 Flash-Lite, function calling), atrás de
// interface trocável. O `mockNluProvider` é determinístico (heurístico) para CI/dev
// sem chave; em produção, com GEMINI_API_KEY, usa-se o provider Gemini.
import {
  parseDesignCommand, type DesignCommand,
  DESIGN_INTENTS, DIMENSION_AXES, ITEM_TYPES, ITEM_POSITIONS, HARDWARE,
} from './dsl';

export type NluInput = {
  /** Texto livre do usuário (ou transcrição de áudio). */
  utterance: string;
  /** IDs de módulos do projeto, para o NLU resolver o alvo (opcional). */
  moduleIds?: string[];
};

export interface NluProvider {
  readonly name: string;
  interpret(input: NluInput): Promise<DesignCommand>;
}

const FINISH_WORDS: Record<string, string> = {
  verde: 'Verde', branco: 'Branco TX', preto: 'Preto Fosco', carvalho: 'Carvalho Hanover',
  cinza: 'Cinza', amadeirado: 'Amadeirado',
};

function num(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1]!.replace(',', '.')) : null;
}

/** Parser heurístico determinístico (sem rede). Cobre os comandos mais comuns. */
function interpretMock(input: NluInput): DesignCommand {
  const t = input.utterance.toLowerCase();
  const add = /(adicion|coloc|p[õo]e|bota|mais|inclu)/.test(t);
  const remove = /(remov|tira|exclu|sem )/.test(t);
  const pos = /embaixo|inferior/.test(t) ? 'INFERIOR' : /em cima|superior/.test(t) ? 'SUPERIOR' : undefined;

  // Iluminação
  if (/(led|ilumina|luz)/.test(t)) {
    return parseDesignCommand({ intent: 'ADD_LIGHTING', params: { lighting: 'FITA_LED_PRATELEIRAS' }, confidence: 0.8, echo: 'Adicionei iluminação em LED.' });
  }
  // Ferragem
  if (/soft.?close/.test(t)) return parseDesignCommand({ intent: 'CHANGE_HARDWARE', params: { hardware: 'SOFT_CLOSE' }, confidence: 0.85, echo: 'Troquei a ferragem para soft-close.' });
  if (/push/.test(t)) return parseDesignCommand({ intent: 'CHANGE_HARDWARE', params: { hardware: 'PUSH' }, confidence: 0.85, echo: 'Troquei para abertura por toque (push).' });
  if (/puxador|cava/.test(t)) return parseDesignCommand({ intent: 'CHANGE_HARDWARE', params: { hardware: 'PUXADOR_CAVA' }, confidence: 0.85, echo: 'Troquei para puxador cava.' });

  // Itens (gaveta/porta/prateleira/cabideiro)
  const itemType = /gaveta/.test(t) ? 'GAVETA' : /porta/.test(t) ? 'PORTA' : /prateleira/.test(t) ? 'PRATELEIRA' : /cabideiro/.test(t) ? 'CABIDEIRO' : null;
  if (itemType && remove) {
    return parseDesignCommand({ intent: 'REMOVE_ITEM', params: { item: { type: itemType, qty: 1, position: pos } }, confidence: 0.8, echo: `Removi ${itemType.toLowerCase()}.` });
  }
  if (itemType && add) {
    const qty = num(t) ?? 1;
    return parseDesignCommand({ intent: 'ADD_ITEM', params: { item: { type: itemType, qty, position: pos } }, confidence: 0.8, echo: `Adicionei ${qty} ${itemType.toLowerCase()}.` });
  }

  // Redimensionar
  if (/(aument|estend|along|maior|diminu|menor|reduz|encolh|altura|largura|profund)/.test(t) && num(t) != null) {
    const axis = /largura|largo/.test(t) ? 'WIDTH' : /profund|fundo/.test(t) ? 'DEPTH' : 'HEIGHT';
    const cm = num(t)!;
    const signed = /(diminu|menor|reduz|encolh)/.test(t) ? -cm : cm;
    return parseDesignCommand({ intent: 'RESIZE', params: { dimension: { axis, deltaMm: Math.round(signed * 10) } }, confidence: 0.75, echo: `Ajustei ${axis === 'WIDTH' ? 'a largura' : axis === 'DEPTH' ? 'a profundidade' : 'a altura'} em ${cm} cm.` });
  }

  // Material
  if (/material|mdf|compensad|mff|melamina/.test(t)) {
    const mat = t.match(/mdf\s*\d+\s*mm/)?.[0]?.toUpperCase().replace(/\s+/g, ' ') ?? 'MDF 18mm';
    return parseDesignCommand({ intent: 'CHANGE_MATERIAL', params: { material: mat }, confidence: 0.7, echo: `Troquei o material para ${mat}.` });
  }

  // Acabamento / cor
  const finishKey = Object.keys(FINISH_WORDS).find((k) => t.includes(k));
  if (finishKey || /acabamento|cor|tom/.test(t)) {
    const finish = finishKey ? FINISH_WORDS[finishKey]! : 'Carvalho Hanover';
    return parseDesignCommand({ intent: 'CHANGE_FINISH', params: { finish }, confidence: 0.7, echo: `Troquei o acabamento para ${finish}.` });
  }

  // Desfazer
  if (/desfaz|desfa[çz]|volta|undo|cancela/.test(t)) {
    return parseDesignCommand({ intent: 'UNDO', confidence: 0.9, echo: 'Desfiz a última alteração.' });
  }

  // Ambíguo
  return parseDesignCommand({ intent: 'ASK_HELP', confidence: 0.2, clarificationNeeded: true, echo: 'Não entendi bem — você quer mudar a cor, o tamanho, ou adicionar algo?' });
}

export const mockNluProvider: NluProvider = {
  name: 'mock',
  async interpret(input) {
    return interpretMock(input);
  },
};

// ── Provider Gemini (3.1 Flash-Lite, function calling) ──────────────────────
// Regra de ouro #6: todo LLM é Gemini. A chave vem de env (.env.local / binding),
// NUNCA do código. Modelo configurável via GEMINI_NLU_MODEL.

export const DEFAULT_NLU_MODEL = 'gemini-flash-lite-latest';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiNluOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /** Injetável para testes (default: fetch global). */
  fetchImpl?: typeof fetch;
};

const SYSTEM_PROMPT = [
  'Você é o NLU do chat de design da Abilar (marcenaria sob demanda).',
  'Converta a fala do cliente em UM comando de marcenaria chamando a função emit_design_command.',
  'Sempre chame a função. Preencha "echo" em PT-BR com "o que entendi" (frase curta e gentil).',
  'Se a intenção for ambígua ou faltar dado essencial, use intent ASK_HELP e clarificationNeeded=true.',
  'NUNCA invente medidas; medidas só via RESIZE quando o cliente disser um valor explícito.',
  'confidence é de 0 a 1.',
].join(' ');

const FUNCTION_DECLARATION = {
  name: 'emit_design_command',
  description: 'Registra o comando de marcenaria entendido a partir da fala do cliente.',
  parameters: {
    type: 'OBJECT',
    properties: {
      intent: { type: 'STRING', enum: [...DESIGN_INTENTS] },
      targetModuleId: { type: 'STRING', description: "uuid do módulo alvo, 'ALL' para todos, ou vazio se indefinido" },
      params: {
        type: 'OBJECT',
        properties: {
          finish: { type: 'STRING' },
          material: { type: 'STRING' },
          dimension: {
            type: 'OBJECT',
            properties: {
              axis: { type: 'STRING', enum: [...DIMENSION_AXES] },
              deltaMm: { type: 'INTEGER' },
              absoluteMm: { type: 'INTEGER' },
            },
          },
          item: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: [...ITEM_TYPES] },
              qty: { type: 'INTEGER' },
              position: { type: 'STRING', enum: [...ITEM_POSITIONS] },
            },
          },
          hardware: { type: 'STRING', enum: [...HARDWARE] },
          lighting: { type: 'STRING' },
        },
      },
      confidence: { type: 'NUMBER' },
      clarificationNeeded: { type: 'BOOLEAN' },
      echo: { type: 'STRING' },
    },
    required: ['intent', 'echo'],
  },
} as const;

const ASK_HELP_FALLBACK = (): DesignCommand =>
  parseDesignCommand({ intent: 'ASK_HELP', confidence: 0.2, clarificationNeeded: true, echo: 'Não entendi bem — pode dizer de outro jeito o que quer mudar?' });

/** Normaliza targetModuleId vindo do modelo ('' → null; valor inválido → null). */
function sanitizeTarget(v: unknown): string | null {
  if (v === 'ALL') return 'ALL';
  if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) return v;
  return null;
}

/** Extrai os args da function call da resposta do Gemini (v1beta generateContent). */
function extractFunctionArgs(json: unknown): Record<string, unknown> | null {
  const parts = (json as { candidates?: { content?: { parts?: { functionCall?: { args?: unknown } }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  const call = parts?.find((p) => p.functionCall)?.functionCall;
  return call?.args && typeof call.args === 'object' ? (call.args as Record<string, unknown>) : null;
}

export function createGeminiNluProvider(opts: GeminiNluOptions | string): NluProvider {
  const o: GeminiNluOptions = typeof opts === 'string' ? { apiKey: opts } : opts;
  const model = o.model || DEFAULT_NLU_MODEL;
  const baseUrl = o.baseUrl || DEFAULT_BASE_URL;
  const doFetch = o.fetchImpl ?? fetch;

  return {
    name: 'gemini',
    async interpret(input) {
      const userText = input.moduleIds?.length
        ? `${input.utterance}\n\n(IDs de módulos disponíveis: ${input.moduleIds.join(', ')})`
        : input.utterance;
      const body = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        tools: [{ functionDeclarations: [FUNCTION_DECLARATION] }],
        toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['emit_design_command'] } },
      };
      try {
        const res = await doFetch(`${baseUrl}/models/${model}:generateContent?key=${o.apiKey}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) return ASK_HELP_FALLBACK();
        const args = extractFunctionArgs(await res.json());
        if (!args) return ASK_HELP_FALLBACK();
        return parseDesignCommand({ ...args, targetModuleId: sanitizeTarget(args.targetModuleId) });
      } catch {
        // Rede/parse/validação falhou → não quebra o chat; pede esclarecimento.
        return ASK_HELP_FALLBACK();
      }
    },
  };
}

/** Resolve o provider de NLU: Gemini quando há chave; senão o mock determinístico. */
export function resolveNluProvider(env: { GEMINI_API_KEY?: string; GEMINI_NLU_MODEL?: string }): NluProvider {
  return env.GEMINI_API_KEY
    ? createGeminiNluProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_NLU_MODEL })
    : mockNluProvider;
}
