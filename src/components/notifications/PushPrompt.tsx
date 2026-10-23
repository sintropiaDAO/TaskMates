import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Share, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'push-prompt-dismissed-at';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // ask again after 3 days

type Mode = 'enable' | 'ios-install' | null;

/** Mobile-only invite shown after login so people turn on phone notifications in one tap. */
export function PushPrompt() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { requestPermission } = usePushNotifications();
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setMode(null); return; }
    if (window.top !== window.self) return;
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isMobile) return;
    const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - last < SNOOZE_MS) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    let next: Mode = null;
    if (isIOS && !standalone) next = 'ios-install';
    else if ('Notification' in window && Notification.permission === 'default') next = 'enable';
    if (!next) return;
    const t = setTimeout(() => setMode(next), 1500);
    return () => clearTimeout(t);
  }, [user?.id]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setMode(null);
  };

  const enable = async () => {
    setBusy(true);
    await requestPermission();
    setBusy(false);
    setMode(null);
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-3 right-3 z-50"
          role="dialog"
          aria-label={pt ? 'Ativar notificações' : 'Enable notifications'}
        >
          <div className="relative rounded-2xl border border-primary/30 bg-card p-4 shadow-lg">
            <button
              onClick={dismiss}
              aria-label={pt ? 'Agora não' : 'Not now'}
              className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-3 flex items-start gap-3 pr-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {pt ? 'Não perca nenhuma mensagem' : "Don't miss a message"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode === 'enable'
                    ? pt
                      ? 'Receba avisos no celular de mensagens, convites e colaborações, mesmo com o app fechado.'
                      : 'Get phone alerts for messages, invites and collaborations, even with the app closed.'
                    : pt
                      ? 'No iPhone, os avisos funcionam pelo app na Tela de Início:'
                      : 'On iPhone, alerts work from the Home Screen app:'}
                </p>
              </div>
            </div>
            {mode === 'enable' ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={dismiss}>
                  {pt ? 'Agora não' : 'Not now'}
                </Button>
                <Button size="sm" className="flex-1 gap-2" onClick={enable} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  {pt ? 'Ativar avisos' : 'Turn on alerts'}
                </Button>
              </div>
            ) : (
              <ol className="space-y-1 text-sm text-foreground">
                <li className="flex items-center gap-1">
                  1. {pt ? 'Toque em' : 'Tap'} <Share className="h-4 w-4 text-primary" /> {pt ? '(Compartilhar)' : '(Share)'}
                </li>
                <li>2. {pt ? '"Adicionar à Tela de Início"' : '"Add to Home Screen"'}</li>
                <li>3. {pt ? 'Abra o TaskMates pelo novo ícone e toque em "Ativar avisos"' : 'Open TaskMates from the new icon and tap "Turn on alerts"'}</li>
              </ol>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
