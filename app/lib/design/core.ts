// core.ts — lógica do chat de design SEM autenticação (o chamador autoriza).
// Compartilhado entre a Server Action (web) e as rotas /api/mobile/design (mobile).
import { projects, modules, and, eq } from '@abilar/db';
import {
  resolveNluProvider,
  applyCommand,
  parseDesignCommand,
  type DesignCommand,
  type DesignBatch,
  type DesignState,
  type DesignModule,
} from '@abilar/ai-vision';
import { isValidMm } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { loadDesignState } from './queries';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type DesignTurn = { command: DesignCommand; state: DesignState; message: string };

/** Aplica TODOS os comandos do lote em sequência. Devolve o estado final, se algo
 *  mudou, e a intenção "representativa" para a UI (UNDO / ASK_HELP / mudança real). */
function applyBatch(state: DesignState, batch: DesignBatch): { state: DesignState; changed: boolean; repIntent: DesignCommand['intent'] } {
  const isSingleUndo = batch.commands.length === 1 && batch.commands[0]!.intent === 'UNDO';
  if (isSingleUndo) return { state, changed: false, repIntent: 'UNDO' };

  let cur = state;
  let changed = false;
  let firstApplied: DesignCommand['intent'] | null = null;
  for (const c of batch.commands) {
    if (c.intent === 'UNDO' || c.intent === 'ASK_HELP') continue;
    const r = applyCommand(cur, parseDesignCommand(c));
    if (r.ok) { cur = r.state; changed = true; firstApplied = firstApplied ?? c.intent; }
  }
  return { state: cur, changed, repIntent: changed ? (firstApplied ?? 'CHANGE_LAYOUT') : 'ASK_HELP' };
}

/** Monta o DesignTurn (comando representativo para a UI) a partir do lote + estado. */
function turnFromBatch(batch: DesignBatch, applied: { state: DesignState; repIntent: DesignCommand['intent'] }, fallbackMsg: string): DesignTurn {
  const command = parseDesignCommand({ intent: applied.repIntent, echo: batch.echo, clarificationNeeded: batch.clarificationNeeded, confidence: batch.confidence });
  return { command, state: applied.state, message: batch.echo || fallbackMsg };
}

/** Confirma posse do projeto (cliente dono) — Drizzle é serviço, autorização explícita. */
export async function ownsProject(projectId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** Persiste o estado de design de volta nos módulos (a fonte de verdade — §8.3). */
async function persistState(projectId: string, state: DesignState) {
  const db = getDb();
  await Promise.all(
    state.modules.map((m: DesignModule) =>
      db
        .update(modules)
        .set({
          material: m.material ?? null,
          finish: m.finish ?? null,
          widthMm: m.widthMm,
          heightMm: m.heightMm,
          depthMm: m.depthMm,
          hardware: { kind: m.hardware ?? null, lighting: m.lighting ?? null },
          items: m.items ?? [],
        })
        .where(and(eq(modules.id, m.id), eq(modules.projectId, projectId))),
    ),
  );
}

/** Interpreta a fala (Gemini), aplica ao estado e persiste. Sem auth. */
export async function runDesignTurn(projectId: string, utterance: unknown): Promise<Result<DesignTurn>> {
  const text = typeof utterance === 'string' ? utterance.trim().slice(0, 500) : '';
  if (!text) return { ok: false, error: 'Diga o que você quer mudar.' };

  const state = await loadDesignState(projectId);
  if (state.modules.length === 0) return { ok: false, error: 'Adicione um móvel ao pedido antes de conversar com a ABI.' };

  const provider = resolveNluProvider({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_NLU_MODEL: process.env.GEMINI_NLU_MODEL });
  const batch = await provider.interpret({ utterance: text, moduleIds: state.modules.map((m) => m.id) });

  const applied = applyBatch(state, batch);
  if (applied.repIntent === 'UNDO') {
    // UNDO é resolvido no cliente (snapshot → restoreDesignState).
    return { ok: true, data: { command: parseDesignCommand({ intent: 'UNDO', echo: batch.echo }), state, message: 'Para voltar, use o botão Desfazer.' } };
  }
  if (applied.changed) await persistState(projectId, applied.state);
  return { ok: true, data: turnFromBatch(batch, applied, 'Não entendi bem — pode dizer de outro jeito?') };
}

/** Interpreta uma fala sobre um estado FORNECIDO, sem carregar nem persistir nada.
 *  Usado pelo marceneiro ao editar uma CÓPIA do projeto (proposta). Sem auth. */
export async function runTurnOnState(state: DesignState, utterance: unknown): Promise<Result<DesignTurn>> {
  const text = typeof utterance === 'string' ? utterance.trim().slice(0, 500) : '';
  if (!text) return { ok: false, error: 'Diga o que você quer mudar.' };
  if (!state?.modules?.length) return { ok: false, error: 'Sem móveis para editar.' };

  const provider = resolveNluProvider({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_NLU_MODEL: process.env.GEMINI_NLU_MODEL });
  const batch = await provider.interpret({ utterance: text, moduleIds: state.modules.map((m) => m.id) });

  const applied = applyBatch(state, batch);
  if (applied.repIntent === 'UNDO') {
    return { ok: true, data: { command: parseDesignCommand({ intent: 'UNDO', echo: batch.echo }), state, message: 'Para voltar, use o botão Desfazer.' } };
  }
  return { ok: true, data: turnFromBatch(batch, applied, 'Não entendi bem — pode dizer de outro jeito?') };
}

/** Restaura um snapshot anterior (UNDO). Valida cada módulo contra o projeto. Sem auth. */
export async function restoreDesignState(projectId: string, snapshot: unknown): Promise<Result<DesignState>> {
  const snap = snapshot as DesignState | null;
  if (!snap || !Array.isArray(snap.modules)) return { ok: false, error: 'Nada para desfazer.' };

  const db = getDb();
  const rows = await db.select({ id: modules.id }).from(modules).where(eq(modules.projectId, projectId));
  const valid = new Set(rows.map((r) => r.id));
  const safe = snap.modules.filter(
    (m) => valid.has(m.id) && isValidMm(m.widthMm) && isValidMm(m.heightMm) && isValidMm(m.depthMm),
  );
  if (safe.length === 0) return { ok: false, error: 'Nada para desfazer.' };

  await persistState(projectId, { modules: safe });
  return { ok: true, data: { modules: safe } };
}
