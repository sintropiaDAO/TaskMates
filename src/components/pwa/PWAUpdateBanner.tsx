import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export function PWAUpdateBanner() {
  const { t } = useLanguage();
  const { needRefresh, updateServiceWorker } = usePWAUpdate();

  if (!needRefresh) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground"
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">
              {t('newVersionAvailable')}
            </span>
          </div>
          <Button
            onClick={updateServiceWorker}
            variant="secondary"
            size="sm"
            className="gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <RefreshCw className="w-4 h-4" />
            {t('updateNow')}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
