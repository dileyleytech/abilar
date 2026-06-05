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
}): Promise<Result<{ projectId: string; firstModuleId?: string }>> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };

  const p = createProjectSchema.safeParse(input.project);
  if (!p.success) return { ok: false, error: 'Dados do pedido inválidos.' };

  let first: ReturnType<typeof moduleInputSchema.safeParse> | null = null;
  if (input.firstModule !== undefined) {
    first = moduleInputSchema.safeParse(input.firstModule);
    if (!first.success) return { ok: false, error: 'Confira as medidas do móvel (em cm, maior que zero).' };
  }

  const db = getDb();
  const [created] = await db
    .insert(projects)
    .values({
      clientId: userId,
      title: p.data.title,
      sourceType: p.data.sourceType,
      city: p.data.city ?? null,
      cep: p.data.cep ?? null,
      lat: p.data.lat != null ? String(p.data.lat) : null,
      lng: p.data.lng != null ? String(p.data.lng) : null,
    })
    .returning({ id: projects.id });

  if (!created) return { ok: false, error: 'Não foi possível criar o pedido.' };

  let firstModuleId: string | undefined;
  if (first?.success) {
    const m = first.data;
    const [mod] = await db
      .insert(modules)
      .values({
        projectId: created.id,
        ambiente: m.ambiente ?? null,
        type: m.type,
        workType: m.workType ?? null,
        label: m.label ?? null,
        widthMm: m.widthMm,
        heightMm: m.heightMm,
        depthMm: m.depthMm,
        material: m.material ?? null,
        finish: m.finish ?? null,
        notes: m.notes ?? null,
      })
      .returning({ id: modules.id });
    firstModuleId = mod?.id;
  }

  revalidatePath('/pedidos');
  return { ok: true, data: { projectId: created.id, firstModuleId } };
}

/** Adiciona um módulo (medidas em cm → mm via schema). Retorna o id do módulo
 *  para que a UI possa enviar 1 foto vinculada a ele. */
export async function addModule(
  projectId: string,
  input: unknown,
): Promise<Result<{ moduleId: string }>> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const m = moduleInputSchema.safeParse(input);
  if (!m.success) return { ok: false, error: 'Confira as medidas do móvel (em cm, maior que zero).' };

  const db = getDb();
  const [created] = await db
    .insert(modules)
    .values({
      projectId,
      ambiente: m.data.ambiente ?? null,
      type: m.data.type,
      workType: m.data.workType ?? null,
      label: m.data.label ?? null,
      widthMm: m.data.widthMm,
      heightMm: m.data.heightMm,
      depthMm: m.data.depthMm,
      material: m.data.material ?? null,
      finish: m.data.finish ?? null,
      notes: m.data.notes ?? null,
    })
    .returning({ id: modules.id });

  if (!created) return { ok: false, error: 'Não foi possível salvar o móvel.' };
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true, data: { moduleId: created.id } };
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

/** Registra um anexo já enviado ao Storage (path "<projectId>/..."). Pode
 *  vincular a um módulo (1 foto por móvel). */
export async function registerProjectPhoto(
  projectId: string,
  input: { kind: unknown; path: string; moduleId?: string },
): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const kind = photoKindSchema.safeParse(input.kind);
  if (!kind.success || typeof input.path !== 'string' || !input.path.startsWith(`${projectId}/`)) {
    return { ok: false, error: 'Anexo inválido.' };
  }

  const db = getDb();
  // Se for foto de módulo, substitui a anterior (1 foto por móvel).
  if (input.moduleId) {
    await db
      .delete(projectPhotos)
      .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.moduleId, input.moduleId)));
  }
  await db.insert(projectPhotos).values({
    projectId,
    moduleId: input.moduleId ?? null,
    kind: kind.data,
    path: input.path,
  });
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
