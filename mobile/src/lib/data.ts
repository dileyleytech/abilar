import { supabase } from './supabase';
import type { MilestoneStatus, ProjectStatus } from './types';

export type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  city: string | null;
  created_at: string;
};

export type MilestoneRow = {
  id: string;
  ord: number;
  key: string;
  label: string;
  event: string;
  pct: number;
  amount_cents: number;
  status: MilestoneStatus;
  done_at: string | null;
  approved_at: string | null;
};

export type ConversationRow = {
  id: string;
  status: string;
  client_id: string;
  carpenter_id: string;
  project_id: string;
  created_at: string;
  projects: { title: string } | null;
  otherName: string;
};

export type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  redacted_body: string | null;
  attachments: string[] | null;
  created_at: string;
};

const PROJECT_COLS = 'id, title, status, city, created_at';

export async function listClientProjects(userId: string): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLS)
    .eq('client_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[]) ?? [];
}

/** Projetos do usuário num conjunto de status (a RLS limita ao que ele pode ver:
 *  cliente → os seus; marceneiro → aqueles em que tem conversa/obra). */
export async function listProjectsByStatus(statuses: ProjectStatus[]): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLS)
    .in('status', statuses)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[]) ?? [];
}

// Contagem de orçamentos por projeto (RLS: cliente lê quotes dos próprios pedidos).
export async function quoteCountsByProject(projectIds: string[]): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const { data } = await supabase.from('quotes').select('project_id').in('project_id', projectIds);
  const counts: Record<string, number> = {};
  for (const r of (data as { project_id: string }[]) ?? []) counts[r.project_id] = (counts[r.project_id] ?? 0) + 1;
  return counts;
}

export async function listOpenProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLS)
    .eq('status', 'OPEN_FOR_QUOTES')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as ProjectRow[]) ?? [];
}

export type ModuleRow = {
  id: string;
  ambiente: string | null;
  type: string;
  label: string | null;
  work_type: string | null;
  width_mm: number;
  height_mm: number;
  depth_mm: number;
};

// Móveis do pedido (RLS: cliente lê os do próprio projeto).
export async function listModules(projectId: string): Promise<ModuleRow[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('id, ambiente, type, label, work_type, width_mm, height_mm, depth_mm')
    .eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data as ModuleRow[]) ?? [];
}

// Fotos atuais por módulo (RLS: dono / marceneiro em pedido aberto).
export async function listModulePhotos(projectId: string): Promise<{ module_id: string; path: string }[]> {
  const { data } = await supabase
    .from('project_photos')
    .select('module_id, path')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .not('module_id', 'is', null);
  return (data as { module_id: string; path: string }[]) ?? [];
}

// Todas as fotos atuais do pedido (cômodo + móveis) — paths. Exclui PDF do arquiteto.
export async function listProjectPhotos(projectId: string): Promise<string[]> {
  const { data } = await supabase
    .from('project_photos')
    .select('path, kind')
    .eq('project_id', projectId)
    .eq('is_current', true);
  return ((data as { path: string; kind: string }[]) ?? []).filter((p) => p.kind !== 'ARCHITECT_PDF').map((p) => p.path);
}

export type ExtLineItem = { materialId?: string | null; name: string; category: string; unit: string; qty: number; unitCostCents: number };
export type ExternalQuoteRow = {
  id: string;
  client_name: string;
  title: string;
  line_items: ExtLineItem[];
  margin_pct: number;
  subtotal_cost_cents: number;
  value_cents: number;
  status: string;
  note: string | null;
  created_at: string;
};

export async function listExternalQuotes(): Promise<ExternalQuoteRow[]> {
  const { data, error } = await supabase
    .from('external_quotes')
    .select('id, client_name, title, line_items, margin_pct, subtotal_cost_cents, value_cents, status, note, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ExternalQuoteRow[]) ?? [];
}

function computeExt(items: ExtLineItem[], marginPct: number) {
  const subtotal = items.reduce((a, i) => a + Math.round(i.qty * i.unitCostCents), 0);
  return { subtotal, value: Math.round(subtotal * (1 + Math.max(0, marginPct) / 100)) };
}

export async function saveExternalQuote(
  carpenterId: string,
  input: { clientName: string; title: string; lineItems: ExtLineItem[]; marginPct: number; note?: string },
  id?: string,
): Promise<void> {
  const { subtotal, value } = computeExt(input.lineItems, input.marginPct);
  const values = {
    client_name: input.clientName,
    title: input.title,
    line_items: input.lineItems,
    margin_pct: Math.round(input.marginPct),
    subtotal_cost_cents: subtotal,
    value_cents: value,
    note: input.note ?? null,
  };
  const { error } = id
    ? await supabase.from('external_quotes').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id)
    : await supabase.from('external_quotes').insert({ carpenter_id: carpenterId, ...values });
  if (error) throw new Error(error.message);
}

export type JobRow = {
  id: string;
  title: string;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  note: string | null;
};

export async function listJobs(): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from('carpenter_jobs')
    .select('id, title, client_name, start_date, end_date, status, note')
    .eq('status', 'ACTIVE')
    .order('start_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as JobRow[]) ?? [];
}

