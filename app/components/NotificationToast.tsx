'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createAuthedChannel } from '@/lib/supabase/client';
import { buttonVariants } from '@/components/ui';
import { IconAvisos, IconFechar } from '@/components/ui/icons';

type Toast = { title: string; body: string | null; link: string | null };

/** Banner global: mostra a notificação nova (qualquer mudança de status) em tempo
 *  real, com link para a tela relevante. A RLS garante só as do próprio usuário. */
export function NotificationToast({ meId }: { meId: string }) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    createAuthedChannel(`notif-toast:${meId}`).then((res) => {
      if (cancelled || !res) return;
      const { supabase, channel } = res;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          const n = payload.new as { title: string; body: string | null; link: string | null };
          setToast({ title: n.title, body: n.body, link: n.link });
        })
        .subscribe();
      cleanup = () => supabase.removeChannel(channel);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [meId]);

  if (!toast) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-4" role="status" aria-live="polite">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-subtle bg-surface p-4 shadow-lg">
        <IconAvisos size={24} className="shrink-0 text-brand-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-charcoal">{toast.title}</p>
          {toast.body && <p className="truncate text-sm text-muted">{toast.body}</p>}
        </div>
        {toast.link && (
          <Link
            href={toast.link}
            onClick={() => setToast(null)}
            className={buttonVariants({ variant: 'primary', size: 'sm', className: 'shrink-0' })}
          >
            Abrir
          </Link>
        )}
        <button type="button" onClick={() => setToast(null)} aria-label="Dispensar" className="shrink-0 rounded-lg px-2 py-1 text-muted hover:text-charcoal">
          <IconFechar size={18} />
        </button>
      </div>
    </div>
  );
}
