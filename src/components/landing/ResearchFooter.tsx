import { useLanguage } from '@/contexts/LanguageContext';
import { ExternalLink } from 'lucide-react';

export function ResearchFooter() {
  const { t } = useLanguage();

  return (
    <footer className="bg-muted/50 border-t border-border py-12 px-4">
      <div className="container max-w-3xl mx-auto text-center">
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t('landingResearchText')}
        </p>
        <a
          href="https://sintropiadao.substack.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          {t('landingResearchLink')}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </footer>
  );
}
