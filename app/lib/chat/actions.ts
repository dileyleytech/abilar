'use server';

import { revalidatePath } from 'next/cache';
import { maskContact, reportInputSchema, type ConversationStatus } from '@abilar/shared';
import { conversations, messages, reports, quotes, projects, eq, and, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { getSessionProfile } from '@/lib/auth/session';
import { countUnreadMessages } from '@/lib/chat/queries';
import { notify } from '@/lib/notifications/notify';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PROJECT_PHOTOS_BUCKET, signedProjectPhotoUrl } from '@/lib/storage';

export type PreApproveResult = { ok: true; conversationId: string } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_CHAT_PHOTOS = 4;

/** Total de mensagens não lidas do usuário logado (badge do header). */
export async function getMyUnreadCount(): Promise<number> {
  const profile = await getSessionProfile();
  if (!profile) return 0;
  return countUnreadMessages(profile.id);
}

/** Cliente PRÉ-APROVA um orçamento → cria a conversa e libera o chat (§7.8). */
export async function preApproveQuote(quoteId: string): Promise<PreApproveResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const db = getDb();

  // Carrega o orçamento + valida que o pedido é do cliente logado.
  const [row] = await db
    .select({
      quoteId: quotes.id,
      projectId: quotes.projectId,
      carpenterId: quotes.carpenterId,
      clientId: projects.clientId,
      projectStatus: projects.status,
    })
    .from(quotes)
    .innerJoin(projects, eq(projects.id, quotes.projectId))
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!row || row.clientId !== profile.id) return { ok: false, error: 'Orçamento não encontrado.' };

  // Marca o orçamento como pré-aprovado e o pedido em negociação.
  await db.update(quotes).set({ status: 'PRE_APPROVED', updatedAt: sql`now()` }).where(eq(quotes.id, quoteId));
  if (row.projectStatus === 'OPEN_FOR_QUOTES') {
    await db.update(projects).set({ status: 'IN_NEGOTIATION', updatedAt: sql`now()` }).where(eq(projects.id, row.projectId));
  }

  // Cria a conversa (1 por projeto+marceneiro) ou reaproveita a existente.
  const [created] = await db
    .insert(conversations)
    .values({ projectId: row.projectId, clientId: profile.id, carpenterId: row.carpenterId, quoteId })
    .onConflictDoNothing({ target: [conversations.projectId, conversations.carpenterId] })
    .returning({ id: conversations.id });

  let conversationId = created?.id;
  if (!conversationId) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.projectId, row.projectId), eq(conversations.carpenterId, row.carpenterId)))
      .limit(1);
    conversationId = existing?.id;
  }
  if (!conversationId) return { ok: false, error: 'Não foi possível abrir a conversa.' };

  await notify(row.carpenterId, {
    title: 'Seu orçamento foi pré-aprovado! 🎉',
    body: 'O cliente liberou o chat. Combine os detalhes para fechar.',
    link: `/conversas/${conversationId}`,
  });
  revalidatePath(`/pedidos/${row.projectId}`);
  return { ok: true, conversationId };
}

/** Marca a conversa como lida até agora (zera as não lidas para este usuário). */
export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const db = getDb();
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== profile.id && conv.carpenterId !== profile.id)) {
    return { ok: false, error: 'Conversa não encontrada.' };
  }
  const col = conv.clientId === profile.id ? { clientLastReadAt: sql`now()` } : { carpenterLastReadAt: sql`now()` };
  await db.update(conversations).set(col).where(eq(conversations.id, conversationId));
  revalidatePath('/conversas');
  return { ok: true };
}

/** Envia uma mensagem no chat (texto e/ou fotos), com mascaramento de contato (§7.8).
 *  Recebe FormData: conversationId, body, photos[] (0..N). Fotos sobem via service-role. */
