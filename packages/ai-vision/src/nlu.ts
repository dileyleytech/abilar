// nlu.ts — NLU do chat de design (§8.4). Converte fala livre PT-BR em um LOTE de
// comandos (uma fala pode conter várias mudanças). Regra de ouro #6: todo LLM é
// Gemini (function calling), atrás de interface trocável. Mock determinístico p/ CI.
import {
  parseDesignBatch, type DesignBatch, type CommandItem,
  DESIGN_INTENTS, DIMENSION_AXES, ITEM_TYPES, ITEM_POSITIONS, HARDWARE,
} from './dsl';
import {
  GLOSSARY_FOR_PROMPT, NLU_EXAMPLES, detectGrid, detectHardware, detectItemType,
  mentionsNiche, mentionsTop, normalizeFinish, wantsOpenFront,
} from './lexicon';

export type NluInput = {
  /** Texto livre do usuário (ou transcrição de áudio). */
  utterance: string;
  /** IDs de módulos do projeto, para o NLU resolver o alvo (opcional). */
  moduleIds?: string[];
};

export interface NluProvider {
  readonly name: string;
  interpret(input: NluInput): Promise<DesignBatch>;
}

function num(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1]!.replace(',', '.')) : null;
}

/** Monta um lote a partir de um único comando heurístico. */
function one(intent: CommandItem['intent'], params: CommandItem['params'], echo: string, confidence = 0.8): DesignBatch {
  return parseDesignBatch({ commands: [{ intent, targetModuleId: null, params }], echo, confidence });
}

function batch(commands: CommandItem[], echo: string, confidence = 0.8): DesignBatch {
  return parseDesignBatch({ commands, echo, confidence });
}

/**
 * Parser determinístico (sem rede), apoiado no léxico PT-BR. É o fallback de CI e
 * de dev sem chave — em produção quem interpreta é o Gemini, com o MESMO glossário
 * no system prompt. Cobre os pedidos mais comuns, incluindo estrutura (nichos,
 * colmeia, frente aberta, grade linhas × colunas).
 */
