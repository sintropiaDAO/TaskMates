import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Plus, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import logoTaskmates from '@/assets/logo-taskmates.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t('installApp')}</h1>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
        >
          {/* App Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg bg-gradient-primary p-4">
              <img 
                src={logoTaskmates} 
                alt="TaskMates" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-center mb-2">TaskMates</h2>
          <p className="text-muted-foreground text-center mb-6">
            {t('installDescription')}
          </p>

          {/* Already installed */}
          {(isInstalled || isStandalone) && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <p className="text-center font-medium">{t('appInstalled')}</p>
              <Button onClick={() => navigate('/dashboard')} className="mt-2">
                {t('openApp')}
              </Button>
            </div>
          )}

          {/* Install button for Android/Desktop */}
          {!isInstalled && !isStandalone && deferredPrompt && (
            <Button 
              onClick={handleInstall} 
              className="w-full gap-2 bg-gradient-primary"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              {t('addToHomeScreen')}
            </Button>
          )}

          {/* Manual Instructions for all browsers */}
          {!isInstalled && !isStandalone && !deferredPrompt && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('addToHomeScreenManual')}
              </p>
            </div>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-2 gap-4"
        >
          <div className="bg-card rounded-xl p-4 border border-border/50 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium">{t('offlineAccess')}</p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border/50 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium">{t('fastLoading')}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
