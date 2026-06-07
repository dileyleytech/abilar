import { supabase } from './supabase';
import { config } from './config';

export type Photo = { uri: string; name: string; type: string };

async function authToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error('Sessão expirada. Entre novamente.');
  return t;
}

async function handle<T>(p: Promise<Response>): Promise<T> {
  let res: Response;
  try {
    res = await p;
  } catch {
    throw new Error('Sem conexão com o servidor. Confira o Wi‑Fi e a EXPO_PUBLIC_API_URL.');
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(json.error ?? 'Não foi possível concluir a ação.');
  return json;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!config.API_URL) throw new Error('API_URL não configurada (veja .env).');
  const token = await authToken();
  return handle<T>(
    fetch(`${config.API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  );
}

async function postForm<T>(path: string, fields: Record<string, string>, photos: Photo[]): Promise<T> {
  if (!config.API_URL) throw new Error('API_URL não configurada (veja .env).');
  const token = await authToken();
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  // RN aceita { uri, name, type } como "arquivo" no FormData.
  for (const ph of photos) fd.append('photos', ph as unknown as Blob);
  return handle<T>(
    fetch(`${config.API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // sem Content-Type: o RN define o boundary
      body: fd,
    }),
  );
}

export const api = {
  sendMessage: (conversationId: string, body: string, photos: Photo[] = []) =>
    postForm<{ ok: true }>('/api/mobile/messages', { conversationId, body }, photos),
  advanceMilestone: (milestoneId: string) => postJson<{ ok: true }>('/api/mobile/milestones/advance', { milestoneId }),
  approveMilestone: (milestoneId: string) => postJson<{ ok: true }>('/api/mobile/milestones/approve', { milestoneId }),
  concludeMilestone: (milestoneId: string, comment: string, photos: Photo[]) =>
    postForm<{ ok: true }>('/api/mobile/milestones/conclude', { milestoneId, comment }, photos),
  signedUrls: (paths: string[], ctx: { conversationId?: string; milestoneId?: string }) =>
    postJson<{ urls: string[] }>('/api/mobile/signed-urls', { paths, ...ctx }),
  report: (conversationId: string, reason: string, detail: string) =>
    postJson<{ ok: true }>('/api/mobile/reports', { conversationId, reason, detail }),
  deleteAccount: () => postJson<{ ok: true }>('/api/mobile/account/delete', {}),
  markNotificationsRead: () => postJson<{ ok: true }>('/api/mobile/notifications/read', {}),
};
