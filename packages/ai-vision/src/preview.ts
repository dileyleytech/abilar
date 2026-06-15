// preview.ts — geração da prévia de imagem (§8.2/§8.5). Contrato do job (produtor
// na API ↔ consumidor na Queue) e escolha do módulo principal para o prompt.
import { z } from 'zod';
import type { DesignModule, DesignState } from './state';

/** Mensagem do job de geração (enfileirada em produção; validada nas duas pontas). */
export const previewJobSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(1),
  /** Caminho da imagem base no storage (null = gera do zero). */
  baseImagePath: z.string().nullable().default(null),
  mimeType: z.string().default('image/jpeg'),
});
export type PreviewJob = z.infer<typeof previewJobSchema>;

/** Módulo principal do projeto para montar o prompt da prévia (o primeiro, por ora). */
export function pickPrimaryModule(state: DesignState): DesignModule | null {
  return state.modules[0] ?? null;
}

/** base64 → bytes (funciona em Node e em Workers). Usado por app e worker. */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
