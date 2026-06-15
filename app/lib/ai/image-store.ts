// image-store.ts — onde a prévia gerada é guardada. Abstração trocável:
//  • LOCAL/dev: Supabase Storage (bucket project-photos) — testável sem Cloudflare.
//  • PRODUÇÃO: R2 (binding MEDIA) — o jeito correto (§1.3/§8.2).
// A escolha é por ambiente (presença do binding), não por código duplicado nas telas.
import { base64ToBytes } from '@abilar/ai-vision';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET, signedProjectPhotoUrl } from '@/lib/storage';

export { base64ToBytes };

export interface ImageStore {
  readonly name: string;
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  signedUrl(path: string, expiresInSec?: number): Promise<string | null>;
}

/** Local/dev — Supabase Storage. */
export const supabaseImageStore: ImageStore = {
  name: 'supabase',
  async put(path, bytes, contentType) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(PROJECT_PHOTOS_BUCKET).upload(path, bytes, { contentType, upsert: true });
    if (error) throw new Error(`Falha ao guardar imagem (Supabase): ${error.message}`);
  },
  signedUrl: (path, expiresInSec = 120) => signedProjectPhotoUrl(path, expiresInSec),
};

/** Binding R2 mínimo (evita depender de @cloudflare/workers-types aqui). */
export interface R2Like {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

/** Produção — R2 (binding MEDIA). A URL de leitura é servida por rota dedicada. */
export function r2ImageStore(bucket: R2Like): ImageStore {
  return {
    name: 'r2',
    async put(path, bytes, contentType) {
      await bucket.put(path, bytes, { httpMetadata: { contentType } });
    },
    async signedUrl(path) {
      // TODO(deploy): servir via rota /api/media (R2 não tem signed URL como o Supabase).
      return `/api/media?path=${encodeURIComponent(path)}`;
    },
  };
}

/** Escolhe o store pelo ambiente: R2 quando o binding MEDIA existe; senão Supabase. */
export function resolveImageStore(env?: { MEDIA?: R2Like }): ImageStore {
  return env?.MEDIA ? r2ImageStore(env.MEDIA) : supabaseImageStore;
}
