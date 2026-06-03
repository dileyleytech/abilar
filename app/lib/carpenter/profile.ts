import 'server-only';
import { carpenterProfiles, eq } from '@abilar/db';
import type { CarpenterProfile } from '@abilar/db';
import { getDb } from '@/lib/db';

/** Perfil do marceneiro (ou null se ainda não completou o onboarding). */
export async function getCarpenterProfile(userId: string): Promise<CarpenterProfile | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(carpenterProfiles)
    .where(eq(carpenterProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}
