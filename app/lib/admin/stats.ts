import 'server-only';
import { profiles, projects, quotes, contracts, reports, sql, eq, inArray } from '@abilar/db';
import { getDb } from '@/lib/db';

export type AdminStats = {
  usersByRole: Record<string, number>;
  projectsByStatus: Record<string, number>;
  quotesTotal: number;
  quotesAccepted: number;
  contractsSigned: number;
  reportsOpen: number;
  gmvCents: number; // soma dos contratos assinados (à vista)
};

const countMap = (rows: { k: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r.k, r.n]));

export async function getAdminStats(): Promise<AdminStats> {
  const db = getDb();
  const [usersRows, projRows, qTotal, qAccepted, cSigned, rOpen, gmv] = await Promise.all([
    db.select({ k: profiles.role, n: sql<number>`count(*)::int` }).from(profiles).groupBy(profiles.role),
    db.select({ k: projects.status, n: sql<number>`count(*)::int` }).from(projects).groupBy(projects.status),
    db.select({ n: sql<number>`count(*)::int` }).from(quotes),
    db.select({ n: sql<number>`count(*)::int` }).from(quotes).where(inArray(quotes.status, ['ACCEPTED', 'PAID'])),
    db.select({ n: sql<number>`count(*)::int` }).from(contracts).where(eq(contracts.status, 'SIGNED')),
    db.select({ n: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, 'OPEN')),
    db.select({ s: sql<number>`coalesce(sum(${contracts.valueCents}),0)::bigint` }).from(contracts).where(eq(contracts.status, 'SIGNED')),
  ]);

  return {
    usersByRole: countMap(usersRows.map((r) => ({ k: String(r.k), n: r.n }))),
    projectsByStatus: countMap(projRows.map((r) => ({ k: String(r.k), n: r.n }))),
    quotesTotal: qTotal[0]?.n ?? 0,
    quotesAccepted: qAccepted[0]?.n ?? 0,
    contractsSigned: cSigned[0]?.n ?? 0,
    reportsOpen: rOpen[0]?.n ?? 0,
    gmvCents: Number(gmv[0]?.s ?? 0),
  };
}
