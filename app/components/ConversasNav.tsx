'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createAuthedChannel } from '@/lib/supabase/client';
import { getMyUnreadCount } from '@/lib/chat/actions';

/** Link "Conversas" no header com bolinha de não lidas, em tempo real.
 *  Incrementa ao chegar mensagem de outra pessoa (exceto da conversa que está
 *  aberta) e re-sincroniza ao navegar e quando uma conversa é marcada como lida. */
export function ConversasNav({ meId, initial }: { meId: string; initial: number }) {
  const pathname = usePathname();
  const [count, setCount] = useState(initial);
  // Pathname atual acessível dentro do handler de realtime (sem re-assinar).
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // Re-sincroniza com o servidor: a cada navegação e quando algo é marcado lido.
  useEffect(() => {
    let alive = true;
    const sync = () => getMyUnreadCount().then((n) => alive && setCount(n));
    void sync();
    window.addEventListener('abilar:unread-changed', sync);
    return () => {
      alive = false;
      window.removeEventListener('abilar:unread-changed', sync);
    };
  }, [pathname]);

  // Tempo real: nova mensagem de outra pessoa incrementa — exceto se eu já estou
  // vendo aquela conversa (nesse caso ela conta como lida).
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    createAuthedChannel(`nav-unread:${meId}`).then((res) => {
      if (cancelled || !res) return;
      const { supabase, channel } = res;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new as { sender_id: string; conversation_id: string };
          const viewingThis = pathRef.current === `/conversas/${m.conversation_id}`;
          if (m.sender_id !== meId && !viewingThis) setCount((c) => c + 1);
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
