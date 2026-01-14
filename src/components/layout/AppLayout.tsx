import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from './AppHeader';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  // Only show header for authenticated users
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