export async function saveJob(
  carpenterId: string,
  input: { title: string; clientName?: string; startDate?: string; endDate?: string; note?: string },
  id?: string,
): Promise<void> {
  const values = {
    title: input.title,
    client_name: input.clientName ?? null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    note: input.note ?? null,
  };
  const { error } = id
    ? await supabase.from('carpenter_jobs').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id)
    : await supabase.from('carpenter_jobs').insert({ carpenter_id: carpenterId, ...values });
  if (error) throw new Error(error.message);
}

export async function setJobDone(id: string): Promise<void> {
  const { error } = await supabase.from('carpenter_jobs').update({ status: 'DONE' }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('carpenter_jobs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setExternalQuoteStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('external_quotes').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteExternalQuote(id: string): Promise<void> {
  const { error } = await supabase.from('external_quotes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type MaterialRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_cost_cents: number;
  active: boolean;
};

// Catálogo de custo do marceneiro (RLS: dono). Ativos primeiro.
export async function listMaterials(): Promise<MaterialRow[]> {
  const { data, error } = await supabase
    .from('carpenter_materials')
    .select('id, name, category, unit, unit_cost_cents, active')
    .order('active', { ascending: false })
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MaterialRow[]) ?? [];
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const { data } = await supabase.from('projects').select(PROJECT_COLS).eq('id', id).single();
  return (data as ProjectRow) ?? null;
}

export async function listMilestones(projectId: string): Promise<MilestoneRow[]> {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('id, ord, key, label, event, pct, amount_cents, status, done_at, approved_at')
    .eq('project_id', projectId)
    .order('ord', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MilestoneRow[]) ?? [];
}

export async function listConversations(userId: string): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, status, client_id, carpenter_id, project_id, created_at, projects(title)')
    .or(`client_id.eq.${userId},carpenter_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data as unknown as ConversationRow[]) ?? [];

  // Nome da outra parte (uma consulta só em profiles).
  const otherIds = Array.from(new Set(rows.map((r) => (r.client_id === userId ? r.carpenter_id : r.client_id))));
  const names = new Map<string, string>();
  if (otherIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, name').in('id', otherIds);
    for (const p of (profs as { id: string; name: string | null }[]) ?? []) names.set(p.id, p.name ?? '');
  }
  return rows.map((r) => {
    const otherId = r.client_id === userId ? r.carpenter_id : r.client_id;
    const fallback = r.client_id === userId ? 'Marceneiro' : 'Cliente';
    return { ...r, otherName: names.get(otherId) || fallback };
  });
}

export async function getConversation(id: string, userId: string): Promise<ConversationRow | null> {
  const { data } = await supabase
    .from('conversations')
    .select('id, status, client_id, carpenter_id, project_id, created_at, projects(title)')
    .eq('id', id)
    .single();
  if (!data) return null;
  const row = data as unknown as ConversationRow;
  const otherId = row.client_id === userId ? row.carpenter_id : row.client_id;
  const { data: prof } = await supabase.from('profiles').select('name').eq('id', otherId).single();
  return { ...row, otherName: (prof as { name: string | null } | null)?.name || (row.client_id === userId ? 'Marceneiro' : 'Cliente') };
}

export type EvidenceRow = {
  id: string;
  comment: string | null;
  photos: string[] | null;
  created_at: string;
};

export async function listEvidences(milestoneId: string): Promise<EvidenceRow[]> {
  const { data, error } = await supabase
    .from('milestone_evidences')
    .select('id, comment, photos, created_at')
    .eq('milestone_id', milestoneId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as EvidenceRow[]) ?? [];
}

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, link, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data as NotificationRow[]) ?? [];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}

export type ContractTerms = {
  items?: { name: string; qty: number; unit: string; lineTotalCents?: number }[];
  avistaCents?: number;
  parceladoCents?: number | null;
  installmentValueCents?: number | null;
  clientInstallments?: number;
  milestones?: { key: string; label: string; event: string; pct: number }[];
};

export type ContractView = {
  id: string;
  status: string;
  value_cents: number;
  terms: ContractTerms;
  client_id: string;
  carpenter_id: string;
  project_id: string;
  accepted_by_client_at: string | null;
  accepted_by_carpenter_at: string | null;
  projectTitle: string;
  otherName: string;
  meIsClient: boolean;
};

export async function getContract(id: string, userId: string): Promise<ContractView | null> {
  const { data } = await supabase
    .from('contracts')
    .select('id, status, value_cents, terms, client_id, carpenter_id, project_id, accepted_by_client_at, accepted_by_carpenter_at, projects(title)')
    .eq('id', id)
    .single();
  if (!data) return null;
  const row = data as unknown as ContractView & { projects: { title: string } | null };
  if (row.client_id !== userId && row.carpenter_id !== userId) return null;
  const meIsClient = row.client_id === userId;
  const otherId = meIsClient ? row.carpenter_id : row.client_id;
  const { data: prof } = await supabase.from('profiles').select('name').eq('id', otherId).single();
  return {
    ...row,
    projectTitle: row.projects?.title ?? 'Projeto',
    otherName: (prof as { name: string | null } | null)?.name || (meIsClient ? 'Marceneiro' : 'Cliente'),
    meIsClient,
  };
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, redacted_body, attachments, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MessageRow[]) ?? [];
}
