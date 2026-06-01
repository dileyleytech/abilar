import 'server-only';
import { projects, modules, projectPhotos, and, desc, eq } from '@abilar/db';
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
