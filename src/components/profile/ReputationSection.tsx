import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import { useReputation } from '@/hooks/useReputation';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReputationSectionProps {
  userId: string;
}

export function ReputationSection({ userId }: ReputationSectionProps) {
  const { t } = useLanguage();
  const { averageRating, totalRatings, loading } = useReputation(userId);

  if (loading) {
    return (
      <div className="mb-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Award className="w-4 h-4 text-yellow-500" />
        {t('reputation')}
      </h3>
      <div className="bg-gradient-to-r from-yellow-500/5 to-orange-500/5 rounded-xl p-4 border border-yellow-500/10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <StarRating rating={averageRating} size="lg" />
            <p className="text-2xl font-bold mt-1">
              {averageRating > 0 ? averageRating.toFixed(1) : '-'}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{totalRatings} {t('ratingsReceived')}</p>
            {totalRatings === 0 && (
              <p className="text-xs mt-1">{t('noRatingsYet')}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}