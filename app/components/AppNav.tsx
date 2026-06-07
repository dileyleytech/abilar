'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@abilar/shared';
import { createAuthedChannel } from '@/lib/supabase/client';
import { getMyUnreadCount } from '@/lib/chat/actions';
import { getMyNotificationCount } from '@/lib/notifications/actions';

type Item = { href: string; label: string; icon: string; badge?: 'chat' | 'notif' };

const NOTIF: Item = { href: '/notificacoes', label: 'Avisos', icon: '🔔', badge: 'notif' };

const ITEMS: Record<'CLIENT' | 'CARPENTER' | 'ARCHITECT' | 'ADMIN', Item[]> = {
  CLIENT: [
    { href: '/pedidos', label: 'Meus pedidos', icon: '📋' },
    { href: '/pedidos/novo', label: 'Novo pedido', icon: '➕' },
    { href: '/conversas', label: 'Conversas', icon: '💬', badge: 'chat' },
    NOTIF,
  ],
  CARPENTER: [
    { href: '/marceneiro', label: 'Início', icon: '🏠' },
    { href: '/marceneiro/catalogo', label: 'Catálogo', icon: '📦' },
    { href: '/conversas', label: 'Conversas', icon: '💬', badge: 'chat' },
    NOTIF,
  ],
  ARCHITECT: [{ href: '/conversas', label: 'Conversas', icon: '💬', badge: 'chat' }, NOTIF],
  ADMIN: [
    { href: '/admin/precos', label: 'Taxas', icon: '⚙️' },
    { href: '/admin/denuncias', label: 'Denúncias', icon: '🚩' },
    NOTIF,
  ],
};

export function AppNav({
  role,
  firstName,
  userId,
  initialUnread,
  initialNotif,
}: {
  role: Role | null;
  firstName: string | null;
  userId: string | null;
  initialUnread: number;
  initialNotif: number;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);
  const [notif, setNotif] = useState(initialNotif);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('abilar:nav-collapsed') === '1');
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      localStorage.setItem('abilar:nav-collapsed', v ? '0' : '1');
      return !v;
    });

  // Badges (conversas + avisos): re-sincroniza com o servidor a cada navegação.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getMyUnreadCount().then((n) => alive && setUnread(n));
    getMyNotificationCount().then((n) => alive && setNotif(n));
    return () => {
      alive = false;
    };
  }, [userId, pathname]);

  // Tempo real: novas mensagens (conversas) e notificações (avisos).
  useEffect(() => {
    if (!userId) return;
    let cleanup = () => {};
    let cancelled = false;
    createAuthedChannel(`nav:${userId}`).then((res) => {
      if (cancelled || !res) return;
      const { supabase, channel } = res;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new as { sender_id: string };
          if (m.sender_id !== userId) setUnread((c) => c + 1);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
          setNotif((c) => c + 1);
        })
        .subscribe();
      cleanup = () => supabase.removeChannel(channel);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [userId]);

  const items = role && role in ITEMS ? ITEMS[role as keyof typeof ITEMS] : [];
  const account: Item = { href: '/conta', label: firstName ?? 'Conta', icon: '👤' };
  const allHrefs = [...items.map((i) => i.href), account.href];
  const activeHref = allHrefs
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  const badgeFor = (it: Item) => {
    const n = it.badge === 'chat' ? unread : it.badge === 'notif' ? notif : 0;
    return n > 0 ? (n > 9 ? '9+' : String(n)) : null;
  };

  if (!role) {
    // Deslogado: cabeçalho mínimo.
    return (
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-subtle bg-surface/90 px-4 backdrop-blur print:hidden">
        <Link href="/" aria-label="Abilar — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-7 w-auto" />
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="rounded-md px-3 py-2 text-sm font-medium text-charcoal hover:bg-deep">Entrar</Link>
          <Link href="/cadastro" className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white">Criar conta</Link>
        </nav>
      </header>
    );
  }

  return (
    <>
      {/* Sidebar (desktop) — recolhível */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-subtle bg-surface px-2 py-4 lg:flex print:hidden ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`mb-4 flex items-center px-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link href="/" aria-label="Abilar — início">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-7 w-auto" />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="rounded-lg p-2 text-muted transition hover:bg-deep hover:text-charcoal"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              title={collapsed ? it.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                collapsed ? 'justify-center' : ''
              } ${isActive(it.href) ? 'bg-brand-primary text-white' : 'text-charcoal hover:bg-deep'}`}
            >
              <span className="relative text-lg" aria-hidden>
                {it.icon}
                {collapsed && badgeFor(it) && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-brand-secondary" />
                )}
              </span>
              {!collapsed && <span className="flex-1">{it.label}</span>}
              {!collapsed && badgeFor(it) && (
                <span className="rounded-full bg-brand-secondary px-1.5 text-[11px] font-bold text-white">{badgeFor(it)}</span>
              )}
            </Link>
          ))}
        </nav>

        <Link
          href={account.href}
          title={collapsed ? account.label : undefined}
          className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            collapsed ? 'justify-center' : ''
          } ${isActive(account.href) ? 'bg-brand-primary text-white' : 'text-charcoal hover:bg-deep'}`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
            {(firstName ?? 'U').charAt(0).toUpperCase()}
          </span>
          {!collapsed && <span>{account.label}</span>}
        </Link>
      </aside>

      {/* Topo mínimo (mobile) */}
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-subtle bg-surface/90 px-4 backdrop-blur lg:hidden print:hidden">
        <Link href="/" aria-label="Abilar — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/abilar-logo-horizontal.svg" alt="Abilar" className="h-6 w-auto" />
        </Link>
        <Link href={account.href} className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
          {(firstName ?? 'U').charAt(0).toUpperCase()}
        </Link>
      </header>

      {/* Barra inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-subtle bg-surface lg:hidden print:hidden">
        {[...items, account].map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive(it.href) ? 'text-brand-primary' : 'text-muted'
            }`}
          >
            <span className="text-xl" aria-hidden>{it.icon}</span>
            <span className="truncate px-1">{it.label}</span>
            {badgeFor(it) && (
              <span className="absolute right-1/4 top-1 rounded-full bg-brand-secondary px-1 text-[10px] font-bold text-white">{badgeFor(it)}</span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
