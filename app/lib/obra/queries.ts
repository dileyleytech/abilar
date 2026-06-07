import 'server-only';
import { projectMilestones, asc, eq } from '@abilar/db';
import type { MilestoneStatus } from '@abilar/shared';
import { getDb } from '@/lib/db';

export type ObraMilestone = {
  id: string;
  ord: number;
  key: string;
  label: string;
  event: string;
  pct: number;
  amountCents: number;
  status: MilestoneStatus;
  doneAt: Date | null;
  approvedAt: Date | null;
};

export type ObraView = {
  meIsClient: boolean;
  meIsCarpenter: boolean;
  approvedPct: number;
  milestones: ObraMilestone[];
} | null;

/** Marcos da obra de um projeto (se houver) + papel do usuário. Só participantes. */
export async function getProjectMilestones(projectId: string, userId: string): Promise<ObraView> {
  const db = getDb();
  const rows = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, projectId))
    .orderBy(asc(projectMilestones.ord));
  if (rows.length === 0) return null;
  const first = rows[0]!;
  if (first.clientId !== userId && first.carpenterId !== userId) return null;

  const approvedPct = rows.filter((r) => r.status === 'APPROVED').reduce((a, r) => a + r.pct, 0);
  return {
    meIsClient: first.clientId === userId,
    meIsCarpenter: first.carpenterId === userId,
    approvedPct,
    milestones: rows.map((r) => ({
      id: r.id,
      ord: r.ord,
      key: r.key,
      label: r.label,
      event: r.event,
      pct: r.pct,
      amountCents: r.amountCents,
      status: r.status,
      doneAt: r.doneAt,
      approvedAt: r.approvedAt,
    })),
  };
}
