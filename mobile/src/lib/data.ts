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

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, redacted_body, attachments, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MessageRow[]) ?? [];
}
