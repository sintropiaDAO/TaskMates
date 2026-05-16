import { motion } from 'framer-motion';
import { Users, Sparkles, Leaf, Search, Tag, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import logoTaskmates from '@/assets/logo-taskmates.png';
import heroImage from '@/assets/hero-solarpunk-garden.jpeg';

export function Hero() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Hero background image with accessible overlay for text contrast */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt={t('heroImageAlt')}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {/* Black overlay: lighter at top, darker at bottom + radial vignette for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_75%)]" />
      </div>

      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-info/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="p-4 rounded-2xl bg-gradient-primary shadow-glow">
              <img src={logoTaskmates} alt="TaskMates Logo" className="w-10 h-10" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-display text-6xl md:text-8xl font-bold mb-6"
          >
            <span
              tabIndex={0}
              className="inline-block text-gradient shadow-2xl rounded-lg cursor-default transition-all duration-300 ease-out hover:scale-[1.03] focus-visible:scale-[1.03] hover:drop-shadow-[0_8px_24px_hsl(var(--primary)/0.45)] focus-visible:drop-shadow-[0_8px_24px_hsl(var(--primary)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              TaskMates
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-2xl md:text-3xl text-white mb-4 font-light tracking-wide [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]"
          >
            {t('heroSubtitle')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-lg text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
          >
            {t('heroDescription')}
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            {[
              { icon: Users, text: t('heroFeatureCollaboration') },
              { icon: Sparkles, text: t('heroFeatureMatchmaking') },
              { icon: Leaf, text: t('heroFeatureRegenerative') },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-5 py-3 rounded-full glass shadow-sm"
              >
                <feature.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-gradient-primary hover:opacity-90 transition-all text-lg px-10 py-7 rounded-xl shadow-glow font-medium"
            >
              {t('heroStartNow')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="text-lg px-10 py-7 rounded-xl border-2 border-primary/30 text-foreground hover:bg-primary/5 font-medium"
            >
              {t('heroHaveAccount')}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-foreground/20 rounded-full flex justify-center">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-3 bg-primary rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  );
}
