'use server';

import { revalidatePath } from 'next/cache';
import type { DesignState } from '@abilar/ai-vision';
import { getUserId } from '@/lib/auth/session';
import { ownsProject, runDesignTurn, restoreDesignState, type Result, type DesignTurn } from './core';

/** Um turno do chat de design (web). Auth por sessão; delega ao core. */
export async function designTurn(projectId: string, utterance: unknown): Promise<Result<DesignTurn>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownsProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const r = await runDesignTurn(projectId, utterance);
  if (r.ok) revalidatePath(`/pedidos/${projectId}`);
  return r;
}

/** Restaura um snapshot anterior (UNDO) — web. */
export async function restoreDesign(projectId: string, snapshot: unknown): Promise<Result<DesignState>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownsProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const r = await restoreDesignState(projectId, snapshot);
  if (r.ok) revalidatePath(`/pedidos/${projectId}`);
  return r;
}
