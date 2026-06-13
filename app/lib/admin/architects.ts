import 'server-only';
import { architectProfiles, asc } from '@abilar/db';
import { getDb } from '@/lib/db';
import { signedProjectPhotoUrl } from '@/lib/storage';

export type AdminArchitect = { userId: string; name: string; cau: string | null; commissionPercent: string; active: boolean; logoUrl: string | null };

export async function listArchitectsAdmin(): Promise<AdminArchitect[]> {
  const db = getDb();
  const rows = await db
    .select({ userId: architectProfiles.userId, name: architectProfiles.name, cau: architectProfiles.cau, commissionPercent: architectProfiles.commissionPercent, active: architectProfiles.active, logoPath: architectProfiles.logoPath })
    .from(architectProfiles)
    .orderBy(asc(architectProfiles.name));
  return Promise.all(
    rows.map(async ({ logoPath, ...r }) => ({ ...r, logoUrl: logoPath ? await signedProjectPhotoUrl(logoPath, 600) : null })),
  );
}
