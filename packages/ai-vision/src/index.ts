// @abilar/ai-vision — orquestração de edição de imagem por chat (§8).
// Regra de ouro #6: todo LLM é Gemini (NLU + imagem), atrás de interface trocável.
// Regra de ouro (§8.3): DIMENSÕES NUNCA saem da imagem — estado estruturado manda.

// Núcleo puro (Fase 6): DSL, estado estruturado, prompt de imagem, guardrails e NLU.
export * from './dsl';
export * from './state';
export * from './prompt';
export * from './guardrails';
export * from './nlu';
export * from './session';
export * from './preview';
export * from './photo-moderation';

/** Provider de edição de imagem (trocável: Gemini Nano Banana 2 default, Flux fallback). */
export interface ImageEditProvider {
  readonly name: string;
  /** Edita uma imagem a partir de uma instrução em linguagem natural já validada. */
  editImage(input: ImageEditInput): Promise<ImageEditResult>;
}

export interface ImageEditInput {
  /** Prompt de imagem montado a partir da DSL (§8.4/§8.5) — NUNCA medidas. */
  prompt: string;
  /** Imagem base inline (bytes em base64) para edição local; ausente = geração do zero. */
  imageBase64?: string;
  /** MIME da imagem base (ex.: 'image/jpeg'). */
  mimeType?: string;
  /** Semente para reprodutibilidade (opcional). */
  seed?: number;
}

export interface ImageEditResult {
  /** Imagem gerada em base64 — o chamador persiste em R2/Storage e versiona. */
  imageBase64: string;
  mimeType: string;
  provider: string;
}

/** Provider de eco para testes/CI (não chama rede) — devolve a imagem base. */
export const echoProvider: ImageEditProvider = {
  name: 'echo',
  async editImage(input) {
    return { imageBase64: input.imageBase64 ?? '', mimeType: input.mimeType ?? 'image/png', provider: 'echo' };
  },
};

export { createGeminiImageProvider, resolveImageProvider, DEFAULT_IMAGE_MODEL } from './gemini-image';
export type { GeminiImageOptions } from './gemini-image';
