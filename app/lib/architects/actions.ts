'use server';

import { getUserId } from '@/lib/auth/session';
import { searchArchitects, type ArchitectOption } from './queries';

/** Autocomplete de arquitetos por nome (exige sessão; o cliente escolhe no pedido). */
export async function searchArchitectsAction(q: string): Promise<ArchitectOption[]> {
  const userId = await getUserId();
  if (!userId) return [];
  return searchArchitects(q);
}
