import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Capyvera } from './Capyvera';
import { useLanguage } from '@/contexts/LanguageContext';


export const TASK_COMPLETED_EVENT = 'taskmates:task-completed';

const DURATION_MS = 3200;

/**
 * Global overlay that pops the celebrating Capyvera once per task completion.
 * Listens to a window CustomEvent dispatched from useTasks.completeTask.
 * Ignores re-entrant events while still visible, so it fires exactly once
 * per completion.
 */
export function TaskCelebrationOverlay() {
  const [visible, setVisible] = useState(false);
  const { language } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handler = () => {
      setVisible((current) => (current ? current : true));
    };
    window.addEventListener(TASK_COMPLETED_EVENT, handler);
    return () => window.removeEventListener(TASK_COMPLETED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const label =
    language === 'pt' ? 'Tarefa concluída!' : 'Task completed!';

  const confetti = Array.from({ length: 28 }, (_, i) => i);

  return (
    <AnimatePresence>
      {visible &&
        createPortal(
          <motion.div
            role="status"
            aria-live="polite"
            aria-label={label}
            onClick={() => setVisible(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-[2px] cursor-pointer"
          >
            {/* Confetti */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confetti.map((i) => {
                const left = (i * 37) % 100;
                const delay = (i % 7) * 100;
                const duration = 1100 + (i % 7) * 220;
                const hue = (i * 41) % 360;
                const size = 6 + (i % 4) * 3;
                const drift = -40 + (i * 13) % 80;
                return (
                  <span
                    key={i}
                    className="absolute block capy-confetti"
                    style={{
                      left: `${left}%`,
                      top: '-10%',
                      width: size,
                      height: size + 4,
                      background: `hsl(${hue} 85% 60%)`,
                      borderRadius: 2,
                      '--capy-confetti-duration': `${duration}ms`,
                      '--capy-confetti-delay': `${delay}ms`,
                      '--capy-confetti-drift': `${drift}px`,
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>

            {/* Celebration container */}
            <div className="relative flex flex-col items-center gap-5">
              {/* Backdrop plate + halo */}
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 180, damping: 12, delay: 0.05 }}
                className="relative flex items-center justify-center"
              >
                <div className="capyvera-celebration-halo" aria-hidden="true" />
                <div className="capyvera-celebration-plate" aria-hidden="true">
                  {/* Capyvera with realistic motion */}
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.9, scaleY: 0.75, y: 40, rotate: -10 }}
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : {
                            opacity: 1,
                            y: [40, -32, 0, -18, 0, -8, 0],
                            x: [0, -6, 6, -3, 3, 0, 0],
                            scaleY: [0.75, 1.18, 0.88, 1.08, 0.96, 1.02, 1],
                            scaleX: [0.9, 0.88, 1.1, 0.94, 1.04, 0.98, 1],
                            rotate: [-10, 6, -5, 4, -2, 1, 0],
                          }
                    }
                    transition={
                      shouldReduceMotion
                        ? { duration: 0.2 }
                        : {
                            duration: 2.6,
                            ease: 'easeInOut',
                            times: [0, 0.14, 0.28, 0.44, 0.6, 0.78, 1],
                          }
                    }
                  >
                    <Capyvera pose="celebrate" size="xl" loading="eager" />
                  </motion.div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="rounded-full bg-background/95 px-5 py-2 text-sm font-semibold text-foreground shadow-md"
              >
                {label}
              </motion.p>
            </div>
          </motion.div>,
          document.body,
        )}
    </AnimatePresence>
  );
}


/** Fire the celebration from anywhere (typically after a successful completion). */
export function dispatchTaskCompletedCelebration() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TASK_COMPLETED_EVENT));
}
