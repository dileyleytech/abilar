'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { markAllNotificationsRead } from '@/lib/notifications/actions';
import type { NotificationItem } from '@/lib/notifications/queries';

const when = (d: Date) => {
  const date = new Date(d);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const hasUnread = items.some((n) => !n.readAt);

  const markAll = () =>
    start(async () => {
      await markAllNotificationsRead();
      router.refresh(); // atualiza a lista e o sino do menu
    });

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-subtle bg-surface p-10 text-center text-muted">
        <span className="text-3xl" aria-hidden>🔔</span>
        <p className="mt-2 font-medium text-charcoal">Nenhum aviso ainda</p>
        <p>Mudanças nos seus pedidos, orçamentos e obras aparecem aqui.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hasUnread && (
        <button
          type="button"
          onClick={markAll}
          disabled={pending}
          className="self-end rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-charcoal transition hover:bg-deep disabled:opacity-50"
        >
          {pending ? 'Marcando…' : 'Marcar todas como lidas'}
        </button>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((n) => {
          const inner = (
            <>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-charcoal">{n.title}</p>
                {n.body && <p className="text-sm text-muted">{n.body}</p>}
              </div>
              <span className="shrink-0 text-xs text-subtle">{when(n.createdAt)}</span>
            </>
          );
          const cls = `flex items-start gap-3 rounded-2xl border p-4 ${
            n.readAt ? 'border-subtle bg-surface' : 'border-brand-primary/30 bg-brand-primary/5'
          }`;
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} className={`${cls} transition hover:border-brand-primary/40`}>{inner}</Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
