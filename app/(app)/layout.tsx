import { AppNav } from '@/components/AppNav';
import { ChatNotifier } from '@/components/ChatNotifier';
import { getSessionProfile } from '@/lib/auth/session';
import { countUnreadMessages } from '@/lib/chat/queries';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  const firstName = profile?.name?.split(' ')[0] ?? null;
  const chatUserId =
    profile && (profile.role === 'CLIENT' || profile.role === 'CARPENTER') ? profile.id : null;
  const unread = chatUserId ? await countUnreadMessages(chatUserId) : 0;

  return (
    <div className="min-h-screen bg-base lg:flex">
      <AppNav role={profile?.role ?? null} firstName={firstName} userId={chatUserId} initialUnread={unread} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">{children}</div>
      {profile && <ChatNotifier meId={profile.id} />}
    </div>
  );
}
