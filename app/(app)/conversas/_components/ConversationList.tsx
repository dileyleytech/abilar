'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createAuthedChannel } from '@/lib/supabase/client';
import type { ConversationListItem } from '@/lib/chat/queries';

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Lista de conversas que se atualiza sozinha: nova mensagem reordena e atualiza
 *  a prévia; nova conversa recarrega os dados do servidor. */
export function ConversationList({
  meId,
  initial,
}: {
  meId: string;
  initial: ConversationListItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  useEffect(() => setItems(initial), [initial]);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    createAuthedChannel(`inbox:${meId}`).then((res) => {
      if (cancelled || !res) return;
      const { supabase, channel } = res;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new as {
            conversation_id: string;
            sender_id: string;
            body: string;
            redacted_body: string | null;
            created_at: string;
          };
          setItems((prev) => {
            const cur = prev.find((c) => c.id === m.conversation_id);
            if (!cur) {
              // Mensagem de uma conversa que ainda não está na lista → busca do servidor.
              router.refresh();
              return prev;
            }
            const fromOther = m.sender_id !== meId;
            const updated = {
              ...cur,
              lastText: m.redacted_body ?? m.body,
              lastAt: m.created_at,
              unread: fromOther ? cur.unread + 1 : cur.unread,
            };
            const rest = prev.filter((c) => c.id !== m.conversation_id);
            return [updated, ...rest];
          });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
          router.refresh();
        })
        .subscribe();
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [meId, router]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-subtle bg-surface p-10 text-center text-muted">
        <span className="text-3xl" aria-hidden>💬</span>
        <p className="mt-2 font-medium text-charcoal">Nenhuma conversa ainda</p>
        <p>Quando um chat for liberado, ele aparece aqui.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/conversas/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border border-subtle bg-surface p-4 shadow-sm transition hover:border-brand-primary/40 hover:shadow-md"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-base font-bold text-white">
              {c.otherName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold text-charcoal">{c.otherName}</p>
                {c.lastAt && <span className="shrink-0 text-xs text-muted">{timeLabel(c.lastAt)}</span>}
              </div>
              <p className={`truncate text-sm ${c.unread > 0 ? 'font-semibold text-charcoal' : 'text-muted'}`}>
                {c.lastText ?? <span className="italic">Sem mensagens ainda</span>}
              </p>
              <p className="truncate text-xs text-subtle">{c.projectTitle}</p>
            </div>
            {c.unread > 0 && (
              <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary px-1.5 text-xs font-bold text-white">
                {c.unread > 9 ? '9+' : c.unread}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
