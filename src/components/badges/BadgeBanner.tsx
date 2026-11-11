import { useNavigate } from '@/lib/router-compat';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBadges } from '@/hooks/useBadges';
import { BadgeSVG } from './BadgeSVG';
import { useLanguage } from '@/contexts/LanguageContext';

interface BadgeBannerProps {
  targetUserId: string;
}

const PREVIEW_CATEGORIES = ['taskmates', 'habits', 'communities', 'leadership', 'collaboration'] as const;

export function BadgeBanner({ targetUserId }: BadgeBannerProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { topBadges, loading } = useBadges(targetUserId);
  const reduced = useReducedMotion();

  if (loading) return null;

  const hasBadges = topBadges.length > 0;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="achievement-world border-y border-border py-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-base">{t('badgesTitle')}</h3>
          {hasBadges && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {topBadges.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => navigate(`/badges/${targetUserId}`)}
        >
          {t('badgesSeeAll')}
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {hasBadges ? (
        <div className="flex flex-wrap gap-2 pb-1">
          {topBadges.map((badge) => (
            <Button variant="achievement"
              key={badge.id}
              onClick={() => navigate(`/badges/${targetUserId}?category=${badge.category}`)}
              className="achievement-tone-forest h-auto p-2 shrink-0"
              title={badge.entity_name || badge.category}
            >
              <BadgeSVG
                category={badge.category}
                level={badge.level}
                entityName={badge.entity_name}
                size={72}
              />
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap gap-2 pb-1 w-full justify-center">
            {PREVIEW_CATEGORIES.map((cat) => (
              <Button variant="ghost"
                key={cat}
                onClick={() => navigate(`/badges/${targetUserId}`)}
                className="h-auto p-0 shrink-0 opacity-60"
                title={t('badgesTitle')}
              >
                <BadgeSVG
                  category={cat}
                  level={0}
                  entityName={null}
                  size={72}
                  locked
                />
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>{t('badgesNoBadgesDesc')}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
