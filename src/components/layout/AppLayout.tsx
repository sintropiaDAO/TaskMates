import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from './AppHeader';
import { useBadgeNotifications } from '@/hooks/useBadgeNotifications';
import { BottomNav } from '@/components/dashboard/BottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  useBadgeNotifications();

  // Only show header for authenticated users
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
