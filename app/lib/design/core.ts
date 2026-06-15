// core.ts — lógica do chat de design SEM autenticação (o chamador autoriza).
// Compartilhado entre a Server Action (web) e as rotas /api/mobile/design (mobile).
import { projects, modules, and, eq } from '@abilar/db';
import {
  resolveNluProvider,
  applyCommand,
  type DesignCommand,
  type DesignState,
  type DesignModule,
} from '@abilar/ai-vision';
import { isValidMm } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { loadDesignState } from './queries';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type DesignTurn = { command: DesignCommand; state: DesignState; message: string };

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
  const command = await provider.interpret({ utterance: text, moduleIds: state.modules.map((m) => m.id) });

  // UNDO é resolvido no cliente (snapshot → restoreDesignState); aqui é no-op informativo.
  if (command.intent === 'UNDO') {
    return { ok: true, data: { command, state, message: 'Para voltar, use o botão Desfazer.' } };
  }

  const result = applyCommand(state, command);
  if (result.ok) await persistState(projectId, result.state);
  return { ok: true, data: { command, state: result.state, message: result.message || command.echo } };
}

/** Interpreta uma fala sobre um estado FORNECIDO, sem carregar nem persistir nada.
 *  Usado pelo marceneiro ao editar uma CÓPIA do projeto (proposta). Sem auth. */
export async function runTurnOnState(state: DesignState, utterance: unknown): Promise<Result<DesignTurn>> {
  const text = typeof utterance === 'string' ? utterance.trim().slice(0, 500) : '';
  if (!text) return { ok: false, error: 'Diga o que você quer mudar.' };
  if (!state?.modules?.length) return { ok: false, error: 'Sem móveis para editar.' };

  const provider = resolveNluProvider({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_NLU_MODEL: process.env.GEMINI_NLU_MODEL });
  const command = await provider.interpret({ utterance: text, moduleIds: state.modules.map((m) => m.id) });
  if (command.intent === 'UNDO') return { ok: true, data: { command, state, message: 'Para voltar, use o botão Desfazer.' } };

  const result = applyCommand(state, command);
  return { ok: true, data: { command, state: result.state, message: result.message || command.echo } };
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
