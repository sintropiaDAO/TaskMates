import { useState, useEffect } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface QuizBannerProps {
  userTagsCount: number;
}

export function QuizBanner({ userTagsCount }: QuizBannerProps) {
  const { t } = useLanguage();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('quiz_banner_dismissed') === 'true';
  });
  // Only show after profile is fully loaded
  const ready = !loading && !!profile;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('quiz_banner_dismissed', 'true');
  };

  // Don't render anything until profile is fully loaded and ready
  if (!ready || loading || !profile) {
    return null;
  }

  const quizCompleted = profile.quiz_completed === true;

  if (quizCompleted || dismissed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 border border-primary/20 p-6 mb-6">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">{t('quizBannerTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('quizBannerDescription')}
          </p>
        </div>

        {/* CTA */}
        <Button
          onClick={() => navigate('/quiz')}
          className="gap-2 bg-gradient-primary hover:opacity-90 shadow-lg flex-shrink-0"
        >
          {t('quizBannerCTA')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
