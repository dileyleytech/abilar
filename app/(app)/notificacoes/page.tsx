import { requireUserId } from '@/lib/auth/session';
import { listNotifications } from '@/lib/notifications/queries';
import { NotificationsList } from './_components/NotificationsList';

export const metadata = { title: 'Avisos — Abilar' };

export default async function NotificacoesPage() {
  const userId = await requireUserId();
  const items = await listNotifications(userId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-charcoal sm:text-3xl">Avisos</h1>
      <NotificationsList items={items} />
    </main>
  );
}
