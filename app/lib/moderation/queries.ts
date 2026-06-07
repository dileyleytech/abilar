import 'server-only';
import { reports, conversations, projects, profiles, eq, desc, sql } from '@abilar/db';
import type { ReportReason, ReportStatus } from '@abilar/shared';
import { getDb } from '@/lib/db';

export type ReportRow = {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: Date;
  conversationId: string;
  projectTitle: string;
  reporterName: string;
};

/** Fila de denúncias (abertas primeiro). Uso restrito ao admin (checado na página). */
export async function getReports(): Promise<ReportRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      detail: reports.detail,
      status: reports.status,
      createdAt: reports.createdAt,
      conversationId: reports.conversationId,
      projectTitle: projects.title,
      reporterName: profiles.name,
    })
    .from(reports)
    .innerJoin(conversations, eq(conversations.id, reports.conversationId))
    .innerJoin(projects, eq(projects.id, conversations.projectId))
    .leftJoin(profiles, eq(profiles.id, reports.reporterId))
    .orderBy(sql`case when ${reports.status} = 'OPEN' then 0 else 1 end`, desc(reports.createdAt));
  return rows.map((r) => ({ ...r, reporterName: r.reporterName ?? 'Usuário' }));
}
