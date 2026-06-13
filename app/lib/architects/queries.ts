import 'server-only';
import { applyPercent } from '@abilar/shared';
import { architectProfiles, projects, profiles, quotes, contracts, eq, and, ilike, asc, desc, inArray } from '@abilar/db';
import { getDb } from '@/lib/db';

export type ArchitectOption = { userId: string; name: string; cau: string | null };

/** Busca arquitetos ativos por nome (autocomplete público no pedido). */
export async function searchArchitects(q: string): Promise<ArchitectOption[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const db = getDb();
  return db
    .select({ userId: architectProfiles.userId, name: architectProfiles.name, cau: architectProfiles.cau })
    .from(architectProfiles)
    .where(and(eq(architectProfiles.active, true), ilike(architectProfiles.name, `%${term}%`)))
    .orderBy(asc(architectProfiles.name))
    .limit(8);
}

/** Resolve um arquiteto ATIVO por id (autocomplete) — null se não existir/inativo. */
export async function activeArchitectById(userId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db.select({ id: architectProfiles.userId }).from(architectProfiles).where(and(eq(architectProfiles.userId, userId), eq(architectProfiles.active, true))).limit(1);
  return row?.id ?? null;
}

/** Resolve um arquiteto ATIVO pelo código de indicação — null se inválido/inativo. */
export async function activeArchitectByCode(code: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db.select({ id: architectProfiles.userId }).from(architectProfiles).where(and(eq(architectProfiles.referralCode, code.toUpperCase()), eq(architectProfiles.active, true))).limit(1);
  return row?.id ?? null;
}

/** Nome do arquiteto ativo por código (para exibir "indicado por" no pedido). */
export async function activeArchitectBriefByCode(code: string): Promise<ArchitectOption | null> {
  const db = getDb();
  const [row] = await db
    .select({ userId: architectProfiles.userId, name: architectProfiles.name, cau: architectProfiles.cau })
    .from(architectProfiles)
    .where(and(eq(architectProfiles.referralCode, code.toUpperCase()), eq(architectProfiles.active, true)))
    .limit(1);
  return row ?? null;
}

export type ArchitectDashboard = {
  referralCode: string | null;
  commissionPercent: number;
  earnedCents: number; // comissão de contratos assinados
  pendingCount: number; // projetos vinculados ainda não contratados
  projects: { id: string; title: string; status: string; clientName: string | null; commissionCents: number | null }[];
};

/** Painel do arquiteto: seus projetos + comissão acumulada (contratos assinados). */
export async function getArchitectDashboard(userId: string): Promise<ArchitectDashboard> {
  const db = getDb();
  const [me] = await db
    .select({ referralCode: architectProfiles.referralCode, commissionPercent: architectProfiles.commissionPercent })
    .from(architectProfiles)
    .where(eq(architectProfiles.userId, userId))
    .limit(1);
  const pct = Number(me?.commissionPercent ?? 0);

  const projRows = await db
    .select({ id: projects.id, title: projects.title, status: projects.status, clientName: profiles.name })
    .from(projects)
    .leftJoin(profiles, eq(profiles.id, projects.clientId))
    .where(eq(projects.architectId, userId))
    .orderBy(desc(projects.createdAt));

  // Comissão = pct × V (baseValueCents do orçamento) dos projetos com contrato assinado.
  const ids = projRows.map((p) => p.id);
  const signed = ids.length
    ? await db
        .select({ projectId: contracts.projectId, baseValueCents: quotes.baseValueCents })
        .from(contracts)
        .innerJoin(quotes, eq(quotes.id, contracts.quoteId))
        .where(and(eq(contracts.status, 'SIGNED'), inArray(contracts.projectId, ids)))
    : [];
  const commByProject = new Map(signed.map((s) => [s.projectId, applyPercent(s.baseValueCents, pct)]));

  let earnedCents = 0;
  let pendingCount = 0;
  const list = projRows.map((p) => {
    const commissionCents = commByProject.get(p.id) ?? null;
    if (commissionCents != null) earnedCents += commissionCents;
    else pendingCount += 1;
    return { ...p, status: String(p.status), commissionCents };
  });

  return { referralCode: me?.referralCode ?? null, commissionPercent: pct, earnedCents, pendingCount, projects: list };
}