function interpretMock(input: NluInput): DesignBatch {
  const raw = input.utterance.trim();
  const t = raw.toLowerCase();
  const add = /(adicion|coloc|p[õo]e|bota|mais|inclu|quero|gostaria|faz|cria)/.test(t);
  const remove = /(remov|tira|exclu|sem |nada de|n[ãa]o quero)/.test(t);
  const pos = /embaixo|inferior|base/.test(t) ? 'INFERIOR' : /em cima|superior|topo/.test(t) ? 'SUPERIOR' : undefined;

  const grid = detectGrid(raw);
  const nicho = mentionsNiche(raw);
  const aberto = wantsOpenFront(raw);
  const cor = normalizeFinish(raw);
  const temMaterial = /mdf|mdp|compensad|melamina|laminad/.test(t);

  // "organiza/divide/reparte assim" = arranjo, mesmo sem falar em nicho.
  const organiza = /(organiz|layout|divis|dividi|reparti|distribu|arranj|disposi)/.test(t);

  // ── Estrutura: nichos / colmeia / frente aberta / grade ────────────────────
  if (grid || nicho || aberto || organiza) {
    const partes: string[] = [];
    if (nicho) partes.push('nichos abertos');
    if (grid) partes.push(`em grade de ${grid.rows} por ${grid.columns}`);
    if (mentionsTop(raw)) partes.push('com bancada lisa no topo');
    if (aberto && !nicho) partes.push('frente aberta, sem portas');
    if (organiza && partes.length === 0) partes.push(raw);

    const cmds: CommandItem[] = [{
      intent: 'CHANGE_LAYOUT',
      targetModuleId: null,
      params: {
        layout: {
          description: (partes.join(', ') || raw).slice(0, 160),
          ...(grid ?? {}),
          // "organiza assim" sozinho não diz nada sobre porta: não mexe na frente.
          ...(aberto || nicho || grid ? { openFront: true } : {}),
        },
      },
    }];
    // "em MDF cinza escuro" no mesmo pedido: material e cor são comandos próprios.
    if (temMaterial) cmds.push({ intent: 'CHANGE_MATERIAL', targetModuleId: null, params: { material: materialFrom(t) } });
    if (cor) cmds.push({ intent: 'CHANGE_FINISH', targetModuleId: null, params: { finish: cor } });

    const echo = grid
      ? `Deixei a frente aberta, com ${grid.rows} andares de ${grid.columns} nichos.`
      : nicho ? 'Troquei para nichos abertos.'
      : aberto ? 'Removi as portas: a frente fica aberta.'
      : 'Reorganizei o móvel como você pediu.';
    return batch(cmds, echo, 0.85);
  }

  // ── Ferragem ──────────────────────────────────────────────────────────────
  const ferragem = detectHardware(raw);
  if (ferragem) {
    const label = ferragem === 'SOFT_CLOSE' ? 'soft-close' : ferragem === 'PUSH' ? 'abertura por toque (push)' : 'puxador cava';
    return one('CHANGE_HARDWARE', { hardware: ferragem as 'PUSH' }, `Troquei a ferragem para ${label}.`, 0.85);
  }

  if (/(led|ilumina|luz|fita)/.test(t)) return one('ADD_LIGHTING', { lighting: 'FITA_LED_PRATELEIRAS' }, 'Adicionei iluminação em LED.');

  // ── Itens ─────────────────────────────────────────────────────────────────
  const itemType = detectItemType(raw);
  if (itemType && remove) return one('REMOVE_ITEM', { item: { type: itemType as 'GAVETA', qty: 1, position: pos } }, `Removi ${itemType.toLowerCase()}.`);
  if (itemType && add) {
    const qty = num(t) ?? 1;
    return one('ADD_ITEM', { item: { type: itemType as 'GAVETA', qty, position: pos } }, `Adicionei ${qty} ${itemType.toLowerCase()}.`);
  }

  // ── Medidas ───────────────────────────────────────────────────────────────
  if (/(aument|estend|along|maior|diminu|menor|reduz|encolh|altura|largura|profund|fundo)/.test(t) && num(t) != null) {
    const axis = /largura|largo/.test(t) ? 'WIDTH' : /profund|fundo/.test(t) ? 'DEPTH' : 'HEIGHT';
    const cm = num(t)!;
    const signed = /(diminu|menor|reduz|encolh)/.test(t) ? -cm : cm;
    return one('RESIZE', { dimension: { axis, deltaMm: Math.round(signed * 10) } }, `Ajustei ${axis === 'WIDTH' ? 'a largura' : axis === 'DEPTH' ? 'a profundidade' : 'a altura'} em ${cm} cm.`, 0.75);
  }

  // ── Material e cor ────────────────────────────────────────────────────────
  if (temMaterial && cor) {
    return batch([
      { intent: 'CHANGE_MATERIAL', targetModuleId: null, params: { material: materialFrom(t) } },
      { intent: 'CHANGE_FINISH', targetModuleId: null, params: { finish: cor } },
    ], `Troquei para ${materialFrom(t)} em ${cor}.`, 0.8);
  }
  if (temMaterial) return one('CHANGE_MATERIAL', { material: materialFrom(t) }, `Troquei o material para ${materialFrom(t)}.`, 0.7);
  if (cor) return one('CHANGE_FINISH', { finish: cor }, `Troquei o acabamento para ${cor}.`, 0.75);

  if (/desfaz|desfa[çz]|volta|undo|cancela/.test(t)) return one('UNDO', {}, 'Desfiz a última alteração.', 0.9);

  return parseDesignBatch({ commands: [], confidence: 0.2, clarificationNeeded: true, echo: 'Não entendi bem — você quer mudar a cor, o tamanho, ou como o móvel é dividido por dentro?' });
}

function materialFrom(t: string): string {
  const m = t.match(/mdf\s*\d+\s*mm/)?.[0]?.toUpperCase().replace(/\s+/g, ' ');
  if (m) return m;
  if (/mdp/.test(t)) return 'MDP 18mm';
  if (/compensad/.test(t)) return 'Compensado 18mm';
  return 'MDF 18mm';
}

