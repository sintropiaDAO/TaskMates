import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capyvera } from './Capyvera';
import { useLanguage } from '@/contexts/LanguageContext';

export const TASK_COMPLETED_EVENT = 'taskmates:task-completed';

const DURATION_MS = 1800;

/**
 * Global overlay that pops the celebrating Capyvera once per task completion.
 * Listens to a window CustomEvent dispatched from useTasks.completeTask.
 * Ignores re-entrant events while still visible, so it fires exactly once
 * per completion.
 */
export function TaskCelebrationOverlay() {
  const [visible, setVisible] = useState(false);
  const { language } = useLanguage();

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

  const confetti = Array.from({ length: 18 }, (_, i) => i);

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-[2px] animate-fade-in"
      style={{ cursor: 'pointer' }}
    >
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((i) => {
          const left = (i * 53) % 100;
          const delay = (i % 6) * 80;
          const duration = 900 + (i % 5) * 180;
          const hue = (i * 47) % 360;
          return (
            <span
              key={i}
              className="absolute block"
              style={{
                left: `${left}%`,
                top: '-10%',
                width: 10,
                height: 14,
                background: `hsl(${hue} 85% 60%)`,
                borderRadius: 2,
                transform: 'translateY(0) rotate(0deg)',
                animation: `capy-confetti ${duration}ms cubic-bezier(.2,.6,.3,1) ${delay}ms forwards`,
              }}
            />
          );
        })}
      </div>

      <div
        className="relative flex flex-col items-center gap-3"
        style={{ animation: 'capy-pop 600ms cubic-bezier(.25,1.5,.5,1)' }}
      >
        <Capyvera pose="celebrate" size="xl" loading="eager" />
        <p className="rounded-full bg-background/95 px-4 py-1.5 text-sm font-semibold text-foreground shadow-md">
          {label}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** Fire the celebration from anywhere (typically after a successful completion). */
export function dispatchTaskCompletedCelebration() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TASK_COMPLETED_EVENT));
}
