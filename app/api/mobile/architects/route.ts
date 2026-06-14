import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { searchArchitects } from '@/lib/architects/queries';

// Autocomplete de arquitetos por nome (cliente escolhe no pedido). GET ?q=
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const q = new URL(req.url).searchParams.get('q') ?? '';
  return json({ ok: true, architects: await searchArchitects(q) });
}
