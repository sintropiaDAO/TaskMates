import { Inbox } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SectionEmptyStateProps {
  /** Optional custom message. Falls back to a generic inactivity message. */
  message?: string;
  className?: string;
}

/**
 * Standard "nothing here yet" placeholder used inside detail modal sections,
 * so no section ever renders visually empty.
 */
export function SectionEmptyState({ message, className = '' }: SectionEmptyStateProps) {
  const { language } = useLanguage();
  const fallback = language === 'pt'
    ? 'Nenhuma atividade por aqui ainda.'
    : 'No activity here yet.';

  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-6 text-center ${className}`}>
      <Inbox className="w-5 h-5 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground">{message || fallback}</p>
    </div>
  );
}
