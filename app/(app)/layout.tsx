import { AppHeader } from '@/components/AppHeader';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader />
      <div className="w-full flex-1">{children}</div>
    </div>
  );
}
