// nlu.ts — NLU do chat de design (§8.4). Converte fala livre PT-BR em DesignCommand.
// Regra de ouro #6: todo LLM é Gemini (3.1 Flash-Lite, function calling), atrás de
// interface trocável. O `mockNluProvider` é determinístico (heurístico) para CI/dev
// sem chave; em produção, com GEMINI_API_KEY, usa-se o provider Gemini.
import { parseDesignCommand, type DesignCommand } from './dsl';

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

/**
 * Provider Gemini (3.1 Flash-Lite, function calling) — TODO Fase 6 (real).
 * Sem a chamada de rede ainda; o factory abaixo decide qual provider usar.
 */
export function createGeminiNluProvider(_apiKey: string): NluProvider {
  return {
    name: 'gemini',
    async interpret() {
      // TODO(Fase 6 — §8.4): chamar Gemini 3.1 Flash-Lite com function calling,
      // validar a saída com parseDesignCommand. Requer GEMINI_API_KEY + deploy.
      throw new Error('GeminiNluProvider ainda não implementado (TODO Fase 6).');
    },
  };
}

/** Resolve o provider de NLU: Gemini quando há chave; senão o mock determinístico. */
export function resolveNluProvider(env: { GEMINI_API_KEY?: string }): NluProvider {
  return env.GEMINI_API_KEY ? createGeminiNluProvider(env.GEMINI_API_KEY) : mockNluProvider;
}
