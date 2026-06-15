// gemini-image.ts — edição de imagem com Gemini (Nano Banana 2 / Flash Image).
// Regra de ouro #6: todo LLM é Gemini. Chave de env (nunca do código). Modelo
// configurável por GEMINI_IMAGE_MODEL. Falhas LANÇAM (o chamador trata/retenta).
import { echoProvider, type ImageEditInput, type ImageEditProvider, type ImageEditResult } from './index';

/** Modelo de imagem padrão (Nano Banana). Sobrescreva via GEMINI_IMAGE_MODEL p/ a 3.1. */
export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiImageOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

type GenPart = { text?: string; inlineData?: { mimeType?: string; data?: string } };

function extractImage(json: unknown): { data: string; mimeType: string } | null {
  const parts = (json as { candidates?: { content?: { parts?: GenPart[] } }[] })?.candidates?.[0]?.content?.parts;
  const img = parts?.find((p) => p.inlineData?.data)?.inlineData;
  return img?.data ? { data: img.data, mimeType: img.mimeType || 'image/png' } : null;
}

export function createGeminiImageProvider(opts: GeminiImageOptions | string): ImageEditProvider {
  const o: GeminiImageOptions = typeof opts === 'string' ? { apiKey: opts } : opts;
  const model = o.model || DEFAULT_IMAGE_MODEL;
  const baseUrl = o.baseUrl || DEFAULT_BASE_URL;
  const doFetch = o.fetchImpl ?? fetch;

  return {
    name: 'gemini',
    async editImage(input: ImageEditInput): Promise<ImageEditResult> {
      const parts: GenPart[] = [{ text: input.prompt }];
      if (input.imageBase64) parts.push({ inlineData: { mimeType: input.mimeType || 'image/jpeg', data: input.imageBase64 } });

      const res = await doFetch(`${baseUrl}/models/${model}:generateContent?key=${o.apiKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
      });
      if (!res.ok) throw new Error(`Falha na geração de imagem (HTTP ${res.status}).`);

      const img = extractImage(await res.json());
      if (!img) throw new Error('O modelo não retornou uma imagem.');
      return { imageBase64: img.data, mimeType: img.mimeType, provider: 'gemini' };
    },
  };
}

/** Resolve o provider de imagem: Gemini quando há chave; senão o echo (CI/dev). */
export function resolveImageProvider(env: { GEMINI_API_KEY?: string; GEMINI_IMAGE_MODEL?: string }): ImageEditProvider {
  return env.GEMINI_API_KEY
    ? createGeminiImageProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_IMAGE_MODEL })
    : echoProvider;
}
