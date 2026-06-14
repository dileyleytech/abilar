import { getCarpenterReport } from '@/lib/reports/queries';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Relatório de ganhos do marceneiro (mesma agregação da web).
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  return json(await getCarpenterReport(auth.userId));
}
