import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const PROJECT_PHOTOS_BUCKET = 'project-photos';

/** Gera URL assinada CURTA para um anexo do projeto (threat model: URLs curtas).
 *  TODO(R2): trocar por provider de R2 quando o Cloudflare estiver ligado. */
export async function signedProjectPhotoUrl(path: string, expiresInSec = 120): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresInSec);
  return data?.signedUrl ?? null;
}
