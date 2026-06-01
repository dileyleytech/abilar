import 'server-only';
import { projects, modules, projectPhotos, and, asc, desc, eq, inArray, sql } from '@abilar/db';
import type { Project, Module, ProjectPhoto } from '@abilar/db';
import { getDb } from '@/lib/db';

/** Pedidos do cliente (mais recentes primeiro). */
export async function listMyProjects(userId: string): Promise<Project[]> {
  const db = getDb();
  return db
    .select()
    .from(projects)
    .where(eq(projects.clientId, userId))
    .orderBy(desc(projects.createdAt));
}

/** Pedidos + foto de capa + nº de móveis, para a listagem. */
export async function listMyProjectsWithCover(
  userId: string,
): Promise<(Project & { coverPath: string | null; moduleCount: number })[]> {
  const db = getDb();
  const rows = await listMyProjects(userId);
  if (rows.length === 0) return [];
  const ids = rows.map((p) => p.id);

  const [photos, counts] = await Promise.all([
    db
      .select({ projectId: projectPhotos.projectId, path: projectPhotos.path })
      .from(projectPhotos)
      .where(inArray(projectPhotos.projectId, ids))
      .orderBy(asc(projectPhotos.createdAt)),
    db
      .select({ projectId: modules.projectId, n: sql<number>`count(*)::int` })
      .from(modules)
      .where(inArray(modules.projectId, ids))
      .groupBy(modules.projectId),
  ]);

  const cover = new Map<string, string>();
  for (const ph of photos) if (!cover.has(ph.projectId)) cover.set(ph.projectId, ph.path);
  const count = new Map<string, number>();
  for (const c of counts) count.set(c.projectId, c.n);

  return rows.map((p) => ({
    ...p,
    coverPath: cover.get(p.id) ?? null,
    moduleCount: count.get(p.id) ?? 0,
  }));
}

export type ProjectDetail = {
  project: Project;
  modules: Module[];
  photos: ProjectPhoto[];
} | null;

/** Detalhe do pedido (com ownership). Null se não for do usuário. */
export async function getProjectDetail(projectId: string, userId: string): Promise<ProjectDetail> {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, userId)))
    .limit(1);
  if (!project) return null;

  const [mods, photos] = await Promise.all([
    db.select().from(modules).where(eq(modules.projectId, projectId)),
    db
      .select()
      .from(projectPhotos)
      .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.isCurrent, true))),
  ]);
  return { project, modules: mods, photos };
}
