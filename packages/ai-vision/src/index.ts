// @abilar/ai-vision — orquestração de edição de imagem por chat (§8).
// Regra de ouro #6: todo LLM é Gemini (NLU + imagem), atrás de interface trocável.
// Regra de ouro (§8.3): DIMENSÕES NUNCA saem da imagem — estado estruturado manda.

/** Provider de edição de imagem (trocável: Gemini Nano Banana 2 default, Flux fallback). */
export interface ImageEditProvider {
  readonly name: string;
  /** Edita uma imagem a partir de uma instrução em linguagem natural já validada. */
  editImage(input: ImageEditInput): Promise<ImageEditResult>;
}

export interface ImageEditInput {
  /** URL assinada/curta da imagem base no R2. */
  sourceImageUrl: string;
  /** Prompt de imagem montado a partir da DSL (§8.4/§8.5) — NUNCA medidas. */
  prompt: string;
  /** Semente para reprodutibilidade (opcional). */
  seed?: number;
}

export interface ImageEditResult {
  /** URL da imagem gerada (R2). */
  imageUrl: string;
  provider: string;
}

// TODO(Fase 6 — §8): GeminiProvider (Nano Banana 2) default + FluxProvider fallback;
// NLU com Gemini 3.1 Flash-Lite (function calling) -> DSL de comandos (§8.4);
// rodar em consumer de Cloudflare Queue; versionamento de imagens no R2.

/** Provider de eco para testes/CI (não chama rede). */
export const echoProvider: ImageEditProvider = {
  name: 'echo',
  async editImage(input) {
    return { imageUrl: input.sourceImageUrl, provider: 'echo' };
  },
};
