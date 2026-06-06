import 'server-only';
import { contracts, projects, profiles, carpenterProfiles, eq } from '@abilar/db';
import type { ContractStatus, QuoteLineItem, Milestone } from '@abilar/shared';
import { getDb } from '@/lib/db';

export type ContractTerms = {
  items: QuoteLineItem[];
  avistaCents: number;
  parceladoCents: number | null;
  installmentValueCents: number | null;
  clientInstallments: number;
  milestones: Milestone[];
};

export type ContractView = {
  id: string;
  projectId: string;
  projectTitle: string;
  projectCity: string | null;
  status: ContractStatus;
  valueCents: number;
  terms: ContractTerms;
  clientName: string;
  carpenterName: string;
  carpenterCompany: string | null;
  acceptedByClientAt: Date | null;
  acceptedByCarpenterAt: Date | null;
  meIsClient: boolean;
  meIsCarpenter: boolean;
} | null;

/** Contrato + partes + pedido. Só os participantes (cliente/marceneiro) acessam. */
export async function getContract(contractId: string, userId: string): Promise<ContractView> {
  const db = getDb();
  const [row] = await db
    .select({
      id: contracts.id,
      projectId: contracts.projectId,
      clientId: contracts.clientId,
      carpenterId: contracts.carpenterId,
      status: contracts.status,
      valueCents: contracts.valueCents,
      terms: contracts.terms,
      acceptedByClientAt: contracts.acceptedByClientAt,
      acceptedByCarpenterAt: contracts.acceptedByCarpenterAt,
      projectTitle: projects.title,
      projectCity: projects.city,
      clientName: profiles.name,
      carpenterName: carpenterProfiles.name,
      carpenterCompany: carpenterProfiles.companyName,
    })
    .from(contracts)
    .innerJoin(projects, eq(projects.id, contracts.projectId))
    .leftJoin(profiles, eq(profiles.id, contracts.clientId))
    .leftJoin(carpenterProfiles, eq(carpenterProfiles.userId, contracts.carpenterId))
    .where(eq(contracts.id, contractId))
    .limit(1);
  if (!row) return null;
  if (row.clientId !== userId && row.carpenterId !== userId) return null;

  return {
    id: row.id,
    projectId: row.projectId,
    projectTitle: row.projectTitle,
    projectCity: row.projectCity,
    status: row.status,
    valueCents: row.valueCents,
    terms: row.terms as ContractTerms,
    clientName: row.clientName ?? 'Cliente',
    carpenterName: row.carpenterName ?? 'Marceneiro',
    carpenterCompany: row.carpenterCompany,
    acceptedByClientAt: row.acceptedByClientAt,
    acceptedByCarpenterAt: row.acceptedByCarpenterAt,
    meIsClient: row.clientId === userId,
    meIsCarpenter: row.carpenterId === userId,
  };
}

/** Contrato de um orçamento (se existir) — para mostrar links de aceite/assinatura. */
export async function getContractIdByQuote(quoteId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.quoteId, quoteId)).limit(1);
  return row?.id ?? null;
}
