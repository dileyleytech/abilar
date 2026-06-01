'use server';

import { revalidatePath } from 'next/cache';
import {
  createProjectSchema,
  moduleInputSchema,
  photoKindSchema,
  projectStatusSchema,
  assertProjectTransition,
  ProjectStatusError,
} from '@abilar/shared';
import { projects, modules, projectPhotos, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function uid(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Confirma que o projeto é do usuário (autorização explícita — Drizzle é serviço). */
async function ownProject(projectId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Cria projeto (DRAFT) + opcionalmente o 1º módulo (móvel). Mais móveis/cômodos
 *  são adicionados depois via addModule (um projeto tem vários módulos — §2.6). */
export async function createProject(input: {
  project: unknown;
  firstModule?: unknown;
}): Promise<Result<{ projectId: string }>> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };

  const p = createProjectSchema.safeParse(input.project);
  if (!p.success) return { ok: false, error: 'Dados do pedido inválidos.' };

  let first: ReturnType<typeof moduleInputSchema.safeParse> | null = null;
  if (input.firstModule !== undefined) {
    first = moduleInputSchema.safeParse(input.firstModule);
    if (!first.success) return { ok: false, error: 'Medidas do móvel inválidas.' };
  }

  const db = getDb();
  const [created] = await db
    .insert(projects)
    .values({
      clientId: userId,
      title: p.data.title ?? null,
      category: p.data.category,
      workType: p.data.workType,
      sourceType: p.data.sourceType,
    })
    .returning({ id: projects.id });

  if (!created) return { ok: false, error: 'Não foi possível criar o pedido.' };

  if (first?.success) {
    const m = first.data;
    await db.insert(modules).values({
      projectId: created.id,
      ambiente: m.ambiente ?? null,
      type: m.type,
      label: m.label ?? null,
      widthMm: m.widthMm,
      heightMm: m.heightMm,
      depthMm: m.depthMm,
      material: m.material ?? null,
      finish: m.finish ?? null,
      notes: m.notes ?? null,
    });
  }

  revalidatePath('/pedidos');
  return { ok: true, data: { projectId: created.id } };
}

/** Adiciona um módulo (medidas em cm → mm via schema). */
export async function addModule(projectId: string, input: unknown): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const m = moduleInputSchema.safeParse(input);
  if (!m.success) return { ok: false, error: 'Módulo inválido.' };

  const db = getDb();
  await db.insert(modules).values({
    projectId,
    ambiente: m.data.ambiente ?? null,
    type: m.data.type,
    label: m.data.label ?? null,
    widthMm: m.data.widthMm,
    heightMm: m.data.heightMm,
    depthMm: m.data.depthMm,
    material: m.data.material ?? null,
    finish: m.data.finish ?? null,
    notes: m.data.notes ?? null,
  });
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true, data: undefined };
}

/** Remove um módulo do projeto (com ownership via projeto). */
export async function deleteModule(projectId: string, moduleId: string): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const db = getDb();
  await db.delete(modules).where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)));
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true, data: undefined };
}

/** Registra um anexo já enviado ao Storage (path "<projectId>/..."). */
export async function registerProjectPhoto(
  projectId: string,
  input: { kind: unknown; path: string },
): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const kind = photoKindSchema.safeParse(input.kind);
  if (!kind.success || typeof input.path !== 'string' || !input.path.startsWith(`${projectId}/`)) {
    return { ok: false, error: 'Anexo inválido.' };
  }

  const db = getDb();
  await db.insert(projectPhotos).values({ projectId, kind: kind.data, path: input.path });
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true, data: undefined };
}

/** Transição de status validada pela máquina de estados (servidor manda). */
export async function changeProjectStatus(projectId: string, to: unknown): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  const current = await ownProject(projectId, userId);
  if (!current) return { ok: false, error: 'Pedido não encontrado.' };

  const target = projectStatusSchema.safeParse(to);
  if (!target.success) return { ok: false, error: 'Status inválido.' };

  try {
    assertProjectTransition(current.status, target.data);
  } catch (e) {
    if (e instanceof ProjectStatusError) return { ok: false, error: e.message };
    throw e;
  }

  const db = getDb();
  await db
    .update(projects)
    .set({ status: target.data, updatedAt: sql`now()` })
    .where(eq(projects.id, projectId));
  revalidatePath(`/pedidos/${projectId}`);
  revalidatePath('/pedidos');
  return { ok: true, data: undefined };
}
