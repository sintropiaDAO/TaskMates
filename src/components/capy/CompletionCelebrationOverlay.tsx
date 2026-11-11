import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Flower2, Gift, Leaf, Sparkles, Trophy, X } from 'lucide-react';
import { Capyvera } from './Capyvera';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { EXP_RULES } from '@/lib/rpg';
import {
  COMPLETION_CELEBRATION_EVENT, celebrationKey, enqueueCelebration,
  type CompletionCelebration,
} from '@/lib/completion-celebration';
import garden from '@/assets/adventure/solarpunk-garden.jpg';

/** A shared, queued celebration. Existing proof/rating dialogs finish first. */
export function CompletionCelebrationOverlay() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const reducedMotion = useReducedMotion();
  const [queue, setQueue] = useState<CompletionCelebration[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const seen = useRef(new Set<string>());
  const closeButton = useRef<HTMLButtonElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const active = dialogOpen ? undefined : queue[0];
  const activeKey = active ? celebrationKey(active) : undefined;

  useEffect(() => {
    const receive = (event: Event) => {
      const item = (event as CustomEvent<CompletionCelebration>).detail;
      if (!item?.id || (item.kind !== 'task' && item.kind !== 'journey')) return;
      setQueue(current => enqueueCelebration(current, item, seen.current));
    };
    const checkDialogs = () => setDialogOpen(Boolean(document.querySelector(
      '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]',
    )));
    const observer = new MutationObserver(checkDialogs);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
    checkDialogs();
    window.addEventListener(COMPLETION_CELEBRATION_EVENT, receive);
    return () => { observer.disconnect(); window.removeEventListener(COMPLETION_CELEBRATION_EVENT, receive); };
  }, []);

  const dismiss = useCallback(() => {
    if (!active) return;
    seen.current.add(celebrationKey(active));
    setQueue(current => current.slice(1));
  }, [active]);

  useEffect(() => {
    if (!activeKey) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    continueButton.current?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
      if (event.key === 'Tab') {
        event.preventDefault();
        (document.activeElement === closeButton.current ? continueButton.current : closeButton.current)?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [activeKey, dismiss]);

  const title = active?.kind === 'journey'
    ? (pt ? 'Jornada concluída!' : 'Journey completed!')
    : (pt ? 'Tarefa concluída!' : 'Task completed!');

  if (typeof document === 'undefined') return null;
  return createPortal(<AnimatePresence mode="wait">
    {active && (
      <motion.section
        key={activeKey}
        role="dialog" aria-modal="true" aria-labelledby="celebration-title" aria-describedby="celebration-description"
        data-completion-celebration={active.kind}
        className="completion-world fixed inset-0 z-[200] isolate overflow-y-auto overscroll-contain text-foreground"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.25 }}
      >
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <img src={garden} alt="" className="completion-landscape h-full w-full object-cover" />
          <div className="completion-veil absolute inset-0" />
          {!reducedMotion && Array.from({ length: 18 }, (_, i) => {
            const Particle = i % 3 === 0 ? Flower2 : i % 3 === 1 ? Leaf : Sparkles;
            return <motion.div key={i}
              className={`completion-particle absolute ${i % 3 === 0 ? 'text-adventure-flower' : i % 3 === 1 ? 'text-primary' : 'text-warning'}`}
              initial={{ x: `${(i * 41) % 100}vw`, y: '-8vh', opacity: 0, rotate: 0 }}
              animate={{ y: '108vh', opacity: [0, 0.85, 0.85, 0], rotate: i % 2 ? 180 : -150 }}
              transition={{ duration: 3.4 + (i % 4) * 0.4, delay: (i % 6) * 0.16, ease: 'easeOut' }}
            ><Particle className="h-5 w-5 sm:h-7 sm:w-7" /></motion.div>;
          })}
        </div>

        <Button ref={closeButton} variant="outline" size="icon" onClick={dismiss}
          aria-label={pt ? 'Fechar celebração' : 'Close celebration'} title={pt ? 'Fechar celebração' : 'Close celebration'}
          className="absolute right-4 top-4 z-10 h-10 w-10"><X /></Button>

        <div className="completion-content mx-auto flex min-h-svh w-full max-w-lg flex-col items-center px-6 text-center">
          <p className="flex items-center gap-2 text-xs font-extrabold text-primary">
            <Leaf className="h-4 w-4" />{pt ? 'Aventura Regenerativa' : 'Regenerative Adventure'}
          </p>

          <motion.div className="completion-mascot relative mt-3 flex shrink-0 items-center justify-center"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.8, y: 20 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: [20, -14, 0, -6, 0], rotate: [0, -3, 3, -1, 0] }}
            transition={{ duration: reducedMotion ? 0 : 1.3, ease: 'easeOut' }}>
            <Capyvera pose={active.kind === 'journey' ? 'trophy' : 'celebrate'} size="xl" loading="eager" alt="Capyvera" />
            <motion.span className="completion-medal absolute bottom-0 right-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-card bg-warning text-warning-foreground"
              initial={reducedMotion ? false : { scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.65, type: 'spring', damping: 14 }}>
              {active.kind === 'journey' ? <Trophy className="h-6 w-6" /> : <Check className="h-6 w-6" />}
            </motion.span>
          </motion.div>

          <motion.div className="mt-4 w-full" initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : 0.2 }}>
            <h2 id="celebration-title" className="completion-title text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
            {active.title && <p className="mt-2 break-words text-sm font-bold text-foreground">{active.title}</p>}
            <p id="celebration-description" className="mt-2 text-sm text-muted-foreground">
              {pt ? 'Cada ação faz a vida florescer.' : 'Every action helps life flourish.'}
            </p>
          </motion.div>

          <motion.div className="mt-5 flex w-full flex-wrap justify-center gap-3"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.5 }}>
            {active.kind === 'journey' ? <>
              <div className="completion-stat rounded-lg border border-warning/40 bg-card/90 px-5 py-3">
                <span className="block text-2xl font-black text-primary">+{EXP_RULES.journeyCompleted}</span>
                <span className="text-xs font-bold text-muted-foreground">{pt ? 'EXP base' : 'Base EXP'}</span>
              </div>
              <div className="completion-stat rounded-lg border border-info/40 bg-card/90 px-5 py-3">
                <span className="block text-2xl font-black text-info">{active.multiplier ? `x${active.multiplier.toFixed(1)}` : 'EXP'}</span>
                <span className="text-xs font-bold text-muted-foreground">{pt ? 'Multiplicador' : 'Multiplier'}</span>
              </div>
              {active.steps !== undefined && <p className="w-full text-xs font-bold text-primary"><Check className="mr-1 inline h-4 w-4" />{active.steps}/{active.steps} {pt ? 'etapas concluídas' : 'steps completed'}</p>}
            </> : <p className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="h-5 w-5" />{pt ? 'Impacto registrado. A aventura continua!' : 'Impact recorded. The adventure continues!'}</p>}
          </motion.div>

          {active.kind === 'journey' && Boolean(active.rewards?.length) && <section className="mt-4 w-full border-y border-border py-3 text-left">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Gift className="h-4 w-4 text-primary" />{pt ? 'Recompensas da jornada' : 'Journey rewards'}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {active.rewards?.map((reward, index) => <li key={index} className="break-words">
                <p className="font-bold">{reward.title}</p>
                {reward.description && <p className="whitespace-pre-wrap text-muted-foreground">{reward.description}</p>}
              </li>)}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{active.rewardDelivered
              ? (pt ? 'Entrega confirmada por quem criou a jornada.' : 'Delivery confirmed by the journey creator.')
              : (pt ? 'Combine a entrega com quem criou a jornada.' : 'Arrange delivery with the journey creator.')}</p>
          </section>}

          <div className="mt-6 w-full max-w-xs pb-2">
            <Button ref={continueButton} onClick={dismiss} size="lg" className="w-full tracking-normal">
              {pt ? 'Continuar aventura' : 'Continue adventure'}<ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-4 text-xs font-bold text-muted-foreground">{pt ? 'A vida é uma aventura!' : 'Life is an adventure!'}</p>
          </div>
        </div>
      </motion.section>
    )}
  </AnimatePresence>, document.body);
}