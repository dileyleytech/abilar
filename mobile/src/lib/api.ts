import { supabase } from './supabase';
import { config } from './config';

// Escritas com regra de negócio (mascaramento, mudança de status + notificações)
// vão pelos endpoints /api/mobile/* do Next, autenticados pelo JWT do usuário.
async function authedFetch<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  if (!config.API_URL) throw new Error('API_URL não configurada (veja .env).');

  let res: Response;
  try {
    res = await fetch(`${config.API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Confira o Wi‑Fi e a EXPO_PUBLIC_API_URL.');
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(json.error ?? 'Não foi possível concluir a ação.');
  return json;
}

export const api = {
  sendMessage: (conversationId: string, body: string) =>
    authedFetch<{ ok: true }>('/api/mobile/messages', { conversationId, body }),
  advanceMilestone: (milestoneId: string) =>
    authedFetch<{ ok: true }>('/api/mobile/milestones/advance', { milestoneId }),
  approveMilestone: (milestoneId: string) =>
    authedFetch<{ ok: true }>('/api/mobile/milestones/approve', { milestoneId }),
};
