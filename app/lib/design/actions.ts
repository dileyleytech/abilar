'use server';

import { revalidatePath } from 'next/cache';
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
import { getUserId } from '@/lib/auth/session';
import { loadDesignState } from './queries';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Confirma posse do projeto (cliente dono) — Drizzle é serviço, autorização explícita. */
async function ownProject(projectId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, userId)))
    .limit(1);
  return rows[0] ?? null;
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

export type DesignTurn = { command: DesignCommand; state: DesignState; message: string };

/** Um turno do chat de design: interpreta a fala (Gemini), aplica e persiste. */
export async function designTurn(projectId: string, utterance: unknown): Promise<Result<DesignTurn>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const text = typeof utterance === 'string' ? utterance.trim().slice(0, 500) : '';
  if (!text) return { ok: false, error: 'Diga o que você quer mudar.' };

  const state = await loadDesignState(projectId);
  if (state.modules.length === 0) return { ok: false, error: 'Adicione um móvel ao pedido antes de conversar com a ABI.' };

  const provider = resolveNluProvider({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_NLU_MODEL: process.env.GEMINI_NLU_MODEL });
  const command = await provider.interpret({ utterance: text, moduleIds: state.modules.map((m) => m.id) });

  // UNDO é resolvido no cliente (snapshot → restoreDesign); aqui é no-op informativo.
  if (command.intent === 'UNDO') {
    return { ok: true, data: { command, state, message: 'Para voltar, use o botão Desfazer.' } };
  }

  const result = applyCommand(state, command);
  if (result.ok) {
    await persistState(projectId, result.state);
    revalidatePath(`/pedidos/${projectId}`);
  }
  return { ok: true, data: { command, state: result.state, message: result.message || command.echo } };
}

/** Restaura um snapshot anterior (UNDO). Valida cada módulo contra o projeto. */
export async function restoreDesign(projectId: string, snapshot: unknown): Promise<Result<DesignState>> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const snap = snapshot as DesignState | null;
  if (!snap || !Array.isArray(snap.modules)) return { ok: false, error: 'Nada para desfazer.' };

  // Só aceita módulos que pertencem ao projeto e com medidas válidas (anti-injeção).
  const db = getDb();
  const rows = await db.select({ id: modules.id }).from(modules).where(eq(modules.projectId, projectId));
  const valid = new Set(rows.map((r) => r.id));
  const safe = snap.modules.filter(
    (m) => valid.has(m.id) && isValidMm(m.widthMm) && isValidMm(m.heightMm) && isValidMm(m.depthMm),
  );
  if (safe.length === 0) return { ok: false, error: 'Nada para desfazer.' };

  await persistState(projectId, { modules: safe });
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true, data: { modules: safe } };
}
