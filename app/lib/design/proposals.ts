// proposals.ts — propostas de design do marceneiro (§8.6). SEM auth (chamador autoriza).
//  • EDIT: entra como proposta do marceneiro (status APPLIED) — não altera o pedido do cliente.
//  • SUGGESTION: vai para o cliente (status PENDING); ao APROVAR, aplica nos módulos.
// Toda proposta guarda o estado proposto + prévia, atribuída ao autor (carpenterId).
import { designProposals, quotes, projects, and, eq, desc, sql } from '@abilar/db';
import {
  buildImagePrompt,
  pickPrimaryModule,
  resolveImageProvider,
  type DesignState,
} from '@abilar/ai-vision';
import type { DesignProposalType } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { resolveImageStore, base64ToBytes } from '@/lib/ai/image-store';
import { getBindings } from '@/lib/ai/cf-env';
import { restoreDesignState } from './core';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const ROOM_TYPE: Record<string, string> = {
  COZINHA: 'a Brazilian kitchen', GUARDA_ROUPA: 'a bedroom', BANHEIRO: 'a bathroom',
  LAVANDERIA: 'a laundry room', HOME_OFFICE: 'a home office', PAINEL_TV: 'a living room',
  ESTANTE: 'a living room', OUTRO: 'a Brazilian residential room',
};

/** O marceneiro pode propor se tem orçamento no projeto. */
export async function carpenterCanPropose(projectId: string, carpenterId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.projectId, projectId), eq(quotes.carpenterId, carpenterId)))
    .limit(1);
  return rows.length > 0;
}

/** Cliente dono do projeto. */
export async function clientOwnsProject(projectId: string, clientId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, clientId)))
    .limit(1);
  return rows.length > 0;
}

/** Gera uma prévia a partir do estado PROPOSTO (best-effort) e guarda. */
async function previewForProposal(projectId: string, proposalId: string, state: DesignState): Promise<string | null> {
  const primary = pickPrimaryModule(state);
  if (!primary) return null;
  const provider = resolveImageProvider({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL });
  if (provider.name === 'echo') return null;
  try {
    const { prompt } = buildImagePrompt(primary, { roomType: ROOM_TYPE[primary.type] });
    const result = await provider.editImage({ prompt });
    const path = `${projectId}/proposals/${proposalId}.png`;
    await resolveImageStore(getBindings() ?? undefined).put(path, base64ToBytes(result.imageBase64), result.mimeType);
    return path;
  } catch {
    return null; // prévia é opcional; a proposta vale pelo estado.
  }
}

export type ProposalView = {
  id: string;
  type: DesignProposalType;
  status: string;
  note: string | null;
  state: DesignState;
  previewUrl: string | null;
  createdAt: string;
};

/** Cria a proposta (marceneiro). Gera a prévia do estado proposto. */
export async function createProposal(
  projectId: string,
  carpenterId: string,
  input: { type: DesignProposalType; note?: string; state: DesignState },
): Promise<Result<{ id: string }>> {
  if (!input.state || !Array.isArray(input.state.modules) || input.state.modules.length === 0) {
    return { ok: false, error: 'Proposta sem móveis.' };
  }
  const db = getDb();
  const status = input.type === 'SUGGESTION' ? 'PENDING' : 'APPLIED';
  const [row] = await db
    .insert(designProposals)
    .values({ projectId, carpenterId, type: input.type, status, note: input.note?.slice(0, 1000) ?? null, state: input.state })
    .returning({ id: designProposals.id });
  if (!row) return { ok: false, error: 'Não foi possível salvar a proposta.' };

  const previewPath = await previewForProposal(projectId, row.id, input.state);
  if (previewPath) await db.update(designProposals).set({ previewPath }).where(eq(designProposals.id, row.id));
  return { ok: true, data: { id: row.id } };
}

/** Lista as propostas do projeto (mais recentes primeiro). */
export async function listProposals(projectId: string): Promise<ProposalView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(designProposals)
    .where(eq(designProposals.projectId, projectId))
    .orderBy(desc(designProposals.createdAt));
  const store = resolveImageStore(getBindings() ?? undefined);
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      note: r.note,
      state: r.state as DesignState,
      previewUrl: r.previewPath ? await store.signedUrl(r.previewPath) : null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
}

/** Cliente decide uma SUGGESTION. Aprovar aplica o estado proposto nos módulos. */
export async function decideProposal(
  projectId: string,
  proposalId: string,
  decision: 'APPROVED' | 'REJECTED',
): Promise<Result<{ applied: boolean }>> {
  const db = getDb();
  const [p] = await db
    .select()
    .from(designProposals)
    .where(and(eq(designProposals.id, proposalId), eq(designProposals.projectId, projectId)))
    .limit(1);
  if (!p) return { ok: false, error: 'Proposta não encontrada.' };
  if (p.status !== 'PENDING') return { ok: false, error: 'Esta proposta já foi decidida.' };

  let applied = false;
  if (decision === 'APPROVED') {
    const r = await restoreDesignState(projectId, p.state); // valida módulos do projeto + medidas
    applied = r.ok;
  }
  await db
    .update(designProposals)
    .set({ status: decision, decidedAt: sql`now()` })
    .where(eq(designProposals.id, proposalId));
  return { ok: true, data: { applied } };
}
