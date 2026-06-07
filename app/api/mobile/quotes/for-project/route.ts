import { quotes, projects, carpenterProfiles, contracts, eq, and } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getActivePricingConfig } from '@/lib/pricing/config';
import { computeClientPrices } from '@/lib/api/deal';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Orçamentos de um pedido, com preços face ao cliente (servidor) + estado do
// contrato. Cliente vê todos; marceneiro vê só o seu. JSON: { projectId }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { projectId } = (await req.json().catch(() => ({}))) as { projectId?: string };
  if (!projectId) return json({ error: 'Pedido inválido.' }, 400);

  const db = getDb();
  const [proj] = await db
    .select({ clientId: projects.clientId, status: projects.status })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) return json({ error: 'Pedido não encontrado.' }, 404);

  const isClient = proj.clientId === auth.userId;
  const where = isClient
    ? eq(quotes.projectId, projectId)
    : and(eq(quotes.projectId, projectId), eq(quotes.carpenterId, auth.userId));

  const rows = await db
    .select({
      quoteId: quotes.id,
      carpenterId: quotes.carpenterId,
      baseValueCents: quotes.baseValueCents,
      maxInstallments: quotes.maxInstallments,
      dilutionSharePct: quotes.dilutionSharePct,
      status: quotes.status,
      note: quotes.note,
      carpenterName: carpenterProfiles.name,
      contractId: contracts.id,
      contractStatus: contracts.status,
      clientSignedAt: contracts.acceptedByClientAt,
      carpenterSignedAt: contracts.acceptedByCarpenterAt,
    })
    .from(quotes)
    .leftJoin(carpenterProfiles, eq(carpenterProfiles.userId, quotes.carpenterId))
    .leftJoin(contracts, eq(contracts.quoteId, quotes.id))
    .where(where);

  if (rows.length === 0) return json({ projectStatus: proj.status, isClient, quotes: [] });

  const config = await getActivePricingConfig();
  if (!config) return json({ error: 'Configuração de preço indisponível.' }, 503);

  const list = rows.map((r) => {
    const prices = computeClientPrices(config, r.baseValueCents, r.maxInstallments, Number(r.dilutionSharePct));
    return {
      quoteId: r.quoteId,
      carpenterName: r.carpenterName ?? 'Marceneiro',
      status: r.status,
      note: r.note,
      ...prices,
      contractId: r.contractId ?? null,
      contractStatus: r.contractStatus ?? null,
      clientSigned: !!r.clientSignedAt,
      carpenterSigned: !!r.carpenterSignedAt,
    };
  });
  return json({ projectStatus: proj.status, isClient, quotes: list });
}
