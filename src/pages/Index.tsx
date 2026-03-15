import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Hero } from '@/components/landing/Hero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CTASection } from '@/components/landing/CTASection';
import { ResearchFooter } from '@/components/landing/ResearchFooter';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect logged-in users to dashboard, preserving query params
    if (!loading && user) {
      navigate(`/dashboard${location.search}`, { replace: true });
    }
  }, [user, loading, navigate, location.search]);

  // Show nothing while checking auth to prevent flash
  if (loading) {
    return null;
  }

  return (
    <main className="overflow-hidden">
      <Hero />
      <FeaturesSection />
      <CTASection />
      <ResearchFooter />
      <InstallBanner />
    </main>
  );
};

export default Index;
