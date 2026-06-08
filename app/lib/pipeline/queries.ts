import 'server-only';
import { projectMilestones, projects, carpenterJobs, carpenterProfiles, and, eq, desc } from '@abilar/db';
import type { CarpenterJob } from '@abilar/db';
import { getDb } from '@/lib/db';

export type PipelineObra = { projectId: string; title: string; approvedPct: number };
export type Pipeline = {
  maxParallel: number;
  activeCount: number;
  overloaded: boolean;
  obras: PipelineObra[];
  jobs: CarpenterJob[];
};

/** Agenda/pipeline do marceneiro: obras da plataforma (HIRED) + obras manuais. */
export async function getPipeline(carpenterId: string): Promise<Pipeline> {
  const db = getDb();
  const [rows, jobs, prof] = await Promise.all([
    db
      .select({ projectId: projectMilestones.projectId, title: projects.title, pct: projectMilestones.pct, status: projectMilestones.status })
      .from(projectMilestones)
      .innerJoin(projects, eq(projects.id, projectMilestones.projectId))
      .where(and(eq(projectMilestones.carpenterId, carpenterId), eq(projects.status, 'HIRED'))),
    db.select().from(carpenterJobs).where(and(eq(carpenterJobs.carpenterId, carpenterId), eq(carpenterJobs.status, 'ACTIVE'))).orderBy(desc(carpenterJobs.createdAt)),
    db.select({ max: carpenterProfiles.maxParallelProjects }).from(carpenterProfiles).where(eq(carpenterProfiles.userId, carpenterId)).limit(1),
  ]);

  const byProject = new Map<string, { title: string; approved: number }>();
  for (const r of rows) {
    const cur = byProject.get(r.projectId) ?? { title: r.title, approved: 0 };
    if (r.status === 'APPROVED') cur.approved += r.pct;
    byProject.set(r.projectId, cur);
  }
  const obras: PipelineObra[] = [...byProject.entries()].map(([projectId, v]) => ({ projectId, title: v.title, approvedPct: v.approved }));

  const maxParallel = prof[0]?.max ?? 3;
  const activeCount = obras.length + jobs.length;
  return { maxParallel, activeCount, overloaded: activeCount > maxParallel, obras, jobs };
}
