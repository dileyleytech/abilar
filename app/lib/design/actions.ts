'use server';

import { revalidatePath } from 'next/cache';
import type { DesignState } from '@abilar/ai-vision';
import { getUserId } from '@/lib/auth/session';
import type { DesignProposalType } from '@abilar/shared';
import { ownsProject, runDesignTurn, runTurnOnState, restoreDesignState, type Result, type DesignTurn } from './core';
import { requestPreview, proposalDraftPreview, type PreviewResult } from './preview';
import { carpenterCanPropose, clientOwnsProject, createProposal, decideProposal } from './proposals';

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

/** Gera (ou enfileira) uma prévia de imagem do projeto — web. */
export async function requestDesignPreview(projectId: string): Promise<Result<PreviewResult>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownsProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const r = await requestPreview(projectId);
  if (r.ok) revalidatePath(`/pedidos/${projectId}`);
  return r;
}

/** Marceneiro edita uma CÓPIA do projeto (não persiste) — turno do editor de proposta. */
export async function proposalTurn(projectId: string, state: DesignState, utterance: unknown): Promise<Result<DesignTurn>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await carpenterCanPropose(projectId, userId))) return { ok: false, error: 'Você precisa ter um orçamento neste pedido.' };
  return runTurnOnState(state, utterance);
}

/** Marceneiro gera a prévia do rascunho (estado em edição) para ir ajustando. */
export async function proposalPreview(projectId: string, state: DesignState): Promise<Result<{ url: string | null }>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await carpenterCanPropose(projectId, userId))) return { ok: false, error: 'Você precisa ter um orçamento neste pedido.' };
  return proposalDraftPreview(projectId, userId, state);
}

/** Marceneiro propõe um design (EDIT ou SUGGESTION) para o projeto que orça. */
export async function proposeDesign(
  projectId: string,
  input: { type: DesignProposalType; note?: string; state: unknown },
): Promise<Result<{ id: string }>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await carpenterCanPropose(projectId, userId))) return { ok: false, error: 'Você precisa ter um orçamento neste pedido para propor.' };

  const r = await createProposal(projectId, userId, { type: input.type, note: input.note, state: input.state as never });
  if (r.ok) revalidatePath(`/pedidos/${projectId}`);
  return r;
}

/** Cliente decide uma sugestão do marceneiro (aprovar aplica no pedido). */
export async function decideDesignProposal(
  projectId: string,
  proposalId: string,
  decision: 'APPROVED' | 'REJECTED',
): Promise<Result<{ applied: boolean }>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await clientOwnsProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const r = await decideProposal(projectId, proposalId, decision);
  if (r.ok) revalidatePath(`/pedidos/${projectId}`);
  return r;
}
