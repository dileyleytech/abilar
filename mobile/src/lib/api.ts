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

async function getJson<T>(path: string): Promise<T> {
  if (!config.API_URL) throw new Error('API_URL não configurada (veja .env).');
  const token = await authToken();
  return handle<T>(fetch(`${config.API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } }));
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

async function postForm<T>(path: string, fields: Record<string, string>, photos: Photo[], fileField = 'photos'): Promise<T> {
  if (!config.API_URL) throw new Error('API_URL não configurada (veja .env).');
  const token = await authToken();
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  // RN aceita { uri, name, type } como "arquivo" no FormData.
  for (const ph of photos) fd.append(fileField, ph as unknown as Blob);
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
  signedUrls: (paths: string[], ctx: { conversationId?: string; milestoneId?: string; projectId?: string }) =>
    postJson<{ urls: string[] }>('/api/mobile/signed-urls', { paths, ...ctx }),
  report: (conversationId: string, reason: string, detail: string) =>
    postJson<{ ok: true }>('/api/mobile/reports', { conversationId, reason, detail }),
  updateName: (name: string) => postJson<{ ok: true }>('/api/mobile/profile', { name }),
  deleteAccount: () => postJson<{ ok: true }>('/api/mobile/account/delete', {}),
  markNotificationsRead: () => postJson<{ ok: true }>('/api/mobile/notifications/read', {}),

  // --- Sprint: criar pedido · orçamento · contrato ---
  createProject: (input: { title: string; sourceType?: string; city?: string; cep?: string; lat?: number; lng?: number }) =>
    postJson<{ ok: true; projectId: string }>('/api/mobile/projects', input),
  uploadProjectPdf: (projectId: string, file: Photo) =>
    postForm<{ ok: true }>('/api/mobile/projects/pdf', { projectId }, [file], 'file'),
  addModule: (
    input: { projectId: string; ambiente?: string; category: string; label?: string; workType?: string; widthCm: number; heightCm: number; depthCm: number },
    photo?: Photo | null,
  ) => {
    const fields: Record<string, string> = {
      projectId: input.projectId,
      category: input.category,
      widthCm: String(input.widthCm),
      heightCm: String(input.heightCm),
      depthCm: String(input.depthCm),
    };
    if (input.ambiente) fields.ambiente = input.ambiente;
    if (input.label) fields.label = input.label;
    if (input.workType) fields.workType = input.workType;
    return postForm<{ ok: true; moduleId: string }>('/api/mobile/modules', fields, photo ? [photo] : [], 'photo');
  },
  updateModule: (
    moduleId: string,
    input: { ambiente?: string; category: string; label?: string; workType?: string; widthCm: number; heightCm: number; depthCm: number },
    photo?: Photo | null,
  ) => {
    const fields: Record<string, string> = {
      moduleId,
      category: input.category,
      widthCm: String(input.widthCm),
      heightCm: String(input.heightCm),
      depthCm: String(input.depthCm),
    };
    if (input.ambiente) fields.ambiente = input.ambiente;
    if (input.label) fields.label = input.label;
    if (input.workType) fields.workType = input.workType;
    return postForm<{ ok: true }>('/api/mobile/modules/update', fields, photo ? [photo] : [], 'photo');
  },
  deleteModule: (moduleId: string) => postJson<{ ok: true }>('/api/mobile/modules/delete', { moduleId }),
  publishProject: (projectId: string) => postJson<{ ok: true }>('/api/mobile/projects/publish', { projectId }),
  renameProject: (projectId: string, title: string) => postJson<{ ok: true }>('/api/mobile/projects/rename', { projectId, title }),
  quotesForProject: (projectId: string) =>
    postJson<{ projectStatus: string; isClient: boolean; quotes: QuoteView[] }>('/api/mobile/quotes/for-project', { projectId }),
  preapproveQuote: (quoteId: string) => postJson<{ ok: true; conversationId: string }>('/api/mobile/quotes/preapprove', { quoteId }),
  acceptQuote: (quoteId: string) => postJson<{ ok: true; contractId: string }>('/api/mobile/quotes/accept', { quoteId }),
  previewQuote: (input: { baseValueCents: number; maxInstallments: number; dilutionSharePct: number }) =>
    postJson<{ preview: QuotePreview | null }>('/api/mobile/quotes/preview', input),
  sendQuote: (input: {
    projectId: string;
    baseValueCents: number;
    maxInstallments: number;
    dilutionSharePct: number;
    note?: string;
    lineItems?: QuoteLineItem[];
    marginPct?: number;
  }) => postJson<{ ok: true }>('/api/mobile/quotes/send', input),
  signContract: (contractId: string) => postJson<{ ok: true }>('/api/mobile/contracts/sign', { contractId }),

  // Catálogo de custo (marceneiro)
  createMaterial: (input: { name: string; category: string; unit: string; unitCostCents: number }) =>
    postJson<{ ok: true; id: string }>('/api/mobile/materials', input),
  updateMaterial: (id: string, input: { name: string; category: string; unit: string; unitCostCents: number }) =>
    postJson<{ ok: true }>('/api/mobile/materials/update', { id, ...input }),
  setMaterialActive: (id: string, active: boolean) => postJson<{ ok: true }>('/api/mobile/materials/active', { id, active }),

  // Perfil profissional do marceneiro (onboarding)
  getCarpenterProfile: () => getJson<{ profile: CarpenterProfileRow | null }>('/api/mobile/carpenter/profile'),
  saveCarpenterProfile: (input: CarpenterOnboarding) => postJson<{ ok: true }>('/api/mobile/carpenter/profile', input),
};

export type CarpenterOnboarding = {
  personType: string;
  name: string;
  companyName?: string;
  cnpjOrCpf: string;
  serviceCity: string;
  serviceCep: string;
  serviceRadiusKm: number;
  serviceLat?: number;
  serviceLng?: number;
  categories: string[];
  bio?: string;
};

export type CarpenterProfileRow = {
  name: string;
  personType: string;
  companyName: string | null;
  cnpjOrCpf: string;
  serviceCity: string;
  serviceCep: string;
  serviceRadiusKm: number;
  categories: string[];
  bio: string | null;
};

export type QuoteLineItem = {
  materialId?: string | null;
  name: string;
  category: string;
  unit: string;
  qty: number;
  unitCostCents: number;
};

// Busca de CEP (cidade + coords) — endpoint público do Next, sem auth.
export async function lookupCep(cep: string): Promise<{ city?: string; lat?: number; lng?: number } | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8 || !config.API_URL) return null;
  try {
    const res = await fetch(`${config.API_URL}/api/cep?cep=${digits}`);
    const d = (await res.json()) as { ok?: boolean; city?: string; lat?: number; lng?: number };
    return d?.ok ? { city: d.city, lat: d.lat ?? undefined, lng: d.lng ?? undefined } : null;
  } catch {
    return null;
  }
}

export type QuoteView = {
  quoteId: string;
  carpenterName: string;
  status: string;
  note: string | null;
  items: { name: string; qty: number; unit: string }[];
  avistaCents: number;
  parceladoCents: number | null;
  installmentValueCents: number | null;
  clientInstallments: number;
  contractId: string | null;
  contractStatus: string | null;
  clientSigned: boolean;
  carpenterSigned: boolean;
};

export type QuotePreview = {
  avista: { youGetCents: number; clientPaysCents: number };
  parcelado: { youGetCents: number; clientPaysCents: number; installmentCents: number; n: number } | null;
  valid: boolean;
  warning: string | null;
};
