import 'server-only';
import { projects, modules, projectPhotos, and, asc, desc, eq, inArray } from '@abilar/db';
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

/** Pedidos + caminho da foto de capa (a 1ª foto de cada pedido), para a listagem. */
export async function listMyProjectsWithCover(
  userId: string,
): Promise<(Project & { coverPath: string | null })[]> {
  const db = getDb();
  const rows = await listMyProjects(userId);
  if (rows.length === 0) return [];

  const photos = await db
    .select({ projectId: projectPhotos.projectId, path: projectPhotos.path })
    .from(projectPhotos)
    .where(inArray(projectPhotos.projectId, rows.map((p) => p.id)))
    .orderBy(asc(projectPhotos.createdAt));

  const cover = new Map<string, string>();
  for (const ph of photos) if (!cover.has(ph.projectId)) cover.set(ph.projectId, ph.path);
  return rows.map((p) => ({ ...p, coverPath: cover.get(p.id) ?? null }));
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
