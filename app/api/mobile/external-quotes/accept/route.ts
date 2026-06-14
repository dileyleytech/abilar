import { acceptExternalQuote } from '@/lib/external-quotes/accept';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Aceita um avulso → cria a obra externa na agenda. JSON: { id }.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return json({ error: 'Orçamento inválido.' }, 400);
  const r = await acceptExternalQuote(auth.userId, id);
  if (!r.ok) return json({ error: r.error }, 404);
  return json({ ok: true });
}
