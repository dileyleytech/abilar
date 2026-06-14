import { requireUserId } from '@/lib/auth/session';
import { listNotifications } from '@/lib/notifications/queries';
import { Page, PageHeader } from '@/components/ui';
import { NotificationsList } from './_components/NotificationsList';

export const metadata = { title: 'Avisos — Abilar' };

export default async function NotificacoesPage() {
  const userId = await requireUserId();
  const items = await listNotifications(userId);

  return (
    <Page width="lg">
      <PageHeader title="Avisos" />
      <NotificationsList items={items} />
    </Page>
  );
}
