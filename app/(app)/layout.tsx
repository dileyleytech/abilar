import { AppHeader } from '@/components/AppHeader';
import { ChatNotifier } from '@/components/ChatNotifier';
import { getSessionProfile } from '@/lib/auth/session';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader />
      <div className="w-full flex-1">{children}</div>
      {profile && <ChatNotifier meId={profile.id} />}
    </div>
  );
}
