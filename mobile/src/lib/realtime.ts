import { supabase } from './supabase';
import type { MessageRow } from './data';

// Nome de canal único por inscrição — dois canais com o mesmo tópico quebram o
// Realtime do Supabase (ex.: HeaderIcons montado em várias telas ao mesmo tempo).
let channelSeq = 0;
const uniqueTopic = (base: string) => `${base}:${++channelSeq}`;

// Assina novas mensagens da conversa. Precisa autenticar o socket com o JWT,
// senão a RLS (policies TO authenticated) barra todos os eventos.
export async function subscribeMessages(
  conversationId: string,
  onInsert: (m: MessageRow) => void,
): Promise<() => void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) await supabase.realtime.setAuth(token);

  const channel = supabase
    .channel(uniqueTopic(`conv:${conversationId}`))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as MessageRow),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// Assina novas notificações do usuário (badge em tempo real).
export async function subscribeNotifications(userId: string, onInsert: () => void): Promise<() => void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) await supabase.realtime.setAuth(token);

  const channel = supabase
    .channel(uniqueTopic(`notif:${userId}`))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => onInsert(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
