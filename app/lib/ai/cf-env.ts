// cf-env.ts — acesso seguro aos bindings Cloudflare (R2 MEDIA, Queue JOBS).
// Em `next dev` (local) não há contexto → retorna null e o app usa o caminho local.
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { R2Like } from './image-store';

export interface QueueLike {
  send(message: unknown): Promise<void>;
}
export type Bindings = { MEDIA?: R2Like; JOBS?: QueueLike };

/** Bindings em produção (Workers); null em dev/local. */
export function getBindings(): Bindings | null {
  try {
    return ((getCloudflareContext().env as unknown) as Bindings) ?? null;
  } catch {
    return null;
  }
}
