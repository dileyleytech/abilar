import { contracts, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { finalizeIfBothSigned, ipHashFromReq } from '@/lib/api/deal';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Registra o aceite eletrônico da parte logada no contrato; fecha quando os dois
// assinam (→ obra). Espelha lib/contracts/actions.ts:acceptContract. JSON: { contractId }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const { contractId } = (await req.json().catch(() => ({}))) as { contractId?: string };
  if (!contractId) return json({ error: 'Contrato inválido.' }, 400);

  const db = getDb();
  const [c] = await db
    .select({ clientId: contracts.clientId, carpenterId: contracts.carpenterId, status: contracts.status })
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);
  if (!c || (c.clientId !== auth.userId && c.carpenterId !== auth.userId)) {
    return json({ error: 'Contrato não encontrado.' }, 404);
  }
  if (c.status !== 'DRAFT') return json({ error: 'Este contrato não está aberto para aceite.' }, 409);

  const hash = await ipHashFromReq(req);
  const set =
    c.clientId === auth.userId
      ? { acceptedByClientAt: sql`now()`, clientIpHash: hash }
      : { acceptedByCarpenterAt: sql`now()`, carpenterIpHash: hash };
  await db.update(contracts).set(set).where(eq(contracts.id, contractId));
  await finalizeIfBothSigned(contractId);
  return json({ ok: true });
}