export async function sendMessage(formData: FormData): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };

  const conversationId = String(formData.get('conversationId') ?? '');
  const text = String(formData.get('body') ?? '').trim();
  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (!text && files.length === 0) return { ok: false, error: 'Mensagem vazia.' };
  if (text.length > 2000) return { ok: false, error: 'Mensagem muito longa.' };
  if (files.length > MAX_CHAT_PHOTOS) return { ok: false, error: `Máximo de ${MAX_CHAT_PHOTOS} fotos por mensagem.` };

  const db = getDb();
  // Participante de uma conversa ATIVA?
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId, status: conversations.status })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== profile.id && conv.carpenterId !== profile.id)) {
    return { ok: false, error: 'Conversa não encontrada.' };
  }
  if (conv.status !== 'ACTIVE') return { ok: false, error: 'Esta conversa está fechada.' };

  // Sobe as fotos (service-role) sob chat/{conversationId}/...
  const paths: string[] = [];
  if (files.length > 0) {
    const supabase = createSupabaseAdminClient();
    for (let i = 0; i < files.length; i++) {
      const f = files[i]!;
      if (!f.type.startsWith('image/')) return { ok: false, error: 'Só é possível anexar imagens.' };
      if (f.size > 10 * 1024 * 1024) return { ok: false, error: 'Cada foto deve ter no máx 10 MB.' };
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `chat/${conversationId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from(PROJECT_PHOTOS_BUCKET)
        .upload(path, new Uint8Array(await f.arrayBuffer()), { contentType: f.type || 'image/jpeg', upsert: true });
      if (error) return { ok: false, error: 'Não foi possível enviar a(s) foto(s).' };
      paths.push(path);
    }
  }

  const redacted = text ? maskContact(text) : '';
  const masked = redacted !== text;
  await db.insert(messages).values({
    conversationId,
    senderId: profile.id,
    body: text,
    redactedBody: masked ? redacted : null,
    // Sinaliza p/ moderação quando houve tentativa de compartilhar contato (§7.8).
    flaggedReason: masked ? 'CONTACT_MASKED' : null,
    attachments: paths,
  });
  revalidatePath(`/conversas/${conversationId}`);
  revalidatePath('/conversas'); // atualiza a caixa (prévia + não lidas)
  return { ok: true };
}

/** Assina os anexos de uma mensagem recém-chegada por Realtime (só participantes). */
export async function signMyChatAttachments(conversationId: string, paths: string[]): Promise<string[]> {
  const profile = await getSessionProfile();
  if (!profile || paths.length === 0) return [];
  const db = getDb();
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== profile.id && conv.carpenterId !== profile.id)) return [];
  // Garante que cada path pertence a ESTA conversa.
  const prefix = `chat/${conversationId}/`;
  const safe = paths.filter((p) => p.startsWith(prefix));
  const urls = await Promise.all(safe.map((p) => signedProjectPhotoUrl(p)));
  return urls.filter((u): u is string => !!u);
}

/** Denuncia a conversa (opcionalmente uma mensagem) — moderação §7.8. */
export async function reportConversation(
  conversationId: string,
  input: unknown,
  messageId?: string,
): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const db = getDb();
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== profile.id && conv.carpenterId !== profile.id)) {
    return { ok: false, error: 'Conversa não encontrada.' };
  }

  await db.insert(reports).values({
    conversationId,
    messageId: messageId ?? null,
    reporterId: profile.id,
    reason: parsed.data.reason,
    detail: parsed.data.detail ?? null,
  });
  return { ok: true };
}

/** Encerra/bloqueia/reabre a conversa. BLOCKED só sai via admin/suporte. */
export async function setConversationStatus(
  conversationId: string,
  status: ConversationStatus,
): Promise<ActionResult> {
  const profile = await getSessionProfile();
  if (!profile) return { ok: false, error: 'Faça login.' };

  const db = getDb();
  const [conv] = await db
    .select({ clientId: conversations.clientId, carpenterId: conversations.carpenterId, status: conversations.status })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conv || (conv.clientId !== profile.id && conv.carpenterId !== profile.id)) {
    return { ok: false, error: 'Conversa não encontrada.' };
  }
  // Uma conversa bloqueada só é reaberta pelo suporte/admin.
  if (conv.status === 'BLOCKED' && status !== 'BLOCKED') {
    return { ok: false, error: 'Conversa bloqueada. Fale com o suporte para reabrir.' };
  }

  await db.update(conversations).set({ status }).where(eq(conversations.id, conversationId));
  revalidatePath(`/conversas/${conversationId}`);
  revalidatePath('/conversas');
  return { ok: true };
}
