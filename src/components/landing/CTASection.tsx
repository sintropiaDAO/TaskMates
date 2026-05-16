import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRight } from 'lucide-react';
import ctaImage from '@/assets/cta-solarpunk.jpg';

export function CTASection() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      {/* Background image with accessible overlay for text contrast.
          Fallback gradient (bg-gradient-hero on the section + the gradient div below)
          is shown if the image fails to load. */}
      <div className="absolute inset-0 z-0">
        {imageFailed ? (
          <div
            aria-hidden="true"
            className="w-full h-full bg-gradient-to-br from-[hsl(155_55%_18%)] via-[hsl(155_50%_28%)] to-[hsl(195_55%_25%)]"
          />
        ) : (
          <img
            src={ctaImage}
            alt={t('heroImageAlt')}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_75%)]" />
      </div>
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
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
            {t('landingCTATitle')}
          </h2>
          <p className="text-lg text-white/90 mb-10 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
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
