import { useEffect } from 'react';
import { useBadges } from '@/hooks/useBadges';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLevelName } from '@/hooks/useBadges';

export function useBadgeNotifications() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { badges, markBadgeNotified } = useBadges();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const unnotified = badges.filter(b => !b.notified);
    for (const badge of unnotified) {
      const levelName = getLevelName(badge.level, language as 'pt' | 'en');
      toast({
        title: t('badgesNewBadgeNotif'),
        description: `${badge.entity_name ? `${badge.entity_name} — ` : ''}${levelName}`,
      });
      markBadgeNotified(badge.id);
    }
  }, [badges, user]);
}
