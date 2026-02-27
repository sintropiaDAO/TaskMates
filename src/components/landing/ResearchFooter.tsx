import { useLanguage } from '@/contexts/LanguageContext';
import { ExternalLink, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import sintropiaLogo from '@/assets/sintropia-logo.png';

export function ResearchFooter() {
  const { t } = useLanguage();

  return (
    <footer className="relative bg-foreground text-background overflow-hidden py-20 px-4">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center gap-8">
        {/* Research text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-background/20 bg-background/5 mb-6">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-widest text-background/70">
              {t('landingResearchLink').includes('Leia') ? 'Pesquisa' : 'Research'}
            </span>
          </div>

          <p className="text-base md:text-lg leading-relaxed text-background/80 mb-8">
            {t('landingResearchText')}
          </p>

          <Button
            asChild
            size="lg"
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground rounded-xl px-8 py-6 text-base font-medium shadow-glow"
          >
            <a
              href="https://sintropiadao.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              {t('landingResearchLink')}
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </motion.div>

        {/* Divider */}
        <div className="w-16 h-px bg-background/20 my-2" />

        {/* SintropiaDAO branding */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs text-background/50 uppercase tracking-widest">
            {t('landingResearchLink').includes('Leia') ? 'Desenvolvido por' : 'Developed by'}
          </span>
          <img
            src={sintropiaLogo}
            alt="SintropiaDAO"
            className="h-8 md:h-10 invert opacity-80"
          />
        </motion.div>
      </div>
    </footer>
  );
}
