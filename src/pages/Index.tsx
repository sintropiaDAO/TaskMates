import { Hero } from '@/components/landing/Hero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CTASection } from '@/components/landing/CTASection';

const Index = () => {
  return (
    <main className="overflow-hidden">
      <Hero />
      <FeaturesSection />
      <CTASection />
    </main>
  );
};

export default Index;
