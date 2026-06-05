'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createAuthedChannel } from '@/lib/supabase/client';
import { getMyUnreadCount } from '@/lib/chat/actions';

/** Link "Conversas" no header com bolinha de não lidas, em tempo real.
 *  Incrementa ao chegar mensagem de outra pessoa; re-sincroniza ao navegar
 *  (ex.: depois de ler uma conversa, a contagem cai). */
export function ConversasNav({ meId, initial }: { meId: string; initial: number }) {
  const pathname = usePathname();
  const [count, setCount] = useState(initial);

  // Re-sincroniza com o servidor a cada navegação (reflete leituras).
  useEffect(() => {
    let alive = true;
    getMyUnreadCount().then((n) => {
      if (alive) setCount(n);
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  // Tempo real: nova mensagem de outra pessoa incrementa.
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    createAuthedChannel(`nav-unread:${meId}`).then((res) => {
      if (cancelled || !res) return;
      const { supabase, channel } = res;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new as { sender_id: string };
          if (m.sender_id !== meId) setCount((c) => c + 1);
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
  }, [meId]);

  return (
    <Link
      href="/conversas"
      className="relative rounded-md px-3 py-2 text-sm font-medium text-charcoal hover:bg-deep"
    >
      Conversas
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[11px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
