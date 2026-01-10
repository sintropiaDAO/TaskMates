import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '@/components/landing/Hero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CTASection } from '@/components/landing/CTASection';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect logged-in users to dashboard
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show nothing while checking auth to prevent flash
  if (loading) {
    return null;
  }

  return (
    <main className="overflow-hidden">
      <Hero />
      <FeaturesSection />
      <CTASection />
      <InstallBanner />
    </main>
  );
};

export default Index;
