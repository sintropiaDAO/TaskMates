import { Hero } from '@/components/landing/Hero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CTASection } from '@/components/landing/CTASection';
import { InstallBanner } from '@/components/pwa/InstallBanner';

const Index = () => {
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
