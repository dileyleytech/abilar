import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const PROJECT_PHOTOS_BUCKET = 'project-photos';

/** Gera URL assinada CURTA para um anexo do projeto (threat model: URLs curtas).
 *  Usa a service role (server-only) — a autorização de QUEM pode ver já é feita
 *  nas queries (dono do pedido OU marceneiro elegível). Assim a foto aparece
 *  tanto para o cliente quanto para o marceneiro no feed.
 *  TODO(R2): trocar por provider de R2 quando o Cloudflare estiver ligado. */
export async function signedProjectPhotoUrl(path: string, expiresInSec = 120): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresInSec);
  return data?.signedUrl ?? null;
}
