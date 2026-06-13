import 'server-only';
import { architectProfiles, asc } from '@abilar/db';
import { getDb } from '@/lib/db';

export type AdminArchitect = { userId: string; name: string; cau: string | null; commissionPercent: string; active: boolean };

export async function listArchitectsAdmin(): Promise<AdminArchitect[]> {
  const db = getDb();
  return db
    .select({ userId: architectProfiles.userId, name: architectProfiles.name, cau: architectProfiles.cau, commissionPercent: architectProfiles.commissionPercent, active: architectProfiles.active })
    .from(architectProfiles)
    .orderBy(asc(architectProfiles.name));
}
