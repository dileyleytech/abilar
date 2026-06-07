'use server';

import { revalidatePath } from 'next/cache';
import {
  createProjectSchema,
  moduleInputSchema,
  updateProjectLocationSchema,
  photoKindSchema,
  projectStatusSchema,
  assertProjectTransition,
  ProjectStatusError,
} from '@abilar/shared';
import { projects, modules, projectPhotos, and, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getUserId } from '@/lib/auth/session';

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

// Id do usuário via JWT (local, sem ida à rede). RLS + ownProject seguem garantindo
// a autorização — o id vem de um token verificado pelo middleware/getClaims.
const uid = getUserId;

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

/** Renomeia o pedido (dono). */
export async function renameProject(projectId: string, title: unknown): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const parsed = createProjectSchema.shape.title.safeParse(title);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Nome inválido.' };

  const db = getDb();
  await db.update(projects).set({ title: parsed.data, updatedAt: sql`now()` }).where(eq(projects.id, projectId));
  revalidatePath(`/pedidos/${projectId}`);
  revalidatePath('/pedidos');
  return { ok: true, data: undefined };
}

/** Edita um móvel do pedido (dono). Medidas cm → mm via schema. */
export async function updateModule(projectId: string, moduleId: string, input: unknown): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const m = moduleInputSchema.safeParse(input);
  if (!m.success) return { ok: false, error: 'Confira as medidas do móvel (em cm, maior que zero).' };

  const db = getDb();
  await db
    .update(modules)
    .set({
      ambiente: m.data.ambiente ?? null,
      type: m.data.type,
      workType: m.data.workType ?? null,
      label: m.data.label ?? null,
      widthMm: m.data.widthMm,
      heightMm: m.data.heightMm,
      depthMm: m.data.depthMm,
    })
    .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)));
  revalidatePath(`/pedidos/${projectId}`);
  return { ok: true, data: undefined };
}

/** Atualiza o local da obra (cidade/CEP/coords) do pedido — alimenta o matching. */
export async function updateProjectLocation(projectId: string, input: unknown): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'Faça login.' };
  if (!(await ownProject(projectId, userId))) return { ok: false, error: 'Pedido não encontrado.' };

  const parsed = updateProjectLocationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const d = parsed.data;

  const db = getDb();
  await db
    .update(projects)
    .set({
      city: d.city,
      cep: d.cep ?? null,
      lat: d.lat != null ? String(d.lat) : null,
      lng: d.lng != null ? String(d.lng) : null,
      updatedAt: sql`now()`,
    })
    .where(eq(projects.id, projectId));
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

  // Pedido já contratado (em obra) não pode ser cancelado pelo cliente por aqui.
  if (target.data === 'CANCELLED' && current.status === 'HIRED') {
    return { ok: false, error: 'Pedido contratado/em obra não pode ser cancelado. Fale com o suporte.' };
  }

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
