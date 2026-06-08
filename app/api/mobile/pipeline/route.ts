import { getPipeline } from '@/lib/pipeline/queries';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Agenda/pipeline do marceneiro (mesma agregação da web).
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  return json(await getPipeline(auth.userId));
}
