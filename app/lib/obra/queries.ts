import 'server-only';
import { projectMilestones, milestoneEvidences, asc, desc, eq, inArray } from '@abilar/db';
import type { MilestoneStatus } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { signedProjectPhotoUrl } from '@/lib/storage';

export type EvidenceItem = {
  id: string;
  comment: string | null;
  photoUrls: string[]; // URLs assinadas
  createdAt: Date;
};

export type ObraMilestone = {
  id: string;
  ord: number;
  key: string;
  label: string;
  event: string;
  pct: number;
  amountCents: number;
  status: MilestoneStatus;
  evidences: EvidenceItem[];
  doneAt: Date | null;
  approvedAt: Date | null;
};

export type ObraView = {
  meIsClient: boolean;
  meIsCarpenter: boolean;
  approvedPct: number;
  milestones: ObraMilestone[];
} | null;

/** Marcos da obra + evidências (fotos/comentários) + papel do usuário. Só participantes. */
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

  // Evidências de todas as etapas (mais recentes primeiro).
  const evRows = await db
    .select({
      id: milestoneEvidences.id,
      milestoneId: milestoneEvidences.milestoneId,
      comment: milestoneEvidences.comment,
      photos: milestoneEvidences.photos,
      createdAt: milestoneEvidences.createdAt,
    })
    .from(milestoneEvidences)
    .where(inArray(milestoneEvidences.milestoneId, rows.map((r) => r.id)))
    .orderBy(desc(milestoneEvidences.createdAt));

  const evByMilestone = new Map<string, EvidenceItem[]>();
  for (const e of evRows) {
    const paths = (e.photos as string[]) ?? [];
    const photoUrls = (await Promise.all(paths.map((p) => signedProjectPhotoUrl(p)))).filter((u): u is string => !!u);
    const list = evByMilestone.get(e.milestoneId) ?? [];
    list.push({ id: e.id, comment: e.comment, photoUrls, createdAt: e.createdAt });
    evByMilestone.set(e.milestoneId, list);
  }

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
      evidences: evByMilestone.get(r.id) ?? [],
      doneAt: r.doneAt,
      approvedAt: r.approvedAt,
    })),
  };
}
