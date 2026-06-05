'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Pending = { conversationId: string };

/** Listener global: avisa o marceneiro, em tempo real, quando um cliente libera
 *  o chat (cria a conversa) — sem precisar recarregar. A RLS de conversations
 *  garante que só chegam conversas das quais este usuário participa. */
export function ChatNotifier({ meId }: { meId: string }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`conv-notify:${meId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const c = payload.new as { id: string; carpenter_id: string };
          // Notifica só o marceneiro da conversa (o cliente já abriu o chat).
          if (c.carpenter_id === meId) setPending({ conversationId: c.id });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId]);

  // Se já estiver dentro dessa conversa, não precisa avisar.
  if (!pending || pathname === `/conversas/${pending.conversationId}`) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-subtle bg-surface p-4 shadow-lg">
        <span className="text-2xl" aria-hidden>💬</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-charcoal">Um cliente liberou o chat com você!</p>
          <p className="text-sm text-muted">Combine os detalhes do pedido por aqui.</p>
        </div>
        <Link
          href={`/conversas/${pending.conversationId}`}
          onClick={() => setPending(null)}
          className="shrink-0 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Abrir
        </Link>
        <button
          type="button"
          onClick={() => setPending(null)}
          aria-label="Dispensar"
          className="shrink-0 rounded-lg px-2 py-1 text-muted hover:text-charcoal"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
