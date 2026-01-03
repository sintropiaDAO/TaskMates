import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-info/15 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('landingCTATitle')}
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            {t('landingCTADescription')}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-gradient-primary hover:opacity-90 transition-all text-lg px-12 py-7 rounded-xl shadow-glow font-medium group"
            >
              {t('heroStartNow')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
