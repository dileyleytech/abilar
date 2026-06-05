import 'server-only';
import { projects, modules, projectPhotos, quotes, and, asc, desc, eq, exists, inArray, sql } from '@abilar/db';
import type { CarpenterProfile, Project, Module, ProjectPhoto } from '@abilar/db';
import { isWithinRadius } from '@abilar/shared';
import { getDb } from '@/lib/db';

export type FeedItem = {
  id: string;
  title: string;
  city: string | null;
  moduleCount: number;
  categories: string[];
  photoPaths: string[];
  quoted: boolean;
};

/** O projeto está na área de atendimento do marceneiro? (mesma cidade OU dentro do raio) */
function inServiceArea(
  carpenter: Pick<CarpenterProfile, 'serviceCity' | 'serviceLat' | 'serviceLng' | 'serviceRadiusKm'>,
  p: Pick<Project, 'city' | 'lat' | 'lng'>,
): boolean {
  if (p.city && p.city.trim().toLowerCase() === carpenter.serviceCity.trim().toLowerCase()) return true;
  if (p.lat && p.lng && carpenter.serviceLat && carpenter.serviceLng) {
    return isWithinRadius(
      { lat: Number(carpenter.serviceLat), lng: Number(carpenter.serviceLng) },
      { lat: Number(p.lat), lng: Number(p.lng) },
      carpenter.serviceRadiusKm,
    );
  }
  return false;
}

/** Feed do marceneiro: pedidos OPEN_FOR_QUOTES com categoria que ele atende, na sua área. */
export async function getCarpenterFeed(carpenter: CarpenterProfile): Promise<FeedItem[]> {
  const cats = carpenter.categories as string[];
  if (cats.length === 0) return [];
  const db = getDb();

  // Candidatos: abertos + têm ao menos um móvel numa categoria que ele atende.
  const hasMatchingModule = db
    .select({ one: sql`1` })
    .from(modules)
    .where(and(eq(modules.projectId, projects.id), inArray(modules.type, cats)));

  const candidates = await db
    .select({ id: projects.id, title: projects.title, city: projects.city, lat: projects.lat, lng: projects.lng })
    .from(projects)
    .where(and(eq(projects.status, 'OPEN_FOR_QUOTES'), exists(hasMatchingModule)))
    .orderBy(desc(projects.createdAt));

  const eligible = candidates.filter((p) => inServiceArea(carpenter, p));
  if (eligible.length === 0) return [];
  const ids = eligible.map((p) => p.id);

  const [photos, mods, myQuotes] = await Promise.all([
    db
      .select({ projectId: projectPhotos.projectId, path: projectPhotos.path })
      .from(projectPhotos)
      .where(inArray(projectPhotos.projectId, ids))
      .orderBy(asc(projectPhotos.createdAt)),
    db
      .select({ projectId: modules.projectId, type: modules.type })
      .from(modules)
      .where(inArray(modules.projectId, ids)),
    db
      .select({ projectId: quotes.projectId })
      .from(quotes)
      .where(and(eq(quotes.carpenterId, carpenter.userId), inArray(quotes.projectId, ids))),
  ]);
  const quotedSet = new Set(myQuotes.map((q) => q.projectId));

  const photosByProject = new Map<string, string[]>();
  for (const ph of photos) {
    const arr = photosByProject.get(ph.projectId) ?? [];
    if (arr.length < 6) arr.push(ph.path);
    photosByProject.set(ph.projectId, arr);
  }
  const count = new Map<string, number>();
  const catsByProject = new Map<string, Set<string>>();
  for (const m of mods) {
    count.set(m.projectId, (count.get(m.projectId) ?? 0) + 1);
    const set = catsByProject.get(m.projectId) ?? new Set<string>();
    set.add(m.type);
    catsByProject.set(m.projectId, set);
  }

  return eligible.map((p) => ({
    id: p.id,
    title: p.title,
    city: p.city,
    moduleCount: count.get(p.id) ?? 0,
    categories: [...(catsByProject.get(p.id) ?? [])],
    photoPaths: photosByProject.get(p.id) ?? [],
    quoted: quotedSet.has(p.id),
  }));
}

export type CarpenterProjectView = { project: Project; modules: Module[]; photos: ProjectPhoto[] } | null;

/** Detalhe (read-only) de um pedido aberto, se for elegível para este marceneiro. */
export async function getProjectForCarpenter(
  projectId: string,
  carpenter: CarpenterProfile,
): Promise<CarpenterProjectView> {
  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.status !== 'OPEN_FOR_QUOTES') return null;
  if (!inServiceArea(carpenter, project)) return null;

  const [mods, photos] = await Promise.all([
    db.select().from(modules).where(eq(modules.projectId, projectId)),
    db
      .select()
      .from(projectPhotos)
      .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.isCurrent, true))),
  ]);

  // Elegível só se tem ao menos um móvel numa categoria que ele atende.
  const cats = new Set(carpenter.categories as string[]);
  if (!mods.some((m) => cats.has(m.type))) return null;

  return { project, modules: mods, photos };
}
