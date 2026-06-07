import { AppNav } from '@/components/AppNav';
import { NotificationToast } from '@/components/NotificationToast';
import { getSessionProfile } from '@/lib/auth/session';
import { countUnreadMessages } from '@/lib/chat/queries';
import { countUnreadNotifications } from '@/lib/notifications/queries';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  const firstName = profile?.name?.split(' ')[0] ?? null;
  const chatUserId =
    profile && (profile.role === 'CLIENT' || profile.role === 'CARPENTER') ? profile.id : null;
  const [unread, notif] = profile
    ? await Promise.all([
        chatUserId ? countUnreadMessages(chatUserId) : Promise.resolve(0),
        countUnreadNotifications(profile.id),
      ])
    : [0, 0];

  return (
    <div className="min-h-screen bg-base lg:flex">
      <AppNav role={profile?.role ?? null} firstName={firstName} userId={profile?.id ?? null} initialUnread={unread} initialNotif={notif} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">{children}</div>
      {profile && <NotificationToast meId={profile.id} />}
    </div>
  );
}