export const mockNluProvider: NluProvider = {
  name: 'mock',
  async interpret(input) {
    return interpretMock(input);
  },
};

// ── Provider Gemini (function calling) ───────────────────────────────────────
export const DEFAULT_NLU_MODEL = 'gemini-flash-lite-latest';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiNluOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const SYSTEM_PROMPT = [
  'Você é o NLU do chat de design da Abilar (marcenaria sob demanda).',
  'Uma fala pode conter VÁRIAS mudanças — chame a função emit_design_commands UMA vez,',
  'preenchendo a lista "commands" com UM comando para CADA mudança entendida.',
  'Medidas: o cliente fala em cm; converta para MILÍMETROS (cm × 10) em absoluteMm/deltaMm.',
  'Se ele der as 3 medidas (ex.: "80x120x35"), emita TRÊS comandos RESIZE: WIDTH=800, HEIGHT=1200, DEPTH=350 (absoluteMm).',
  'Como o móvel é ORGANIZADO por dentro (o que fica embaixo/em cima, quantas divisões) = CHANGE_LAYOUT,',
  'com params.layout descrevendo o arranjo em PT-BR, curto e SEM medidas (medida é RESIZE).',
  'Remover algo (espelho, porta, gaveta) = REMOVE_ITEM. "Toda fechada"/portas = ADD_ITEM PORTA. "Sem metal/ferragem aparente" = CHANGE_HARDWARE.',
  'Preencha "echo" em PT-BR com um resumo gentil do que entendeu (uma frase).',
  'Emita SOMENTE as mudanças pedidas EXPLICITAMENTE; não invente alterações, não troque o TIPO do móvel e não mexa no que não foi mencionado.',
  'Se for ambíguo ou nada acionável, deixe commands vazio e clarificationNeeded=true.',
  'NUNCA confirme uma mudança que você não emitiu como comando.',
].join(' ') + '\n\n' + GLOSSARY_FOR_PROMPT + '\n\n' + NLU_EXAMPLES;

const COMMAND_ITEM = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: [...DESIGN_INTENTS] },
    targetModuleId: { type: 'STRING', description: "uuid do módulo, 'ALL', ou vazio" },
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
        layout: {
          type: 'OBJECT',
          description: 'arranjo interno do móvel (CHANGE_LAYOUT)',
          properties: {
            description: { type: 'STRING', description: 'o arranjo em PT-BR, curto e SEM medidas' },
            rows: { type: 'INTEGER', description: 'linhas/andares da grade de nichos' },
            columns: { type: 'INTEGER', description: 'colunas da grade de nichos' },
            openFront: { type: 'BOOLEAN', description: 'true = frente aberta, sem portas' },
          },
        },
      },
    },
  },
  required: ['intent'],
} as const;

const FUNCTION_DECLARATION = {
  name: 'emit_design_commands',
  description: 'Registra TODAS as mudanças de marcenaria entendidas a partir da fala do cliente.',
  parameters: {
    type: 'OBJECT',
    properties: {
      commands: { type: 'ARRAY', items: COMMAND_ITEM },
      confidence: { type: 'NUMBER' },
      clarificationNeeded: { type: 'BOOLEAN' },
      echo: { type: 'STRING' },
    },
    required: ['commands', 'echo'],
  },
} as const;

const ASK_HELP_FALLBACK = (): DesignBatch =>
  parseDesignBatch({ commands: [], confidence: 0.2, clarificationNeeded: true, echo: 'Não entendi bem — pode dizer de outro jeito o que quer mudar?' });

function sanitizeTarget(v: unknown): string | null {
  if (v === 'ALL') return 'ALL';
  if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) return v;
  return null;
}

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
        toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['emit_design_commands'] } },
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
        const rawCommands = Array.isArray(args.commands) ? args.commands : [];
        const commands = rawCommands.map((c) => {
          const cmd = c as Record<string, unknown>;
          return { ...cmd, targetModuleId: sanitizeTarget(cmd.targetModuleId) };
        });
        return parseDesignBatch({ ...args, commands });
      } catch {
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
