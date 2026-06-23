import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Capyvera, type CapyveraPose } from './Capyvera';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

type Lang = 'pt' | 'en';

interface Step {
  pose: CapyveraPose;
  title: Record<Lang, string>;
  body: Record<Lang, string>;
}

const STEPS: Step[] = [
  {
    pose: 'wave',
    title: { pt: 'Olá! Eu sou a Capyvera', en: 'Hi! I\'m Capyvera' },
    body: {
      pt: 'Sua companheira no TaskMates. Vou te mostrar como começar em poucos passos.',
      en: 'Your companion on TaskMates. Let me show you how to get started in a few steps.',
    },
  },
  {
    pose: 'explorer',
    title: { pt: 'Descubra e colabore', en: 'Discover and collaborate' },
    body: {
      pt: 'Explore tarefas, produtos e enquetes da comunidade. Toque em qualquer card para ver detalhes ou oferecer ajuda.',
      en: 'Browse community tasks, products and polls. Tap any card to see details or offer help.',
    },
  },
  {
    pose: 'planting',
    title: { pt: 'Plante boas ações', en: 'Plant good actions' },
    body: {
      pt: 'Crie suas próprias tarefas e veja sua jornada regenerativa crescer a cada conclusão.',
      en: 'Create your own tasks and watch your regenerative journey grow with every completion.',
    },
  },
];

const STORAGE_PREFIX = 'taskmates:onboarding-seen:';

export function CapyveraOnboarding() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const lang: Lang = language === 'en' ? 'en' : 'pt';

  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : null;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Open once per user, only after they've been authenticated
  useEffect(() => {
    if (!storageKey) return;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }
    setIndex(0);
    setOpen(true);
  }, [storageKey]);

  const persistSeen = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const finish = useCallback(() => {
    persistSeen();
    setOpen(false);
  }, [persistSeen]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= STEPS.length - 1) {
        persistSeen();
        setOpen(false);
        return i;
      }
      return i + 1;
    });
  }, [persistSeen]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Keyboard navigation (arrow keys). Dialog already handles ESC + focus trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev]);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const isFirst = index === 0;

  const labels = useMemo(
    () => ({
      skip: lang === 'pt' ? 'Pular' : 'Skip',
      back: lang === 'pt' ? 'Voltar' : 'Back',
      next: lang === 'pt' ? 'Próximo' : 'Next',
      done: lang === 'pt' ? 'Começar' : 'Get started',
      progress:
        lang === 'pt'
          ? `Passo ${index + 1} de ${STEPS.length}`
          : `Step ${index + 1} of ${STEPS.length}`,
    }),
    [lang, index],
  );

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) finish();
        else setOpen(true);
      }}
    >
      <DialogContent
        className="max-w-md sm:max-w-lg p-0 overflow-hidden"
        aria-labelledby="capy-onb-title"
        aria-describedby="capy-onb-desc"
      >
        <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-8 text-center">
          {/* Illustration */}
          <div
            key={step.pose}
            className="flex items-center justify-center"
            style={{ animation: 'capy-pop 500ms cubic-bezier(.25,1.4,.5,1)' }}
          >
            <Capyvera pose={step.pose} size="lg" loading="eager" />
          </div>

          <DialogTitle id="capy-onb-title" className="text-2xl font-bold text-foreground">
            {step.title[lang]}
          </DialogTitle>

          <DialogDescription
            id="capy-onb-desc"
            className="text-base text-muted-foreground leading-relaxed max-w-sm"
          >
            {step.body[lang]}
          </DialogDescription>

          {/* Progress dots */}
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={index + 1}
            aria-label={labels.progress}
            className="flex items-center gap-2 pt-1"
          >
            {STEPS.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row sm:justify-between sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={finish}
              className="sm:order-1 min-h-11"
              aria-label={labels.skip}
            >
              {labels.skip}
            </Button>

            <div className="flex gap-2 sm:order-2">
              <Button
                type="button"
                variant="outline"
                onClick={prev}
                disabled={isFirst}
                aria-label={labels.back}
                className="min-h-11 min-w-11 flex-1 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span className="ml-1">{labels.back}</span>
              </Button>
              <Button
                ref={closeBtnRef}
                type="button"
                onClick={next}
                aria-label={isLast ? labels.done : labels.next}
                className="min-h-11 min-w-11 flex-1 sm:flex-none"
              >
                <span className="mr-1">{isLast ? labels.done : labels.next}</span>
                {!isLast && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
