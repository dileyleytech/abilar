// photo-moderation.ts — moderação da foto do cliente (§8.7): rejeita imagens que
// não sejam de um cômodo/parede onde caiba o móvel. Gemini (vision). FAIL-OPEN:
// se a API falhar, NÃO bloqueia o upload (relevant=true) — não punir por erro nosso.

export interface PhotoModerator {
  readonly name: string;
  check(imageBase64: string, mimeType: string): Promise<{ relevant: boolean; reason?: string }>;
}

const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export type PhotoModeratorOptions = { apiKey: string; model?: string; baseUrl?: string; fetchImpl?: typeof fetch };

const FN = {
  name: 'report_photo',
  description: 'Informa se a foto serve para projetar um móvel (mostra um cômodo/parede de ambiente residencial).',
  parameters: {
    type: 'OBJECT',
    properties: {
      relevant: { type: 'BOOLEAN', description: 'true se é foto de um cômodo/parede/ambiente; false se irrelevante (selfie, documento, tela, etc.)' },
      reason: { type: 'STRING', description: 'motivo curto e gentil em PT-BR quando relevant=false' },
    },
    required: ['relevant'],
  },
} as const;

const PROMPT =
  'Você modera fotos para um app de marcenaria. Diga se a foto serve para projetar um móvel: ' +
  'deve mostrar um CÔMODO, PAREDE ou AMBIENTE residencial. Rejeite selfies, documentos, prints de tela, ' +
  'fotos borradas/escuras demais ou sem relação. Chame a função report_photo.';

export function createGeminiPhotoModerator(opts: PhotoModeratorOptions | string): PhotoModerator {
  const o: PhotoModeratorOptions = typeof opts === 'string' ? { apiKey: opts } : opts;
  const model = o.model || DEFAULT_MODEL;
  const baseUrl = o.baseUrl || BASE_URL;
  const doFetch = o.fetchImpl ?? fetch;

  return {
    name: 'gemini',
    async check(imageBase64, mimeType) {
      try {
        const res = await doFetch(`${baseUrl}/models/${model}:generateContent?key=${o.apiKey}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType, data: imageBase64 } }] }],
            tools: [{ functionDeclarations: [FN] }],
            toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['report_photo'] } },
          }),
        });
        if (!res.ok) return { relevant: true }; // fail-open
        const json = (await res.json()) as { candidates?: { content?: { parts?: { functionCall?: { args?: { relevant?: boolean; reason?: string } } }[] } }[] };
        const args = json?.candidates?.[0]?.content?.parts?.find((p) => p.functionCall)?.functionCall?.args;
        if (!args || typeof args.relevant !== 'boolean') return { relevant: true };
        return { relevant: args.relevant, reason: args.reason };
      } catch {
        return { relevant: true }; // fail-open
      }
    },
  };
}

/** Permissivo sem chave (CI/dev); Gemini com chave. */
export function resolvePhotoModerator(env: { GEMINI_API_KEY?: string; GEMINI_MODERATION_MODEL?: string }): PhotoModerator {
  if (!env.GEMINI_API_KEY) return { name: 'allow', async check() { return { relevant: true }; } };
  return createGeminiPhotoModerator({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODERATION_MODEL });
}
