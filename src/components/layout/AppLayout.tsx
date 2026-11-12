import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from './AppHeader';
import { useBadgeNotifications } from '@/hooks/useBadgeNotifications';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { CapyVeraFAB } from '@/components/capy/CapyVeraFAB';
import { CompletionCelebrationOverlay } from '@/components/capy/CompletionCelebrationOverlay';
import { CapyveraOnboarding } from '@/components/capy/CapyveraOnboarding';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  useBadgeNotifications();

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <div className="solarpunk-backdrop" aria-hidden="true" />
      {user && <AppHeader />}
      <main className={`app-content flex-1${user ? ' pb-20' : ''}`}>
        {children}
      </main>
      {user && (
        <>
          <BottomNav />
          <CapyVeraFAB />
          <CompletionCelebrationOverlay />
          <CapyveraOnboarding />
        </>
      )}
    </div>
  );
}
